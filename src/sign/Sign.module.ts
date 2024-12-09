import { Module } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { SignController } from './Sign.controller';
import { SignService } from './Sign.service';
import { HttpModule } from '@nestjs/axios';
import { OidcHelperModule } from '../oidc/OidcHelper.module';
import { UserSessionModule } from '../user-session/user-session.module';
import { TokenModule } from '../token/token.module';
import { PermissionsService } from 'src/permissions/Permissions.service';

@Module({
  imports: [HttpModule, OidcHelperModule, UserSessionModule, TokenModule],
  controllers: [SignController],
  providers: [SignService, ConfigService, PermissionsService],
  exports: [SignService],
})
export class SignModule {}
