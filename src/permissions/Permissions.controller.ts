import { Controller, Get, Query } from '@nestjs/common';

import { ApiTags, ApiOkResponse, ApiSecurity } from '@nestjs/swagger';
import { AuditLog } from '@us-epa-camd/easey-common/decorators';

import { FacilityAccessWithCertStatementFlagDTO } from '../dtos/permissions.dto';
import { PermissionsService } from './Permissions.service';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Permissions')
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @Get('permissions')
  @ApiOkResponse({
    type: FacilityAccessWithCertStatementFlagDTO,
    description: 'Gets mocked permissions and flag for unassigned certificate statements for provided user',
  })
  @AuditLog({
    label: 'Retrieved permissions',
    requestQueryOutFields: ['userId']
  })
  getPermissions(
    @Query('userId') userId: string,
  ): Promise<FacilityAccessWithCertStatementFlagDTO> {
    return this.service.getMockPermissions(userId);
  }
}
