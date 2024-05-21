import { Post, Controller, Body, UseGuards, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiSecurity,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CertificationVerificationResponseDTO } from '../dtos/certification-verication-response.dto';
import ClientIP from '../decorators/client-ip.decorator';
import { CredentialsDTO } from '../dtos/credentials.dto';

import { CertificationsService } from './certifications.service';
import { AnswerVerificationDTO } from '../dtos/answer-verification.dto';
import { AuthGuard } from '../guards/auth.guard';
import { CertificationStatementDTO } from '../dtos/certification-statement.dto';
import { CertificationParamDTO } from '../dtos/certification-param.dto';

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
  ): Promise<CertificationStatementDTO[]> {
    return this.service.getStatements(dto.monitorPlanIds);
  }
}
