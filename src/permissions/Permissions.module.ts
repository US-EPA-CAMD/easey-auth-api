import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { PermissionsController } from './Permissions.controller';
import { PermissionsService } from './Permissions.service';

@Module({
  imports: [HttpModule],
  controllers: [PermissionsController],
  providers: [PermissionsService, ConfigService],
})
export class PermissionsModule {}
