import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClientAsync } from 'soap';

import { InjectRepository } from '@nestjs/typeorm';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { UserSessionMap } from '../maps/user-session.map';
import { SessionStatus } from './session-status.interface';
import { parseToken } from '../utils';
import { UserSession } from '../entities/user-session.entity';
import { v4 as uuidv4 } from 'uuid';
import { UserSessionDTO } from '../dtos/user-session.dto';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(UserSessionRepository)
    private repository: UserSessionRepository,
    private map: UserSessionMap,
    private configService: ConfigService,
  ) {}

  async getSessionStatus(userid: string): Promise<SessionStatus> {
    const status: SessionStatus = {
      exists: false,
      expired: true,
      session: null,
      sessionEntity: null,
    };

    const userSession = await this.repository.findOne(userid);
    if (userSession !== undefined) {
      status.exists = true;
      status.sessionEntity = userSession;
      const sessionDTO = await this.map.one(userSession);
      status.session = sessionDTO;
      if (new Date(Date.now()) < new Date(sessionDTO.tokenExpiration)) {
        status.expired = false;
      }
    }

    return status;
  }

  async createUserSession(userId: string): Promise<UserSessionDTO> {
    const sessionId = uuidv4();

    const expiration = new Date(Date.now() + 20 * 60000).toUTCString(); //Expire in 20 minutes
    const current = new Date(Date.now()).toUTCString();

    const session = new UserSession();
    session.userId = userId;
    session.sessionId = sessionId;
    session.tokenExpiration = expiration;
    session.lastLoginDate = current;
    await this.repository.save(session);

    return await this.map.one(session);
  }

  async removeUserSession(session: UserSession) {
    this.repository.remove(session);
  }

  async createToken(userId: string, clientIp: string): Promise<any> {
    const url = this.configService.get<string>('app.naasSvcs');

    const tokenExpiration = new Date(Date.now() + 20 * 60000).toUTCString();
    const userSession = await this.getSessionStatus(userId);
    if (!userSession.exists || userSession.expired) {
      throw new BadRequestException('No valid user session!');
    }

    const sessionDTO = userSession.session;
    sessionDTO.tokenExpiration = tokenExpiration;

    return createClientAsync(url)
      .then(client => {
        return client.CreateSecurityTokenAsync({
          trustee: this.configService.get<string>('app.naasAppId'),
          credential: this.configService.get<string>('app.nassAppPwd'),
          domain: 'default',
          tokenType: 'csm',
          issuer: this.configService.get<string>('app.naasAppId'),
          authMethod: 'password',
          subject: userId,
          subjectData: `userId=${userId}&sessionId=${sessionDTO.sessionId}&expiration=${tokenExpiration}&clientIp=${clientIp}`,
          ip: clientIp,
        });
      })
      .then(res => {
        sessionDTO.securityToken = res[0].return;
        this.repository.update(userId, sessionDTO);

        return res[0].return;
      })
      .catch(err => {
        throw new InternalServerErrorException(
          err.root.Envelope.Body.Fault.detail.faultdetails,
          'Create security token failed!',
        );
      });
  }

  async unpackToken(token: string, clientIp: string): Promise<any> {
    const url = this.configService.get<string>('app.naasSvcs');

    return createClientAsync(url)
      .then(client => {
        return client.ValidateAsync({
          userId: this.configService.get<string>('app.naasAppId'),
          credential: this.configService.get<string>('app.nassAppPwd'),
          domain: 'default',
          securityToken: token,
          clientIp: clientIp,
          resourceURI: null,
        });
      })
      .then(async res => {
        return res[0].return;
      })
      .catch(err => {
        throw new InternalServerErrorException(
          err.root.Envelope.Body.Fault.detail.faultdetails,
          'Security token validation failed!',
        );
      });
  }

  async validateToken(token: string, clientIp: string): Promise<any> {
    const stringifiedToken = await this.unpackToken(token, clientIp);
    const parsed = parseToken(stringifiedToken);

    const sessionStatus = await this.getSessionStatus(parsed.userId);
    if (!sessionStatus.exists || sessionStatus.expired)
      throw new BadRequestException(
        'No valid session exists for the user. Please log in to create a valid session."',
      );

    return stringifiedToken;
  }
}
