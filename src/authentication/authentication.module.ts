import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';

@Module({
  imports: [],
  controllers: [AuthenticationController],
  providers: [
    ConfigService,
    AuthenticationService,
  ],
})

export class AuthenticationModule {}
