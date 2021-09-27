import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [TokenModule],
  controllers: [AuthenticationController],
  providers: [ConfigService, AuthenticationService, Logger],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
