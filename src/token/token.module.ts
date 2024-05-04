import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { UserSessionModule } from './../user-session/user-session.module';
import { ClientTokenModule } from './../client-token/client-token.module';

import { TokenService } from './token.service';
import { TokenController } from './token.controller';
import { PermissionsModule } from '../permissions/Permissions.module';
import { AuthModule } from '../auth/auth.module';
import { OidcHelperService } from '../oidc/OidcHelperService';

@Module({
  imports: [
    HttpModule,
    UserSessionModule,
    ClientTokenModule,
    PermissionsModule,
  ],
  controllers: [TokenController],
  providers: [TokenService, OidcHelperService],
  exports: [TokenService, OidcHelperService],
})
export class TokenModule {}
