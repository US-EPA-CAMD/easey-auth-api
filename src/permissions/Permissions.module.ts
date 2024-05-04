import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { PermissionsController } from './Permissions.controller';
import { PermissionsService } from './Permissions.service';
import { SignModule } from '../sign/Sign.module';
import { UserSessionModule } from '../user-session/user-session.module';
import { OidcHelperService } from '../oidc/OidcHelperService';

@Module({
  imports: [HttpModule, SignModule, UserSessionModule],
  controllers: [PermissionsController],
  providers: [PermissionsService, ConfigService, OidcHelperService],
  exports: [PermissionsService, OidcHelperService],
})
export class PermissionsModule {}
