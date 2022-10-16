import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async validateRequest(request): Promise<boolean> {
    const authHeader = request.headers.authorization;
    const forwardedForHeader = request.headers['x-forwarded-for'];
    let errorMsg =
      'Prior Authorization (User Security Token) required to access this resource.';

    if (authHeader === null || authHeader === undefined) {
      throw new LoggingException(errorMsg, HttpStatus.BAD_REQUEST);
    }

    const splitString = authHeader.split(' ');
    if (splitString.length !== 2 && splitString[0] !== 'Bearer') {
      throw new LoggingException(errorMsg, HttpStatus.BAD_REQUEST);
    }

    let ip = request.ip;
    if (forwardedForHeader !== null && forwardedForHeader !== undefined) {
      ip = forwardedForHeader.split(',')[0];
    }

    return true;
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    if (this.configService.get('app.enableAuthToken') === true) {
      return this.validateRequest(request);
    }

    return true;
  }
}
