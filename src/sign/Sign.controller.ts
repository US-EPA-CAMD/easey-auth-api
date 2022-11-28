import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiSecurity } from '@nestjs/swagger';
import { SignAuthResponseDTO } from '../dtos/sign-auth-response.dto';
import { SignService } from './Sign.service';
import { CredentialsSignDTO } from '../dtos/certification-sign-param.dto';
import { CertificationVerifyParamDTO } from '../dtos/certification-verify-param.dto';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Sign')
export class SignController {
  constructor(private readonly service: SignService) {}

  @Post('authenticate')
  @ApiOkResponse({
    type: SignAuthResponseDTO,
    description: 'Authenticates a user using EPA CDX Sign Services',
  })
  authenticate(
    @Body() credentials: CredentialsSignDTO,
  ): Promise<SignAuthResponseDTO> {
    return this.service.authenticate(credentials);
  }

  @Post('validate')
  @ApiOkResponse({
    type: SignAuthResponseDTO,
    description: 'Verifies a user question using EPA CDX Sign Services',
  })
  validate(@Body() payload: CertificationVerifyParamDTO): Promise<boolean> {
    return this.service.validate(payload);
  }
}
