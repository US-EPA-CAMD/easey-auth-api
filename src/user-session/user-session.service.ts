import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import { dateToEstString } from '@us-epa-camd/easey-common/utilities/functions';
import { EntityManager, ILike } from 'typeorm';
import { v4 as uuid } from 'uuid';

import { UserCheckOut } from '../entities/user-check-out.entity';
import { UserSession } from '../entities/user-session.entity';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { FacilityAccessDTO } from '../dtos/permissions.dto';
import { firstValueFrom } from 'rxjs';
import { getManager } from 'typeorm';
import { AccessTokenResponse } from '../dtos/oidc-auth-dtos';

@Injectable()
export class UserSessionService {
  constructor(
    private readonly entityManager: EntityManager,
    private readonly repository: UserSessionRepository,
    private readonly configService: ConfigService,
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

    const activeDate = dateToEstString();

    sessionRecord.lastActivity = activeDate;
    await this.repository.save(sessionRecord);

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
    const currentExpiration = new Date(sessionRecord.tokenExpiration);

    if (applyThreshold) {
      currentExpiration.setSeconds(
        currentExpiration.getSeconds() -
          this.configService.get<number>('app.refreshTokenThresholdSeconds'),
      );
    }

    if (new Date(dateToEstString()) < currentExpiration) {
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
    session.lastLoginDate = dateToEstString();
    session.lastActivity = dateToEstString();
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

  async findSessionByUserId(userId: string): Promise<UserSession> {
    const session = await this.repository.findOneBy({
      userId: ILike(userId),
    });

    if (session) {
      return session;
    }

    return null;
  }

  async findSessionBySessionId(sessionId: string): Promise<UserSession> {
    const session = await this.repository.findOneBy({
      sessionId: sessionId,
    });

    if (session) {
      return session;
    }

    return null;
  }

  async updateUserSessionToken(
    sessionId: string,
    accessTokenResponse: AccessTokenResponse,
    expiration: string,
  ) {
    await this.repository.update(
      { sessionId: sessionId },
      {
        tokenExpiration: expiration,
        idToken: accessTokenResponse.id_token,
        securityToken: accessTokenResponse.access_token,
        refreshToken: accessTokenResponse.refresh_token,
      },
    );
  }

  async insertNewUserSession(session: UserSession) {
    await this.repository.insert(session);
  }
}
