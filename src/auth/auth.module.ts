import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { TokenModule } from '../token/token.module';
import { UserSessionModule } from '../user-session/user-session.module';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    HttpModule,
    TokenModule,
    UserSessionModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
