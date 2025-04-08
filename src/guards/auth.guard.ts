import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async validateRequest(request): Promise<boolean> {
    const authHeader = request.headers.authorization;
    const errorMsg = "Unauthorized access: Missing or invalid authorization token.";

    if (!authHeader) {
      throw new UnauthorizedException(errorMsg);
    }

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      throw new UnauthorizedException("Invalid authorization format. Expected 'Bearer <token>'.");
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
