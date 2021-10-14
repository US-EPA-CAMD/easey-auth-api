import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClientAsync } from 'soap';

import { UserDTO } from './../dtos/user.dto';
import { TokenService } from '../token/token.service';
import { parseToken } from '../utils';

import { Logger } from '../Logger/Logger.service';
import { decode } from 'js-base64';

@Injectable()
export class AuthenticationService {
  constructor(
    private configService: ConfigService,
    private tokenService: TokenService,
    private logger: Logger,
  ) {}

  bypassUser(userId: string, password: string) {
    if (
      this.configService.get<string>('app.env') === 'development' &&
      this.configService.get<string>('bypass.bypassed')
    ) {
      const acceptedUsers = JSON.parse(
        this.configService.get<string>('bypass.users'),
      );

      if (!acceptedUsers.find(x => x === userId)) {
        this.logger.error(
          InternalServerErrorException,
          'Incorrect bypass userId',
        );
      }

      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleString('default', {
        month: 'long',
      });
      const currentYear = currentDate.getFullYear();
      const currentPass =
        currentMonth +
        currentYear +
        this.configService.get<string>('bypass.pass');

      if (password === currentPass) {
        return true;
      } else {
        this.logger.error(
          InternalServerErrorException,
          'Incorrect bypass password',
        );
      }
    }

    return false;
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
    }

    const sessionStatus = await this.tokenService.getSessionStatus(userId);
    if (sessionStatus.exists && sessionStatus.expired)
      await this.tokenService.removeUserSession(sessionStatus.sessionEntity);

    if (sessionStatus.exists && !sessionStatus.expired) {
      const sessionDTO = sessionStatus.session;

      user.token = sessionDTO.securityToken;
      user.tokenExpiration = sessionDTO.tokenExpiration;

      return user;
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
            err.root.Envelope.Body.Fault.detail.RegisterAuthFault.description,
            { userId: userId },
          );
        }

        this.logger.error(InternalServerErrorException, err.message, {
          userId: userId,
        });
        return null;
      });
  }

  async signOut(token: string, clientIp: string): Promise<void> {
    let stringifiedToken;
    let parsed;
    if (
      this.configService.get<string>('app.env') === 'development' &&
      this.configService.get<string>('bypass.bypassed')
    ) {
      stringifiedToken = decode(token);
    } else {
      stringifiedToken = await this.tokenService.unpackToken(token, clientIp);
    }

    parsed = parseToken(stringifiedToken);

    if (parsed.clientIp !== clientIp) {
      this.logger.error(
        BadRequestException,
        'Sign out request coming from invalid IP address',
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
        'No valid session exists for the current user',
        { userId: parsed.userId },
      );
    }
  }
}
