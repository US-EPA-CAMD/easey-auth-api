import { createClientAsync } from 'soap';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@us-epa-camd/easey-common/logger';

import { UserDTO } from '../dtos/user.dto';
import { TokenService } from '../token/token.service';
import { UserSessionService } from '../user-session/user-session.service';
import { PermissionsService } from '../permissions/Permissions.service';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';

interface OrgEmailAndId {
  email: string;
  userOrgId: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly permissionService: PermissionsService,
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
          throw new EaseyException(
            new Error(JSON.stringify(err.root.Envelope)),
            HttpStatus.BAD_REQUEST,
            { userId: userId },
          );
        }

        throw new EaseyException(new Error(err), HttpStatus.BAD_REQUEST, {
          userId: userId,
        });
      });
  }

  async getUserEmail(userId: string): Promise<OrgEmailAndId> {
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
          throw new EaseyException(
            new Error(JSON.stringify(err.root.Envelope)),
            HttpStatus.BAD_REQUEST,
            { userId: userId },
          );
        }

        throw new EaseyException(err, HttpStatus.BAD_REQUEST, {
          userId: userId,
        });
      });
  }

  async signIn(
    userId: string,
    password: string,
    clientIp: string,
  ): Promise<UserDTO> {
    let user: UserDTO;
    let org: OrgEmailAndId;
    userId = userId.toLowerCase();

    if (this.tokenService.bypassEnabled()) {
      //Handle bypass sign in if enabled
      const acceptedUsers = JSON.parse(
        this.configService.get<string>('cdxBypass.users'),
      );
      const currentPass = this.configService.get<string>('cdxBypass.pass');

      if (!acceptedUsers.find(x => x === userId)) {
        throw new EaseyException(
          new Error('Incorrect Bypass userId'),
          HttpStatus.BAD_REQUEST,
        );
      }

      if (password === currentPass) {
        user = new UserDTO();
        user.userId = userId;
        user.firstName = userId;
        user.lastName = '';
        user.roles = [
          this.configService.get<string>('app.sponsorRole'),
          this.configService.get<string>('app.preparerRole'),
          this.configService.get<string>('app.submitterRole'),
          this.configService.get<string>('app.analystRole'),
          this.configService.get<string>('app.adminRole'),
        ];
      } else {
        throw new EaseyException(
          new Error('Incorrect Bypass password'),
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      // If no bypass is set, log in per usual
      user = await this.loginCdx(userId, password);
      org = await this.getUserEmail(userId);
      user.email = org.email;
    }

    // Determine if we have a valid session, if so return the current valid session and parse the user from it
    let session = await this.userSessionService.findSessionByUserId(userId);
    if (session) {
      await this.userSessionService.removeUserSessionByUserId(userId);
    }

    //Otherwise we need to remove the old if one exists session for the user and generate a new one
    session = await this.userSessionService.createUserSession(userId);
    user.roles = await this.permissionService.retrieveAllUserRoles(userId);
    const tokenToGenerateFacilitiesList = await this.tokenService.generateToken(
      //The first token we generate needed for the cbs permissions api call
      userId,
      session.sessionId,
      clientIp,
      [],
    );

    const facilities = await this.permissionService.retrieveAllUserFacilities(
      userId,
      user.roles,
      tokenToGenerateFacilitiesList.token,
      clientIp,
    );

    session.facilities = JSON.stringify(facilities);
    user.facilities = facilities;

    await this.userSessionService.updateSession(session);

    const token = await this.tokenService.generateToken(
      userId,
      session.sessionId,
      clientIp,
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
        this.logger.log('User successfully signed in', { userId: userId });
        const user = res[0].User;
        dto = new UserDTO();
        dto.userId = userId;
        dto.firstName = user.firstName;
        dto.lastName = user.lastName;
        return dto;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new EaseyException(
            new Error('Error authenticating user'),
            HttpStatus.BAD_REQUEST,
            {
              userId: userId,
            },
          );
        }

        throw new EaseyException(err, HttpStatus.BAD_REQUEST, {
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
