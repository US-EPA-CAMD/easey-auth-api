import { Module } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { PermissionsController } from './Permissions.controller';
import { PermissionsService } from './Permissions.service';

@Module({
  imports: [],
  controllers: [PermissionsController],
  providers: [PermissionsService, ConfigService],
})
export class PermissionsModule {}
