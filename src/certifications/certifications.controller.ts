import { Post, Controller, Body, UseGuards, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiSecurity,
  ApiQuery, getSchemaPath, ApiExtraModels,
} from '@nestjs/swagger';

import { CertificationsService } from './certifications.service';
import { CertificationStatementDTO } from '../dtos/certification-statement.dto';
import { CertificationParamDTO } from '../dtos/certification-param.dto';
import { ArrayResponse } from '@us-epa-camd/easey-common/interfaces/common.interface';
import { ApiExcludeEndpointByEnv } from '../decorators/swagger-decorator';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Certification')
export class CertificationsController {
  constructor(private service: CertificationsService) {}

  @Get('/statements')
  @ApiExcludeEndpointByEnv()
  @ApiExtraModels(CertificationStatementDTO)
  @ApiOkResponse({
    description: 'Returns a list of certification statements',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { $ref: getSchemaPath(CertificationStatementDTO) },
            },
          },
        },
      },
    }
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
