import {
  BadRequestException,
  forwardRef,
  HttpStatus,
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
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';

@Injectable()
export class UserSessionService {
  constructor(
    @InjectRepository(UserSessionRepository)
    private readonly repository: UserSessionRepository,

    @Inject(forwardRef(() => TokenBypassService))
    private readonly tokenBypassService: TokenBypassService,

    @Inject(forwardRef(() => TokenService))
    private readonly tokenService: TokenService,

    private readonly logger: Logger,
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

      throw new LoggingException(
        'Session associated with token has expired',
        HttpStatus.BAD_REQUEST,
        { sessionId: sessionId },
      );
    }

    throw new LoggingException(
      'No existing session with that token',
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

  async findSessionByUserIdAndToken(userId: string, token: string) {
    const session = await this.repository.findOne({
      userId: userId,
      securityToken: token,
    });

    if (session) {
      return session;
    }

    throw new LoggingException(
      'No existing session with that token',
      HttpStatus.BAD_REQUEST,
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
