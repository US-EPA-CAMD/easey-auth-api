import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { TokenModule } from '../token/token.module';
import { UserSessionModule } from '../user-session/user-session.module';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SignModule } from '../sign/Sign.module';
import { PermissionsModule } from '../permissions/Permissions.module';
import { OidcHelperModule } from '../oidc/OidcHelper.module';

@Module({
  imports: [
    TokenModule,
    UserSessionModule,
    OidcHelperModule,
    SignModule,
    PermissionsModule,
    HttpModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
