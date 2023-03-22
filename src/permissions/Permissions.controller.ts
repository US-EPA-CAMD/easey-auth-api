import { Controller, Get, Query } from '@nestjs/common';

import { ApiTags, ApiOkResponse, ApiSecurity } from '@nestjs/swagger';
import { PermissionsDTO } from '../dtos/permissions.dto';
import { PermissionsService } from './Permissions.service';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Permissions')
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @Get('permissions')
  @ApiOkResponse({
    type: PermissionsDTO,
    description: 'Gets mocked permissions for provided user',
  })
  getPermissions(@Query('userId') userId: string): Promise<PermissionsDTO> {
    return this.service.getMockPermissions(userId);
  }
}
