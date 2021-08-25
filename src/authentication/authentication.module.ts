import { TypeOrmModule } from '@nestjs/typeorm';

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { UserSessionMap } from '../maps/user-session.map';
import { TestingPatch } from './testing-patch.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserSessionRepository])],
  controllers: [AuthenticationController],
  providers: [
    ConfigService,
    AuthenticationService,
    UserSessionMap,
    TestingPatch,
  ],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
