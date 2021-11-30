import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from '@us-epa-camd/easey-common/logger';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @InjectRepository(UserSessionRepository)
    private repository: UserSessionRepository,
    private logger: Logger,
  ) {}

  async validateRequest(request): Promise<boolean> {
    if (request.headers.authorization === undefined) {
      this.logger.error(
        BadRequestException,
        'Prior Authorization Token is Required.',
        true
      );
    }

    const splitString = request.headers.authorization.split(' ');
    if (splitString.lenth !== 2 && splitString[0] !== 'Bearer') {
      this.logger.error(
        BadRequestException,
        'Prior Authorization Token is Required.',
        true
      );
    }

    const session = await this.repository.findOne({
      securityToken: splitString[1],
    });

    if (session === undefined) {
      this.logger.error(
        BadRequestException,
        'Prior Authorization Token is Required',
        true
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
