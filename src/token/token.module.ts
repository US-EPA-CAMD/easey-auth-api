import { Module } from '@nestjs/common';

import { TokenController } from './token.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { TokenService } from './token.service';
import { UserSessionMap } from '../maps/user-session.map';
import { AuthGuard } from '../guards/auth.guard';
import { ApiRepository } from './api.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserSessionRepository, ApiRepository])],
  controllers: [TokenController],
  providers: [TokenService, UserSessionMap, AuthGuard],
  exports: [TypeOrmModule, TokenService, AuthGuard],
})
export class TokenModule {}
