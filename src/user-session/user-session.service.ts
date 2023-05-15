import { v4 as uuid } from 'uuid';
import { HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';

import { UserSession } from '../entities/user-session.entity';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { ConfigService } from '@nestjs/config';
import { FacilityAccessDTO } from '../dtos/permissions.dto';
import { firstValueFrom } from 'rxjs';
import { getManager } from 'typeorm';
import { UserCheckOut } from '../entities/user-check-out.entity';
import { dateToEstString } from '@us-epa-camd/easey-common/utilities/functions';

@Injectable()
export class UserSessionService {
  constructor(
    @InjectRepository(UserSessionRepository)
    private readonly repository: UserSessionRepository,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  returnManager(): any {
    return getManager();
  }

  async refreshLastActivity(token: string): Promise<void> {
    const sessionRecord = await this.repository.findOne({
      where: { securityToken: token },
    });

    if (!sessionRecord) {
      throw new LoggingException(
        'No session record exists for given token',
        HttpStatus.BAD_REQUEST,
      );
    }

    const activeDate = dateToEstString();

    sessionRecord.lastActivity = activeDate;
    await this.repository.save(sessionRecord);

    const checkOutRecord = await this.returnManager().findOne(UserCheckOut, {
      where: { checkedOutBy: sessionRecord.userId },
    });

    if (checkOutRecord) {
      checkOutRecord.lastActivity = activeDate;
      await this.returnManager().save(checkOutRecord);
    }
  }

  isSessionTokenExpired(
    sessionRecord: UserSession,
    applyThreshold: boolean = true,
  ): boolean {
    const currentExpiration = new Date(sessionRecord.tokenExpiration);

    if (applyThreshold) {
      currentExpiration.setSeconds(
        currentExpiration.getSeconds() - this.configService.get<number>('app.refreshTokenThresholdSeconds'),
      );
    }

    if (new Date(dateToEstString()) < currentExpiration) {
      return false;
    }

    return true;
  }

  async createUserSession(userId: string): Promise<UserSession> {
    const sessionId = uuid();
    await this.removeUserSessionByUserId(userId);

    const session = new UserSession();
    session.sessionId = sessionId;
    session.userId = userId.toLowerCase();
    session.lastLoginDate = dateToEstString();
    session.lastActivity = dateToEstString();
    await this.repository.insert(session);
    return session;
  }

  async isValidSessionForToken(
    sessionId: string,
    token: string,
    applyThreshold: boolean = true
  ): Promise<UserSession> {
    const sessionRecord = await this.repository.findOne({
      sessionId: sessionId,
      securityToken: token,
    });

    if (sessionRecord) {
      if (this.isSessionTokenExpired(sessionRecord, applyThreshold) === false) {
        return sessionRecord;
      }

      throw new LoggingException(
        'Session associated with token has expired',
        HttpStatus.BAD_REQUEST,
        { sessionId: sessionId },
      );
    }

    throw new LoggingException(
      'No existing session for the provided security token',
      HttpStatus.BAD_REQUEST,
      { sessionId: sessionId },
    );
  }

  async removeUserSessionByUserId(userId: string) {
    const existingSession = await this.repository.findOne({ userId: userId });
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
    const session = await this.repository.findOne({
      userId: userId,
      securityToken: token,
    });

    if (session) {
      return session;
    }

    throw new LoggingException(
      'Existing session for the provided token does not exist.',
      HttpStatus.BAD_REQUEST,
      { userId: userId },
    );
  }

  async findSessionByUserId(userId: string): Promise<UserSession> {
    const session = await this.repository.findOne({
      userId: userId,
    });

    if (session) {
      return session;
    }

    return null;
  }

  async updateUserSessionToken(
    sessionId: string,
    token: string,
    expiration: string,
  ) {
    await this.repository.update(
      { sessionId: sessionId },
      { tokenExpiration: expiration, securityToken: token },
    );
  }

  async insertNewUserSession(session: UserSession) {
    await this.repository.insert(session);
  }
}
