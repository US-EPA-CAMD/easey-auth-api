import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @InjectRepository(UserSessionRepository)
    private repository: UserSessionRepository,
  ) {}

  async validateRequest(request): Promise<boolean> {
    if (request.headers.authorization === undefined)
      throw new BadRequestException('Prior Authorization token is required.');

    const splitString = request.headers.authorization.split(' ');
    if (splitString.lenth !== 2 && splitString[0] !== 'Bearer')
      throw new BadRequestException('Prior Authorization token is required.');

    const session = await this.repository.findOne({
      securityToken: splitString[1],
    });

    if (session === undefined) {
      throw new BadRequestException('Prior Authorization token is required.');
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
