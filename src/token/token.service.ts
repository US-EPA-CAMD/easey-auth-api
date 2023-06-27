import { createClientAsync } from 'soap';
import { encode, decode } from 'js-base64';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UserSessionService } from '../user-session/user-session.service';
import { UserSession } from '../entities/user-session.entity';
import { TokenDTO } from '../dtos/token.dto';
import { dateToEstString } from '@us-epa-camd/easey-common/utilities/functions';
import { PermissionsService } from '../permissions/Permissions.service';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';

@Injectable()
export class TokenService {
  private bypass = false;
  bypassEnabled() {
    return this.bypass;
  }

  constructor(
    private configService: ConfigService,
    private readonly userSessionService: UserSessionService,
    private readonly permissionService: PermissionsService,
  ) {
    this.bypass =
      this.configService.get<string>('app.env') !== 'production' &&
      this.configService.get<boolean>('cdxBypass.enabled');
  }

  async refreshToken(userId: string, token: string, clientIp: string) {
    const session: UserSession = await this.userSessionService.findSessionByUserIdAndToken(
      userId,
      token,
    );

    const roles = await this.permissionService.retrieveAllUserRoles(userId);

    return this.generateToken(userId, session.sessionId, clientIp, roles);
  }

  async getTokenFromCDX(
    userId: string,
    sessionId: string,
    clientIp: string,
    expiration: string,
    roles: string[],
  ): Promise<string> {
    return createClientAsync(this.configService.get<string>('app.naasSvcs'))
      .then(client => {
        return client.CreateSecurityTokenAsync({
          trustee: this.configService.get<string>('app.naasAppId'),
          credential: this.configService.get<string>('app.nassAppPwd'),
          domain: 'default',
          tokenType: 'csm',
          issuer: this.configService.get<string>('app.naasAppId'),
          authMethod: 'password',
          subject: userId,
          subjectData: `userId=${userId}&sessionId=${sessionId}&expiration=${expiration}&clientIp=${clientIp}&roles=${JSON.stringify(
            roles,
          )}`,
          ip: clientIp,
        });
      })
      .then(async res => {
        return res[0].return;
      })
      .catch(err => {
        throw new EaseyException(
          new Error(err.root.Envelope.Body.Fault.detail.faultdetails),
          HttpStatus.INTERNAL_SERVER_ERROR,
          { userId: userId },
        );
      });
  }

  async generateToken(
    userId: string,
    sessionId: string,
    clientIp: string,
    roles: string[],
  ): Promise<TokenDTO> {
    let token: string;
    const expiration = dateToEstString(
      Date.now() +
        this.configService.get<number>('app.tokenExpirationDurationMinutes') *
          60000,
    );

    if (this.bypassEnabled()) {
      token = encode(
        `userId=${userId}&sessionId=${sessionId}&expiration=${expiration}&clientIp=${clientIp}&roles=${JSON.stringify(
          roles,
        )}`,
      );
    } else {
      token = await this.getTokenFromCDX(
        userId,
        sessionId,
        clientIp,
        expiration,
        roles,
      );
    }

    await this.userSessionService.updateUserSessionToken(
      sessionId,
      token,
      expiration,
    );

    const authToken = new TokenDTO();
    authToken.token = token;
    authToken.expiration = expiration;

    return authToken;
  }

  async unencryptToken(token: string, clientIp: string): Promise<string> {
    const url = this.configService.get<string>('app.naasSvcs');

    if (this.bypassEnabled()) {
      return decode(token);
    }

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
        throw new EaseyException(
          new Error(err.root.Envelope.Body.Fault.detail.faultdetails),
          HttpStatus.INTERNAL_SERVER_ERROR,
          { token: token, clientIp: clientIp },
        );
      });
  }

  async validateClientIp(user: CurrentUser, clientIp: string) {
    if (user.clientIp !== clientIp) {
      throw new EaseyException(
        new Error('Request coming from invalid IP address'),
        HttpStatus.BAD_REQUEST,
        { userId: user.userId, clientIp: clientIp },
      );
    }
  }

  async validateToken(token: string, clientIp: string): Promise<any> {
    const user: CurrentUser = {
      userId: null,
      sessionId: null,
      expiration: null,
      clientIp: null,
      facilities: [],
      roles: [],
    };

    const unencryptedToken = await this.unencryptToken(token, clientIp);
    const arr = unencryptedToken.split('&');
    arr.forEach(element => {
      const keyValue = element.split('=');

      if (keyValue[0] === 'roles') {
        const roles = JSON.parse(keyValue[1]);
        user.roles = roles;
      } else {
        user[keyValue[0]] = keyValue[1];
      }
    });

    // Look up facilities based on userId and token
    const session = await this.userSessionService.findSessionByUserIdAndToken(
      user.userId,
      token,
    );

    user.facilities = JSON.parse(session.facilities);

    await this.validateClientIp(user, clientIp);

    if (
      await this.userSessionService.isValidSessionForToken(
        user.sessionId,
        token,
        false,
      )
    ) {
      return user;
    }

    return false;
  }
}
