import { createClientAsync } from 'soap';
import { HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';

import { UserDTO } from '../dtos/user.dto';
import { TokenService } from '../token/token.service';
import { UserSessionService } from '../user-session/user-session.service';
import { SignService } from '../sign/Sign.service';

interface orgEmailAndId {
  email: string;
  userOrgId: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: Logger,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly userSessionService: UserSessionService,
    private readonly signService: SignService,
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

  async getUserEmail(userId: string): Promise<orgEmailAndId> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/StreamlinedRegistrationService?wsdl`;

    const streamlinedRegistrationToken = await this.getStreamlinedRegistrationToken(
      userId,
    );

    return createClientAsync(url)
      .then(client => {
        return client.RetrievePrimaryOrganizationAsync({
          securityToken: streamlinedRegistrationToken,
          user: { userId: userId },
        });
      })
      .then(res => {
        return {
          email: res[0].result.email,
          userOrgId: res[0].result.userOrganizationId,
        };
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

  async getUserRoles(userId, orgId): Promise<string[]> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterService?wsdl`;
    const registerToken = await this.signService.getRegisterServiceToken();

    return createClientAsync(url)
      .then(client => {
        return client.RetrieveRolesAsync({
          securityToken: registerToken,
          user: { userId: userId },
          org: { userOrganizationId: orgId },
        });
      })
      .then(res => {
        if (res[0].Role.length > 0) {
          return res[0].Role.map(r => r.type.description);
        }
        return [];
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new LoggingException(err.root.Envelope, HttpStatus.BAD_REQUEST);
        }

        throw new LoggingException(err.message, HttpStatus.BAD_REQUEST);
      });
  }

  async signIn(
    userId: string,
    password: string,
    clientIp: string,
  ): Promise<UserDTO> {
    let user: UserDTO;
    let org: orgEmailAndId;
    if (this.tokenService.bypassEnabled()) {
      //Handle bypass sign in if enabled
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
      // If no bypass is set, log in per usual
      user = await this.loginCdx(userId, password);
      org = await this.getUserEmail(userId);
      user.email = org.email;
    }

    const session = await this.userSessionService.createUserSession(userId); // Create the user session record
    const initialToken = await this.tokenService.generateToken(
      //The first token we generate needed for the cbs permissions api call
      userId,
      session.sessionId,
      clientIp,
      [],
      [],
    );

    user.roles = org ? await this.getUserRoles(userId, org.userOrgId) : null; // Are we bypassed or not? If so set the array of roles to be null

    // Only fetch user permissions if we have a role, or are bypassing the sign in
    if (
      user.roles === null ||
      user.roles.includes(this.configService.get<string>('app.sponsorRole')) ||
      user.roles.includes(this.configService.get<string>('app.preparerRole')) ||
      user.roles.includes(this.configService.get<string>('app.submitterRole'))
    ) {
      user.facilities = await this.userSessionService.getUserPermissions(
        userId,
        clientIp,
        initialToken.token,
      );
    } else {
      user.facilities = [];
    }

    const token = await this.tokenService.generateToken(
      userId,
      session.sessionId,
      clientIp,
      user.facilities,
      user.roles,
    );

    user.token = token.token;
    user.tokenExpiration = token.expiration;

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

  async updateLastActivity(token: string): Promise<void> {
    await this.userSessionService.refreshLastActivity(token);
  }

  async signOut(userId: string, token: string): Promise<void> {
    await this.userSessionService.findSessionByUserIdAndToken(userId, token);
    await this.userSessionService.removeUserSessionByUserId(userId);
  }
}
