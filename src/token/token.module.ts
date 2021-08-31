import { Module } from '@nestjs/common';

import { TokenController } from './token.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { TokenService } from './token.service';
import { UserSessionMap } from '../maps/user-session.map';
import { AuthGuard } from '../guards/auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([UserSessionRepository])],
  controllers: [TokenController],
  providers: [TokenService, UserSessionMap, AuthGuard],
  exports: [TokenService, AuthGuard],
})
export class TokenModule {}
