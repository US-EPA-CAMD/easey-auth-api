import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@us-epa-camd/easey-common/enums';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { dateToEstString } from '@us-epa-camd/easey-common/utilities/functions';

import { decode, encode } from 'js-base64';
import { TokenDTO } from '../dtos/token.dto';
import { UserDTO } from '../dtos/user.dto';

@Injectable()
export class BypassService {
  private bypass = false;

  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {
    this.bypass =
      this.configService.get<string>('app.env') !== 'production' &&
      this.configService.get<boolean>('cdxBypass.enabled');
  }

  bypassEnabled() {
    return this.bypass;
  }

  getBypassUser(userId: string) {
    //Handle bypass sign in if enabled
    const acceptedUsers = JSON.parse(
      this.configService.get<string>('cdxBypass.users'),
    );

    if (!acceptedUsers.find(x => x === userId)) {
      throw new EaseyException(
        new Error('Incorrect Bypass userId'),
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = new UserDTO();
    user.userId = userId;
    user.firstName = userId;
    user.email = this.configService.get<string>('cdxBypass.userEmail');
    user.lastName = '';
    user.roles = [
      UserRole.SPONSOR,
      UserRole.PREPARER,
      UserRole.SUBMITTER,
      UserRole.ANALYST,
      UserRole.ADMIN,
      UserRole.INITIAL_AUTHORIZER,
    ];

    return user;
  }

  async generateToken(
    userId: string,
    sessionId: string,
    clientIp: string,
    roles: string[],
  ): Promise<TokenDTO> {
    const expiration = dateToEstString(
      Date.now() +
        this.configService.get<number>('app.tokenExpirationDurationMinutes') *
          60000,
    );

    const token = encode(
      `userId=${userId}&sessionId=${sessionId}&expiration=${expiration}&clientIp=${clientIp}&roles=${JSON.stringify(
        roles,
      )}`,
    );

    const authToken = new TokenDTO();
    authToken.token = token;
    authToken.expiration = expiration;

    return authToken;
  }

  async extractUserFromValidatedBypassToken(
    token: string,
  ): Promise<CurrentUser> {
    const user: CurrentUser = {
      userId: null,
      sessionId: null,
      expiration: null,
      clientIp: null,
      facilities: [],
      roles: [],
    };

    const unencryptedToken = decode(token);
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

    return user;
  }
}
