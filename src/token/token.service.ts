import { createClientAsync } from 'soap';
import { encode, decode } from 'js-base64';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseToken } from '@us-epa-camd/easey-common/utilities';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';

import { UserSessionService } from '../user-session/user-session.service';
import { UserSession } from '../entities/user-session.entity';
import { TokenDTO } from '../dtos/token.dto';
import { FacilityAccessDTO } from 'src/dtos/permissions.dto';
import { dateToEstString } from '@us-epa-camd/easey-common/utilities/functions';
import { PermissionsService } from '../permissions/Permissions.service';

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

    // If we have a valid session unencrypt it and generate a new token from the unencrypted data
    if (!this.userSessionService.isSessionTokenExpired(session)) {
      const unencrypted = await this.unencryptToken(token, clientIp);
      const parsed = parseToken(unencrypted);

      return this.generateToken(
        userId,
        session.sessionId,
        clientIp,
        parsed.facilities,
        parsed.roles,
      );
    }

    //Otherwise generate a fresh set of facilities and roles and return a new token
    const roles = await this.permissionService.retrieveAllUserRoles(userId);
    const tokenToGenerateFacilitiesList = await this.generateToken(
      //The first token we generate needed for the cbs permissions api call
      userId,
      session.sessionId,
      clientIp,
      [],
      [],
    );
    const facilities = await this.permissionService.retrieveAllUserFacilities(
      userId,
      roles,
      tokenToGenerateFacilitiesList.token,
      clientIp,
    );
    return this.generateToken(
      userId,
      session.sessionId,
      clientIp,
      facilities,
      roles,
    );
  }

  async getTokenFromCDX(
    userId: string,
    sessionId: string,
    clientIp: string,
    expiration: string,
    permissions: FacilityAccessDTO[],
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
          subjectData: `userId=${userId}&sessionId=${sessionId}&expiration=${expiration}&clientIp=${clientIp}&facilities=${JSON.stringify(
            permissions,
          )}&roles=${JSON.stringify(roles)}`,
          ip: clientIp,
        });
      })
      .then(async res => {
        return res[0].return;
      })
      .catch(err => {
        throw new LoggingException(
          err.root.Envelope.Body.Fault.detail.faultdetails,
          HttpStatus.INTERNAL_SERVER_ERROR,
          { userId: userId },
        );
      });
  }

  async generateToken(
    userId: string,
    sessionId: string,
    clientIp: string,
    permissions: FacilityAccessDTO[],
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
        `userId=${userId}&sessionId=${sessionId}&expiration=${expiration}&clientIp=${clientIp}&facilities=${JSON.stringify(
          permissions,
        )}&roles=${JSON.stringify(roles)}`,
      );
    } else {
      token = await this.getTokenFromCDX(
        userId,
        sessionId,
        clientIp,
        expiration,
        permissions,
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
        throw new LoggingException(
          err.root.Envelope.Body.Fault.detail.faultdetails,
          HttpStatus.INTERNAL_SERVER_ERROR,
          { token: token, clientIp: clientIp },
        );
      });
  }

  async validateClientIp(parsedToken: any, clientIp: string) {
    if (parsedToken.clientIp !== clientIp) {
      throw new LoggingException(
        'Request coming from invalid IP address',
        HttpStatus.BAD_REQUEST,
        { userId: parsedToken.userId, clientIp: clientIp },
      );
    }
  }

  async validateToken(token: string, clientIp: string): Promise<any> {
    const unencryptedToken = await this.unencryptToken(token, clientIp);
    const parsed = parseToken(unencryptedToken);

    await this.validateClientIp(parsed, clientIp);

    if (
      await this.userSessionService.isValidSessionForToken(
        parsed.sessionId,
        token,
      )
    ) {
      return parsed;
    }

    return false;
  }
}
