import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClientAsync } from 'soap';
import { sign, verify, decode as jwtDecode } from 'jsonwebtoken';

import { InjectRepository } from '@nestjs/typeorm';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { UserSessionMap } from '../maps/user-session.map';
import { SessionStatus } from './session-status.interface';
import { parseToken } from '@us-epa-camd/easey-common/utilities';
import { UserSession } from '../entities/user-session.entity';
import { v4 as uuid } from 'uuid';
import { UserSessionDTO } from '../dtos/user-session.dto';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { encode, decode } from 'js-base64';
import { ValidateClientIdParamsDTO } from '../dtos/validate-client-id.dto';
import { ApiRepository } from './api.repository';
import { ValidateClientTokenParamsDTO } from '../dtos/validate-client-token.dto';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(UserSessionRepository)
    private repository: UserSessionRepository,

    @InjectRepository(ApiRepository)
    private apiRepository: ApiRepository,

    private map: UserSessionMap,
    private configService: ConfigService,
    private logger: Logger,
  ) {}

  isBypassSet() {
    if (
      this.configService.get<string>('app.env') !== 'production' &&
      this.configService.get<string>('cdxBypass.enabled')
    ) {
      return true;
    }
    return false;
  }

  async validateClientToken(
    validateClientTokenParams: ValidateClientTokenParamsDTO,
  ): Promise<boolean> {
    //Ensure fields have been set
    if (
      !validateClientTokenParams.clientId ||
      !validateClientTokenParams.clientToken
    ) {
      this.logger.error(
        BadRequestException,
        'Must provide an app name and client token',
        true,
      );
    }

    try {
      const dbRecord = await this.apiRepository.findOne({
        clientId: validateClientTokenParams.clientId,
      });

      //Determine if a match exists
      if (!dbRecord) {
        this.logger.error(BadRequestException, 'Invalid ClientId', true);
      }

      //Attempt to verify the incoming token
      const decoded = verify(
        validateClientTokenParams.clientToken,
        dbRecord.encryptionKey,
      );

      if (decoded.passCode !== dbRecord.passCode) {
        this.logger.error(BadRequestException, 'Invalid Token', true);
      }

      return true;
    } catch (err) {
      this.logger.error(BadRequestException, err.message, true);
    }
  }

  async generateClientToken(
    validateClientIdParams: ValidateClientIdParamsDTO,
  ): Promise<string> {
    //Ensure fields have been set
    if (
      !validateClientIdParams.clientId ||
      !validateClientIdParams.clientSecret
    ) {
      this.logger.error(
        BadRequestException,
        'Must provide a clientId and clientSecret',
        true,
      );
    }

    // Lookup record by clientId, clientSecret
    const apiRecord = await this.apiRepository.findOne({
      clientId: validateClientIdParams.clientId,
      clientSecret: validateClientIdParams.clientSecret,
    });

    // If the record exists, encrypt the passcode associated with that app
    if (apiRecord) {
      return sign(
        {
          passCode: apiRecord.passCode,
        },
        apiRecord.encryptionKey,
        {
          expiresIn: '5m',
        },
      );
    } else {
      this.logger.error(
        BadRequestException,
        'Invalid clientId or clientSecret',
        true,
      );
    }
  }

  async getSessionStatus(userid: string): Promise<SessionStatus> {
    const status: SessionStatus = {
      exists: false,
      expired: true,
      session: null,
      sessionEntity: null,
    };

    const userSession = await this.repository.findOne(userid.toLowerCase());
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
    const sessionId = uuid();

    this.logger.info('Creating user session', {
      userId: userId,
      sessionId: sessionId,
    });

    const expiration = new Date(Date.now() + 20 * 60000).toUTCString(); //Expire in 20 minutes
    const current = new Date(Date.now()).toUTCString();

    const session = new UserSession();
    session.userId = userId.toLowerCase();
    session.sessionId = sessionId;
    session.tokenExpiration = expiration;
    session.lastLoginDate = current;
    await this.repository.save(session);

    return this.map.one(session);
  }

  async removeUserSession(session: UserSession): Promise<void> {
    await this.repository.remove(session);
  }

  async createToken(userId: string, clientIp: string): Promise<any> {
    const url = this.configService.get<string>('app.naasSvcs');

    const tokenExpiration = new Date(Date.now() + 20 * 60000).toUTCString();
    const userSession = await this.getSessionStatus(userId);
    if (!userSession.exists) {
      this.logger.error(
        BadRequestException,
        'No valid session exists for the current user',
        true,
        { userId: userId },
      );
    }

    const sessionDTO = userSession.session;
    sessionDTO.tokenExpiration = tokenExpiration;

    // Bypass logic
    if (this.isBypassSet()) {
      let fakeToken = `userId=${userId}&sessionId=${sessionDTO.sessionId}&expiration=${tokenExpiration}&clientIp=${clientIp}`;
      fakeToken = encode(fakeToken);

      sessionDTO.securityToken = fakeToken;
      this.repository.update(userId, sessionDTO);

      this.logger.info('Creating new security token', {
        token: sessionDTO.securityToken,
        userId: userId,
      });

      return fakeToken;
    }

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

        this.logger.info('Creating new security token', {
          token: sessionDTO.securityToken,
          userId: userId,
        });

        return res[0].return;
      })
      .catch(err => {
        this.logger.error(
          InternalServerErrorException,
          err.root.Envelope.Body.Fault.detail.faultdetails,
          true,
          { userId: userId },
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
        this.logger.error(
          InternalServerErrorException,
          err.root.Envelope.Body.Fault.detail.faultdetails,
          true,
          { token: token, clientIp: clientIp },
        );
      });
  }

  async getStringifiedToken(token: string, clientIp: string): Promise<any> {
    if (this.isBypassSet()) {
      return decode(token);
    } else {
      return this.unpackToken(token, clientIp);
    }
  }

  async validateToken(token: string, clientIp: string): Promise<any> {
    const stringifiedToken = await this.getStringifiedToken(token, clientIp);
    const parsed = parseToken(stringifiedToken);

    this.logger.info(stringifiedToken);
    this.logger.info(parsed);
    this.logger.info('Validating Token From: ' + parsed.userId);

    const sessionStatus = await this.getSessionStatus(parsed.userId);
    this.logger.info('Session exists: ' + sessionStatus.exists);
    this.logger.info('Session expired: ' + sessionStatus.expired);

    if (!sessionStatus.exists || sessionStatus.expired) {
      this.logger.error(
        BadRequestException,
        'No valid session exists for the user. Please log in to create a valid session.',
        true,
        { token: token, clientIp: clientIp },
      );
    }

    return stringifiedToken;
  }
}
