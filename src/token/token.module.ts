import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';

import { UserSessionModule } from './../user-session/user-session.module';
import { ClientTokenModule } from './../client-token/client-token.module';

import { TokenService } from './token.service';
import { TokenController } from './token.controller';
import { PermissionsModule } from '../permissions/Permissions.module';
import { AuthModule } from '../auth/auth.module';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { BypassService } from '../oidc/Bypass.service';
import { OidcHelperModule } from '../oidc/OidcHelper.module';
import { ClientTokenService } from '../client-token/client-token.service';

@Module({
  imports: [
    CacheModule.register(),
    HttpModule,
    UserSessionModule,
    ClientTokenModule,
    PermissionsModule,
    OidcHelperModule,
  ],
  controllers: [TokenController],
  providers: [TokenService, ClientTokenService],
  exports: [TokenService, ClientTokenService],
})
export class TokenModule {}
