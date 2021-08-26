import { Module } from '@nestjs/common';

import { TokenController } from './token.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { TokenService } from './token.service';
import { UserSessionMap } from '../maps/user-session.map';

@Module({
  imports: [TypeOrmModule.forFeature([UserSessionRepository])],
  controllers: [TokenController],
  providers: [TokenService, UserSessionMap],
  exports: [TokenService],
})
export class TokenModule {}
