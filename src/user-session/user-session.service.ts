import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { withMasterConnection } from '@us-epa-camd/easey-common/connection';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import { DataSource, EntityManager, ILike } from 'typeorm';
import { v4 as uuid } from 'uuid';

import { UserCheckOut } from '../entities/user-check-out.entity';
import { UserSession } from '../entities/user-session.entity';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { FacilityAccessDTO } from '../dtos/permissions.dto';
import { firstValueFrom } from 'rxjs';
import { getManager } from 'typeorm';

export interface SessionTokenUpdate {
  securityToken: string;
  refreshToken: string;
  idToken: string;
  tokenExpiration: Date;
}

@Injectable()
export class UserSessionService {
  constructor(
    private readonly entityManager: EntityManager,
    private readonly repository: UserSessionRepository,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  returnManager() {
    return this.entityManager;
  }

  async refreshLastActivity(token: string): Promise<void> {
    const sessionRecord = await this.repository.findOne({
      where: { securityToken: token },
    });

    if (!sessionRecord) {
      throw new EaseyException(
        new Error('No session record exists for given token'),
        HttpStatus.BAD_REQUEST,
      );
    }

    const activeDate = new Date().toISOString();
    // Prevent a heartbeat read before rotation from updating afterward.
    const updateResult = await this.repository.update(
      {
        sessionId: sessionRecord.sessionId,
        securityToken: token,
        tokenVersion: sessionRecord.tokenVersion,
      },
      { lastActivity: activeDate },
    );

    if (updateResult.affected === 0) {
      // A concurrent refresh made this heartbeat stale; skip checkout activity too.
      return;
    }

    if (updateResult.affected !== 1) {
      throw new EaseyException(
        new Error('Unexpected result while updating session activity'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const checkOutRecord = await this.returnManager().findOne(UserCheckOut, {
      where: { checkedOutBy: ILike(sessionRecord.userId) },
    });

    if (checkOutRecord) {
      checkOutRecord.lastActivity = activeDate;
      await this.returnManager().save(checkOutRecord);
    }
  }

  isSessionTokenExpired(
    sessionRecord: UserSession,
    applyThreshold = true,
  ): boolean {
    const currentExpiration = new Date(sessionRecord.tokenExpiration.getTime());

    if (applyThreshold) {
      currentExpiration.setSeconds(
        currentExpiration.getSeconds() -
          this.configService.get<number>('app.refreshTokenThresholdSeconds'),
      );
    }

    if (new Date() < currentExpiration) {
      return false;
    }

    return true;
  }

  async createUserSession(
    userId: string,
    authCode: string,
    oidcPolicy: string,
    clientIp: string,
  ): Promise<UserSession> {
    const sessionId = uuid();
    await this.removeUserSessionByUserId(userId);

    const session = new UserSession();
    session.sessionId = sessionId;
    session.userId = userId.toUpperCase();
    session.oidcPolicy = oidcPolicy;
    session.securityToken = authCode;
    session.clientIp = clientIp;
    session.tokenVersion = 0;
    const nowUtc = new Date().toISOString();
    session.lastLoginDate = nowUtc;
    session.lastActivity = nowUtc;
    await this.repository.insert(session);
    return session;
  }

  async isValidSessionForToken(
    sessionId: string,
    token: string,
    applyThreshold = true,
  ): Promise<UserSession> {
    const sessionRecord = await this.repository.findOneBy({
      sessionId,
      securityToken: token,
    });

    if (sessionRecord) {
      if (this.isSessionTokenExpired(sessionRecord, applyThreshold) === false) {
        return sessionRecord;
      }

      throw new EaseyException(
        new Error('Session associated with token has expired'),
        HttpStatus.BAD_REQUEST,
        { sessionId: sessionId },
      );
    }

    throw new EaseyException(
      new Error('No existing session for the provided security token'),
      HttpStatus.BAD_REQUEST,
      { sessionId: sessionId },
    );
  }

  async removeUserSessionByUserId(userId: string) {
    const existingSession = await this.repository.findOneBy({ userId: ILike(userId) });
    if (existingSession) {
      await this.repository.remove(existingSession);
    }
  }

  async updateSession(session: UserSession) {
    await this.repository.save(session);
  }

  async findSessionByUserIdAndToken(
    userId: string,
    token: string,
  ): Promise<UserSession> {
    const session = await this.repository.findOneBy({
      userId: ILike(userId),
      securityToken: token,
    });

    if (session) {
      return session;
    }

    return null;
  }

  async findSessionByUserIdAndTokenOnMaster(
    userId: string,
    token: string,
  ): Promise<UserSession> {
    return withMasterConnection(this.dataSource, entityManager =>
      entityManager.findOneBy(UserSession, {
        userId: ILike(userId),
        securityToken: token,
      }),
    );
  }

  async findSessionByUserId(userId: string): Promise<UserSession> {
    const session = await this.repository.findOneBy({
      userId: ILike(userId),
    });

    if (session) {
      return session;
    }

    return null;
  }

  async findSessionBySessionId(sessionId: string, entityManager?: EntityManager): Promise<UserSession> {
    const repository = entityManager
      ? entityManager.getRepository(UserSession)
      : this.repository;
    const session = await repository.findOneBy({
      sessionId: sessionId,
    });

    if (session) {
      return session;
    }

    return null;
  }

  async replaceSessionTokens(
    session: UserSession,
    tokenUpdate: SessionTokenUpdate,
    entityManager?: EntityManager,
  ): Promise<boolean> {
    const repository = entityManager
      ? entityManager.getRepository(UserSession)
      : this.repository;
    // Only the refresh with the expected token version may rotate the session.
    const updateResult = await repository.update(
      {
        sessionId: session.sessionId,
        securityToken: session.securityToken,
        tokenVersion: session.tokenVersion,
      },
      {
        ...tokenUpdate,
        tokenVersion: () => 'token_version + 1',
      },
    );

    return updateResult.affected === 1;
  }

  async withRefreshLock<T>(
    sessionId: string,
    operation: (entityManager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return withMasterConnection(this.dataSource, entityManager =>
      entityManager.transaction(async transactionalEntityManager => {
        // This key serializes only this session's refreshes; it does not lock the row or table.
        // Commit, rollback, connection loss, or the five-minute idle transaction timeout releases it.
        await transactionalEntityManager.query(
          `SELECT pg_advisory_xact_lock(
            hashtext('camdecmpswks.user_session.refresh'),
            hashtext($1)
          )`,
          [sessionId],
        );

        return operation(transactionalEntityManager);
      }),
    );
  }

  async insertNewUserSession(session: UserSession) {
    await this.repository.insert(session);
  }

  // ADDED: Method to update client IP in existing session
  async updateClientIp(sessionId: string, newClientIp: string): Promise<void> {
    if (!sessionId || !newClientIp) {
      throw new Error('SessionId and newClientIp are required for IP update');
    }

    await this.repository.update(
      { sessionId: sessionId },
      { clientIp: newClientIp }
    );
  }
}
