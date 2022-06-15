import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClientAsync } from 'soap';

import { parseToken } from '@us-epa-camd/easey-common/utilities';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { decode } from 'js-base64';
import { UserSessionService } from 'src/user-session/user-session.service';
import { TokenDTO } from 'src/dtos/token.dto';
import { TokenBypassService } from './token-bypass.service';
import { UserSession } from 'src/entities/user-session.entity';

@Injectable()
export class TokenService {
  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => UserSessionService))
    private readonly userSessionServie: UserSessionService,
    private readonly tokenBypassService: TokenBypassService,
    private readonly logger: Logger,
  ) {}

  async refreshToken(userId: string, token: string, clientIp: string) {
    const session: UserSession = await this.userSessionServie.findSessionByUserIdAndToken(
      userId,
      token,
    );

    if (this.tokenBypassService.isBypassSet()) {
      return this.tokenBypassService.generateBypassToken(
        userId,
        session.sessionId,
        clientIp,
      );
    }

    return this.generateToken(userId, session.sessionId, clientIp);
  }

  async generateToken(
    userId: string,
    sessionId: string,
    clientIp: string,
  ): Promise<any> {
    const newExpiration = new Date(
      Date.now() +
        this.configService.get<number>('app.tokenExpirationDurationMinutes') *
          60000,
    ).toUTCString();

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
          subjectData: `userId=${userId}&sessionId=${sessionId}&expiration=${newExpiration}&clientIp=${clientIp}`,
          ip: clientIp,
        });
      })
      .then(async res => {
        await this.userSessionServie.updateUserSessionToken(
          sessionId,
          res[0].return,
          newExpiration,
        );

        const authToken = new TokenDTO();
        authToken.token = res[0].return;
        authToken.expiration = newExpiration;

        return authToken;
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

  async unencryptToken(token: string, clientIp: string): Promise<any> {
    if (this.tokenBypassService.isBypassSet()) {
      return decode(token);
    }

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

  async validateClientIp(parsedToken: any, clientIp: string) {
    if (parsedToken.clientIp !== clientIp) {
      this.logger.error(
        BadRequestException,
        'Request coming from invalid IP address',
        true,
        { userId: parsedToken.userId, clientIp: clientIp },
      );
    }
  }

  async validateToken(token: string, clientIp: string): Promise<any> {
    const unencryptedToken = await this.unencryptToken(token, clientIp);
    const parsed = parseToken(unencryptedToken);

    await this.validateClientIp(parsed, clientIp);

    if (
      await this.userSessionServie.isValidSessionForToken(
        parsed.sessionId,
        token,
      )
    ) {
      return unencryptedToken;
    }

    return false;
  }
}
