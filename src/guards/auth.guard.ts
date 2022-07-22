import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @InjectRepository(UserSessionRepository)
    private repository: UserSessionRepository,
    private logger: Logger,
  ) {}

  async validateRequest(request): Promise<boolean> {
    if (request.headers.authorization === undefined) {
      throw new LoggingException(
        'Prior Authorization Token is Required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const splitString = request.headers.authorization.split(' ');
    if (splitString.lenth !== 2 && splitString[0] !== 'Bearer') {
      throw new LoggingException(
        'Prior Authorization Token is Required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const session = await this.repository.findOne({
      securityToken: splitString[1],
    });

    if (session === undefined) {
      throw new LoggingException(
        'Prior Authorization Token is Required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return true;
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    return this.validateRequest(request);
  }
}
