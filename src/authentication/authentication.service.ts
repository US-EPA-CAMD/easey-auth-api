import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClientAsync } from 'soap';

import { UserDTO } from './../dtos/user.dto';
import { TokenService } from '../token/token.service';
import { parseToken } from '@us-epa-camd/easey-common/utilities';

import { Logger } from '@us-epa-camd/easey-common/logger';

@Injectable()
export class AuthenticationService {
  constructor(
    private configService: ConfigService,
    private tokenService: TokenService,
    private logger: Logger,
  ) {}

  bypassUser(userId: string, password: string) {
    if (this.tokenService.isBypassSet()) {
      const acceptedUsers = JSON.parse(
        this.configService.get<string>('cdxBypass.users'),
      );

      if (!acceptedUsers.find(x => x === userId)) {
        this.logger.error(
          InternalServerErrorException,
          "Incorrect Bypass userId",
          true
        );
      }

      const currentPass = this.configService.get<string>('cdxBypass.pass');

      if (password === currentPass) {
        this.logger.info('Logging in user in bypass mode', { userId: userId });
        return true;
      } else {
        this.logger.error(
          InternalServerErrorException,
          'Incorrect bypass password',
          true
        );
      }
    }

    return false;
  }
  
  async getStreamlinedRegistrationToken(userId: string){
    
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/StreamlinedRegistrationService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.AuthenticateAsync({
          userId: this.configService.get<string>(
            'app.naasAppId',
          ),
          credential: this.configService.get<string>(
            'app.nassAppPwd',
          ),
        });
      })
      .then(res => {
        return res[0].securityToken;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          this.logger.error(
            InternalServerErrorException,
            err.root.Envelope,
            true,
            { userId: userId },
          );
        }

        this.logger.error(InternalServerErrorException, err.message, true ,{
          userId: userId,
        });
        return null;
      });
  }

  async getUserEmail(userId: string, naasToken: string){
    
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/StreamlinedRegistrationService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.RetrievePrimaryOrganizationAsync({
          securityToken: naasToken,
          user: {userId: userId}
        });
      })
      .then(res => {
        return res[0].result.email;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          this.logger.error(
            InternalServerErrorException,
            err.root.Envelope,
            true,
            { userId: userId },
          );
        }

        this.logger.error(InternalServerErrorException, err.message, true,{
          userId: userId,
        });
        return null;
      });
  }

  async signIn(
    userId: string,
    password: string,
    clientIp: string,
  ): Promise<UserDTO> {
    let user: UserDTO;

    // Dummy user returned if the system is set to flagging users
    if (this.bypassUser(userId, password)) {
      user = new UserDTO();
      user.userId = userId;
      user.firstName = userId;
      user.lastName = '';
    } else {
      user = await this.login(userId, password);
      const streamlinedRegistrationToken = await this.getStreamlinedRegistrationToken(userId);
      const email = await this.getUserEmail(userId, streamlinedRegistrationToken);
      user.email = email;
    }

    const sessionStatus = await this.tokenService.getSessionStatus(userId);
    if (sessionStatus.exists && sessionStatus.expired)
      await this.tokenService.removeUserSession(sessionStatus.sessionEntity);

    if (sessionStatus.exists && !sessionStatus.expired) {
      this.logger.error(BadRequestException, "Valid session already exists", true, {userId: userId});
    }

    const session = await this.tokenService.createUserSession(userId);
    user.token = await this.tokenService.createToken(userId, clientIp);
    user.tokenExpiration = session.tokenExpiration;

    return user;
  }

  async login(userId: string, password: string): Promise<UserDTO> {
    let dto: UserDTO;
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterAuthService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.AuthenticateAsync({
          userId,
          password,
        });
      })
      .then(res => {
        this.logger.info('User successfully signed in', { userId: userId });
        const user = res[0].User;
        dto = new UserDTO();
        dto.userId = userId;
        dto.firstName = user.firstName;
        dto.lastName = user.lastName;
        return dto;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          this.logger.error(
            InternalServerErrorException,
            err.root.Envelope.Body.Fault.detail.RegisterAuthFault.description, true,
            { userId: userId },
          );
        }

        this.logger.error(InternalServerErrorException, err.message, true,{
          userId: userId,
        });
        return null;
      });
  }

  async signOut(token: string, clientIp: string): Promise<void> {
    const stringifiedToken = await this.tokenService.getStringifiedToken(
      token,
      clientIp,
    );
    const parsed = parseToken(stringifiedToken);

    if (parsed.clientIp !== clientIp) {
      this.logger.error(
        BadRequestException,
        'Sign out request coming from invalid IP address', true,
        { userId: parsed.userId, clientIp: clientIp },
      );
    }

    const sessionStatus = await this.tokenService.getSessionStatus(
      parsed.userId,
    );
    if (sessionStatus.exists) {
      await this.tokenService.removeUserSession(sessionStatus.sessionEntity);
      this.logger.info('User successfully signed out', {
        userId: parsed.userId,
      });
    } else {
      this.logger.error(
        BadRequestException,
        'No valid session exists for the current user', true,
        { userId: parsed.userId },
      );
    }
  }
}
