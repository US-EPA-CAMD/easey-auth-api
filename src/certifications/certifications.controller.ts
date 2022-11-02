import { Post, Controller, Body, UseGuards, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiSecurity,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CertificationVerificationResponseDTO } from '../dtos/certification-verication-response.dto';
import ClientIP from '../decorators/client-ip.decorator';
import { CredentialsDTO } from '../dtos/credentials.dto';

import { CertificationsService } from './certifications.service';
import { AnswerVerificationDTO } from '../dtos/answer-verification.dto';
import { AuthGuard } from '../guards/auth.guard';
import { CertificationStatementDTO } from '../dtos/certification-statement.dto';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Certification')
export class CertificationsController {
  constructor(private service: CertificationsService) {}

  @Post('/verify-credentials')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('Token')
  @ApiOkResponse({
    type: CertificationVerificationResponseDTO,
    description:
      'Authenticates a user against the CROMERR sign service using EPA CDX Services',
  })
  async verifyCredentials(
    @Body() credentials: CredentialsDTO,
    @ClientIP() clientIp: string,
  ): Promise<CertificationVerificationResponseDTO> {
    const certVer = new CertificationVerificationResponseDTO();
    certVer.activityId = 'Test';
    certVer.question = 'Example Question?';
    certVer.questionId = 'Test';
    return certVer;
  }

  @Post('/verify-challenge')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('Token')
  @ApiOkResponse({
    description: 'Verifies a users challenge question',
  })
  async verifyChallenge(
    @Body() credentials: AnswerVerificationDTO,
    @ClientIP() clientIp: string,
  ): Promise<boolean> {
    return true;
  }

  @Get('/statements')
  @ApiOkResponse({
    description: 'Returns a list of certification statements',
  })
  async statements(): Promise<CertificationStatementDTO[]> {
    return this.service.getStatements();
  }
}
