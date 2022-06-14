import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { UserSession } from '../entities/user-session.entity';
import { v4 as uuid } from 'uuid';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { TokenBypassService } from '../token/token-bypass.service';
import { TokenService } from '../token/token.service';
import { TokenDTO } from 'src/dtos/token.dto';
import { parseToken } from '@us-epa-camd/easey-common/utilities';

@Injectable()
export class UserSessionService {
  constructor(
    @InjectRepository(UserSessionRepository)
    private repository: UserSessionRepository,

    @Inject(forwardRef(() => TokenBypassService))
    private tokenBypassService: TokenBypassService,

    @Inject(forwardRef(() => TokenService))
    private tokenService: TokenService,

    private logger: Logger,
  ) {}

  async createUserSession(userId: string, clientIp: string): Promise<TokenDTO> {
    await this.removeUserSessionByUserId(userId);

    const sessionId = uuid();

    this.logger.info('Creating user session', {
      userId: userId,
      sessionId: sessionId,
    });

    const session = new UserSession();
    session.userId = userId.toLowerCase();
    session.sessionId = sessionId;
    session.lastLoginDate = new Date().toUTCString();

    await this.repository.insert(session);

    if (this.tokenBypassService.isBypassSet()) {
      return this.tokenBypassService.generateBypassToken(
        userId,
        sessionId,
        clientIp,
      );
    }

    return this.tokenService.generateToken(userId, sessionId, clientIp);
  }

  async isValidSessionForToken(sessionId: string, token: string) {
    const sessionRecord = await this.repository.findOne({
      sessionId: sessionId,
      securityToken: token,
    });

    if (sessionRecord) {
      if (new Date() < new Date(sessionRecord.tokenExpiration)) {
        return sessionRecord;
      }

      this.logger.error(
        BadRequestException,
        'Session associated with token has expired',
        true,
        { sessionId: sessionId },
      );
    }

    this.logger.error(
      BadRequestException,
      'No existing session with that token',
      true,
      { sessionId: sessionId },
    );
  }

  async removeUserSessionByUserId(userId: string) {
    const existingSession = await this.repository.findOne({ userId: userId });
    if (existingSession) {
      await this.repository.remove(existingSession);
    }
  }

  async findSessionByUserIdAndToken(userId: string, token: string) {
    const session = await this.repository.findOne({
      userId: userId,
      securityToken: token,
    });

    if (session) {
      return session;
    }

    this.logger.error(
      BadRequestException,
      'No existing session for user with supplied token',
      true,
      { userId: userId },
    );
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
