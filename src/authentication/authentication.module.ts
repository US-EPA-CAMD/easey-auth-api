import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { TokenModule } from '../token/token.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSessionRepository } from '../user-session/user-session.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserSessionRepository]), TokenModule],
  controllers: [AuthenticationController],
  providers: [ConfigService, AuthenticationService],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
