import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { PermissionsController } from './Permissions.controller';
import { PermissionsService } from './Permissions.service';
import { SignModule } from '../sign/Sign.module';
import { UserSessionModule } from '../user-session/user-session.module';
import { OidcHelperModule } from '../oidc/OidcHelper.module';

@Module({
  imports: [HttpModule, OidcHelperModule],
  controllers: [PermissionsController],
  providers: [PermissionsService, ConfigService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
