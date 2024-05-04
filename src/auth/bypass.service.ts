import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@us-epa-camd/easey-common/logger';

import { UserDTO } from '../dtos/user.dto';
import { TokenService } from '../token/token.service';
import { UserSessionService } from '../user-session/user-session.service';
import { PermissionsService } from '../permissions/Permissions.service';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';

@Injectable()
export class BypassService {

  private bypass = false;

  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly permissionsService: PermissionsService,
    private readonly userSessionService: UserSessionService,
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
    user.lastName = '';
    user.roles = [
      this.configService.get<string>('app.sponsorRole'),
      this.configService.get<string>('app.preparerRole'),
      this.configService.get<string>('app.submitterRole'),
      this.configService.get<string>('app.analystRole'),
      this.configService.get<string>('app.adminRole'),
    ];

    return user;
  }


}
