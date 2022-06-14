import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClientAsync } from 'soap';
import { HttpService } from '@nestjs/axios';
import { UserDTO } from './../dtos/user.dto';
import { TokenService } from '../token/token.service';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { firstValueFrom } from 'rxjs';
import { FacilitiesDTO } from '../dtos/facilities.dto';
import { AuthenticationBypassService } from './authentication-bypass.service';
import { TokenBypassService } from '../token/token-bypass.service';
import { UserSessionService } from 'src/user-session/user-session.service';
import { parseToken } from '@us-epa-camd/easey-common/utilities';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly configService: ConfigService,
    private readonly bypassService: AuthenticationBypassService,
    private readonly tokenBypassService: TokenBypassService,
    private readonly tokenService: TokenService,
    private readonly userSessionService: UserSessionService,
    private readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {}

  async getStreamlinedRegistrationToken(userId: string) {
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
          this.logger.error(
            InternalServerErrorException,
            err.root.Envelope,
            true,
            { userId: userId },
          );
        }

        this.logger.error(InternalServerErrorException, err.message, true, {
          userId: userId,
        });
        return null;
      });
  }

  async getUserEmail(userId: string, naasToken: string) {
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
          this.logger.error(
            InternalServerErrorException,
            err.root.Envelope,
            true,
            { userId: userId },
          );
        }

        this.logger.error(InternalServerErrorException, err.message, true, {
          userId: userId,
        });
        return null;
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

  async signIn(userId: string, password: string, clientIp: string) {
    if (this.tokenBypassService.isBypassSet()) {
      return this.bypassService.bypassSignIn(userId, password, clientIp);
    }

    const user = await this.loginCdx(userId, password);
    const tokenDTO = await this.userSessionService.createUserSession(
      userId,
      clientIp,
    );

    user.token = tokenDTO.token;
    user.tokenExpiration = tokenDTO.expiration;

    const streamlinedRegistrationToken = await this.getStreamlinedRegistrationToken(
      userId,
    );
    const email = await this.getUserEmail(userId, streamlinedRegistrationToken);
    user.email = email;

    let permissions;
    if (this.configService.get<boolean>('cdxBypass.mockPermissionsEnabled'))
      permissions = await this.getMockPermissions(userId);
    else permissions = [];

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
          this.logger.error(
            InternalServerErrorException,
            err.root.Envelope.Body.Fault.detail.RegisterAuthFault.description,
            true,
            { userId: userId },
          );
        }

        this.logger.error(InternalServerErrorException, err.message, true, {
          userId: userId,
        });
        return null;
      });
  }

  async signOut(
    userId: string,
    token: string,
    clientIp: string,
  ): Promise<void> {
    const unencryptedToken = await this.tokenService.unencryptToken(
      token,
      clientIp,
    );
    const parsed = parseToken(unencryptedToken);

    await this.tokenService.validateClientIp(parsed, clientIp);
    await this.userSessionService.findSessionByUserIdAndToken(userId, token);
    await this.userSessionService.removeUserSessionByUserId(userId);
  }
}
