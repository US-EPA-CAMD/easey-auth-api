import { Observable } from 'rxjs';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LoggingException } from '@us-epa-camd/easey-common/exceptions';

import { ClientTokenService } from 'src/client-token/client-token.service';

@Injectable()
export class ClientTokenGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private tokenService: ClientTokenService,
  ) {}

  async validateRequest(request): Promise<boolean> {
    const clientId = request.body.clientId;
    const authHeader = request.headers.authorization;
    const errorMsg =
      'Client Id and Token are required to access this resource.';

    if (
      clientId === null ||
      clientId === undefined ||
      authHeader === null ||
      authHeader === undefined
    ) {
      throw new LoggingException(errorMsg, HttpStatus.BAD_REQUEST);
    }

    const splitString = authHeader.split(' ');
    if (splitString.length !== 2 && splitString[0] !== 'Bearer') {
      throw new LoggingException(errorMsg, HttpStatus.BAD_REQUEST);
    }

    return this.tokenService.validateToken(clientId, splitString[1]);
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (this.configService.get('app.enableClientToken') === true) {
      const request = context.switchToHttp().getRequest();
      return this.validateRequest(request);
    }

    return true;
  }
}
