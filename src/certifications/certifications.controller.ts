import { Post, Controller, Body, UseGuards, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';

import { CertificationsService } from './certifications.service';
import { CertificationStatementDTO } from '../dtos/certification-statement.dto';
import { CertificationParamDTO } from '../dtos/certification-param.dto';
import { ArrayResponse } from '@us-epa-camd/easey-common/interfaces/common.interface';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Certification')
export class CertificationsController {
  constructor(private service: CertificationsService) {}

  @Get('/statements')
  @ApiOkResponse({
    description: 'Returns a list of certification statements',
  })
  @ApiQuery({
    style: 'pipeDelimited',
    name: 'monitorPlanIds',
    required: true,
    explode: false,
  })
  async statements(
    @Query() dto: CertificationParamDTO,
  ): Promise<ArrayResponse<CertificationStatementDTO>> {
    const statements = await this.service.getStatements(dto.monitorPlanIds);
    return {
      items: statements
    };
  }
}
