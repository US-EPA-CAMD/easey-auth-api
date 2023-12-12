import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOkResponse,
  ApiSecurity,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SignAuthResponseDTO } from '../dtos/sign-auth-response.dto';
import { SignService } from './Sign.service';
import { CredentialsSignDTO } from '../dtos/certification-sign-param.dto';
import { CertificationVerifyParamDTO } from '../dtos/certification-verify-param.dto';
import { SendPhonePinParamDTO } from '../dtos/send-phone-pin-param.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@us-epa-camd/easey-common/guards';
import { User } from '@us-epa-camd/easey-common/decorators';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Sign')
export class SignController {
  constructor(private readonly service: SignService) {}

  @Post('authenticate')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('Token')
  @ApiOkResponse({
    type: SignAuthResponseDTO,
    description: 'Authenticates a user using EPA CDX Sign Services',
  })
  authenticate(
    @Body() credentials: CredentialsSignDTO,
    @User() user: CurrentUser,
  ): Promise<SignAuthResponseDTO> {
    return this.service.authenticate(credentials, user);
  }

  @Post('send-mobile-code')
  @ApiOkResponse({
    description:
      'Send the user a mobile phone code given a number and activity Id',
  })
  async sendMobileCode(@Body() payload: SendPhonePinParamDTO): Promise<void> {
    await this.service.sendPhoneVerificationCode(payload);
  }

  @Post('validate')
  @ApiOkResponse({
    type: SignAuthResponseDTO,
    description: 'Verifies a user question using the EPA CDX Sign Services',
  })
  validate(@Body() payload: CertificationVerifyParamDTO): Promise<boolean> {
    return this.service.validate(payload);
  }

  @Post()
  @ApiOkResponse({
    description: 'Signs a document and binds it to an activityId',
  })
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiBody({
    description: 'Multiple files and activityId to upload',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        activityId: {
          type: 'string',
        },
      },
    },
  })
  async sign(
    @Body('activityId') activityId: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ): Promise<void> {
    await this.service.signAllFiles(activityId, files);
  }
}
