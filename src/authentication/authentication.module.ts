import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { TokenModule } from '../token/token.module';
import { AuthenticationBypassService } from './authentication-bypass.service';
import { UserSessionModule } from 'src/user-session/user-session.module';

@Module({
  imports: [TokenModule, HttpModule, UserSessionModule],
  controllers: [AuthenticationController],
  providers: [
    ConfigService,
    AuthenticationService,
    AuthenticationBypassService,
  ],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
