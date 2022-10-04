import { firstValueFrom } from 'rxjs';
import { createClientAsync } from 'soap';

import { HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';

import { UserDTO } from '../dtos/user.dto';
import { FacilitiesDTO } from '../dtos/facilities.dto';
import { TokenService } from '../token/token.service';
import { UserSessionService } from '../user-session/user-session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: Logger,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly userSessionService: UserSessionService,
  ) {}

  async getStreamlinedRegistrationToken(userId: string): Promise<string> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/StreamlinedRegistrationService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.AuthenticateAsync({
          userId: this.configService.get<string>('app.naasAppId'),
          credential: this.configService.get<string>('app.nassAppPwd'),
        });
      })
      .then(res => {
        return res[0].securityToken;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new LoggingException(
            err.root.Envelope,
            HttpStatus.BAD_REQUEST,
            { userId: userId },
          );
        }

        throw new LoggingException(err.message, HttpStatus.BAD_REQUEST, {
          userId: userId,
        });
      });
  }

  async getUserEmail(userId: string, naasToken: string): Promise<string> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/StreamlinedRegistrationService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.RetrievePrimaryOrganizationAsync({
          securityToken: naasToken,
          user: { userId: userId },
        });
      })
      .then(res => {
        return res[0].result.email;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new LoggingException(
            err.root.Envelope,
            HttpStatus.BAD_REQUEST,
            { userId: userId },
          );
        }

        throw new LoggingException(err.message, HttpStatus.BAD_REQUEST, {
          userId: userId,
        });
      });
  }

  async getMockPermissions(userId: string): Promise<FacilitiesDTO[]> {
    const mockPermissionObject = await firstValueFrom(
      this.httpService.get(
        `${this.configService.get<string>(
          'app.contentUrl',
        )}/auth/mockPermissions.json`,
      ),
    );

    const userPermissions = mockPermissionObject['data'].filter(
      entry => entry.userid === userId,
    );

    const mockPermissions: FacilitiesDTO[] = [];

    if (
      userPermissions.length > 0 &&
      userPermissions[0].facilities.length > 0
    ) {
      for (let facility of userPermissions[0].facilities) {
        const dto = new FacilitiesDTO();
        dto.facilityId = facility.id;
        dto.name = facility.name;
        dto.orisCode = facility.oris;
        dto.roles = facility.roles;
        mockPermissions.push(dto);
      }
    }

    return mockPermissions;
  }

  async signIn(
    userId: string,
    password: string,
    clientIp: string,
  ): Promise<UserDTO> {
    let user: UserDTO;
    let permissions: FacilitiesDTO[];

    if (this.tokenService.bypassEnabled()) {
      const acceptedUsers = JSON.parse(
        this.configService.get<string>('cdxBypass.users'),
      );
      const currentPass = this.configService.get<string>('cdxBypass.pass');

      if (!acceptedUsers.find(x => x === userId)) {
        throw new LoggingException(
          'Incorrect Bypass userId',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (password === currentPass) {
        user = new UserDTO();
        user.userId = userId;
        user.firstName = userId;
        user.lastName = '';
      } else {
        throw new LoggingException(
          'Incorrect Bypass password',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      user = await this.loginCdx(userId, password);
      const streamlinedRegistrationToken = await this.getStreamlinedRegistrationToken(
        userId,
      );
      const email = await this.getUserEmail(
        userId,
        streamlinedRegistrationToken,
      );
      user.email = email;
    }

    const session = await this.userSessionService.createUserSession(userId);
    const token = await this.tokenService.generateToken(
      userId,
      session.sessionId,
      clientIp,
    );

    user.token = token.token;
    user.tokenExpiration = token.expiration;

    if (this.configService.get<boolean>('cdxBypass.mockPermissionsEnabled')) {
      permissions = await this.getMockPermissions(userId);
    }

    user.facilities = permissions;

    return user;
  }

  async loginCdx(userId: string, password: string): Promise<UserDTO> {
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
          throw new LoggingException(
            'Error authenticating user',
            HttpStatus.BAD_REQUEST,
            {
              userId: userId,
            },
          );
        }

        throw new LoggingException(err.message, HttpStatus.BAD_REQUEST, {
          userId: userId,
        });
      });
  }

  async signOut(userId: string, token: string): Promise<void> {
    await this.userSessionService.findSessionByUserIdAndToken(userId, token);
    await this.userSessionService.removeUserSessionByUserId(userId);
  }
}