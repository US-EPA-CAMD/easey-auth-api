import { createClientAsync } from 'soap';
import { encode, decode } from 'js-base64';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseToken } from '@us-epa-camd/easey-common/utilities';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';

import { UserSessionService } from '../user-session/user-session.service';
import { UserSession } from '../entities/user-session.entity';
import { TokenDTO } from '../dtos/token.dto';
import { PermissionsDTO } from 'src/dtos/permissions.dto';
import { dateToEstString } from '@us-epa-camd/easey-common/utilities/functions';

@Injectable()
export class TokenService {
  private bypass = false;
  bypassEnabled() {
    return this.bypass;
  }

  constructor(
    private configService: ConfigService,
    private readonly userSessionService: UserSessionService,
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

    const permissions = await this.userSessionService.getUserPermissions(
      userId,
    );

    return this.generateToken(userId, session.sessionId, clientIp, permissions);
  }

  async getTokenFromCDX(
    userId: string,
    sessionId: string,
    clientIp: string,
    expiration: string,
    permissions: PermissionsDTO,
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
          subjectData: `userId=${userId}&sessionId=${sessionId}&expiration=${expiration}&clientIp=${clientIp}&permissions=${JSON.stringify(
            permissions,
          )}`,
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
    permissions: PermissionsDTO,
  ): Promise<TokenDTO> {
    let token: string;
    const expiration = dateToEstString(
      Date.now() +
        this.configService.get<number>('app.tokenExpirationDurationMinutes') *
          60000,
    );

    console.log('Creating Client Token At IP: ' + clientIp);

    if (this.bypassEnabled()) {
      token = encode(
        `userId=${userId}&sessionId=${sessionId}&expiration=${expiration}&clientIp=${clientIp}&permissions=${JSON.stringify(
          permissions,
        )}`,
      );
    } else {
      token = await this.getTokenFromCDX(
        userId,
        sessionId,
        clientIp,
        expiration,
        permissions,
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
      return unencryptedToken;
    }

    return false;
  }
}
