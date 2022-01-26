import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [TokenModule, HttpModule],
  controllers: [AuthenticationController],
  providers: [ConfigService, AuthenticationService],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
