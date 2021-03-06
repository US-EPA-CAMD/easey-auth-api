import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { UserDTO } from '../dtos/user.dto';
import { UserSessionService } from '../user-session/user-session.service';

@Injectable()
export class AuthenticationBypassService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
    private readonly userSessionService: UserSessionService,
  ) {}

  async bypassSignIn(userId: string, password: string, clientIp: string) {
    const acceptedUsers = JSON.parse(
      this.configService.get<string>('cdxBypass.users'),
    );

    if (!acceptedUsers.find(x => x === userId)) {
      throw new LoggingException(
        'Incorrect Bypass userId',
        HttpStatus.BAD_REQUEST,
      );
    }

    const currentPass = this.configService.get<string>('cdxBypass.pass');

    if (password === currentPass) {
      const user = new UserDTO();
      user.userId = userId;
      user.firstName = userId;
      user.lastName = '';

      const token = await this.userSessionService.createUserSession(
        userId,
        clientIp,
      );

      user.token = token.token;
      user.tokenExpiration = token.expiration;

      return user;
    } else {
      throw new LoggingException(
        'Incorrect Bypass password',
        HttpStatus.BAD_REQUEST,
      );
    }

    return null;
  }
}
