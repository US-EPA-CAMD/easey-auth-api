import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { encode } from 'js-base64';
import { TokenDTO } from '../dtos/token.dto';
import { UserSessionService } from '../user-session/user-session.service';

@Injectable()
export class TokenBypassService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,

    @Inject(forwardRef(() => UserSessionService))
    private readonly userSessionService: UserSessionService,
  ) {}

  isBypassSet() {
    if (
      this.configService.get<string>('app.env') !== 'production' &&
      this.configService.get<string>('cdxBypass.enabled')
    ) {
      return true;
    }
    return false;
  }

  async generateBypassToken(
    userId: string,
    sessionId: string,
    clientIp: string,
  ) {
    const newExpiration = new Date(
      Date.now() +
        this.configService.get<number>('app.tokenExpirationDurationMinutes') *
          60000,
    ).toUTCString();

    const newToken = encode(
      `userId=${userId}&sessionId=${sessionId}&expiration=${newExpiration}&clientIp=${clientIp}`,
    );

    await this.userSessionService.updateUserSessionToken(
      sessionId,
      newToken,
      newExpiration,
    );

    const authToken = new TokenDTO();
    authToken.token = newToken;
    authToken.expiration = newExpiration;

    return authToken;
  }
}
