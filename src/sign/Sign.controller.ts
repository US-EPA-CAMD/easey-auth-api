import {
  Body,
  Controller,
  Post,
  Headers,
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
import { SendPhonePinParamDTO } from '../dtos/send-phone-pin-param.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@us-epa-camd/easey-common/guards';
import { User } from '@us-epa-camd/easey-common/decorators';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';
import { LoggingInterceptor } from '@us-epa-camd/easey-common/interceptors';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Sign')
export class SignController {
  constructor(private readonly service: SignService) {}

  @Post('create-activity')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('Token')
  @ApiOkResponse({
    type: SignAuthResponseDTO,
    description: 'Creates a CROMERR activity for the logged in user',
  })
  @UseInterceptors(LoggingInterceptor)
  createCromerrActivity(
    @Body() credentials: CredentialsSignDTO,
    @User() user: CurrentUser,
    @Headers('Id-Token') idToken?: string,
  ): Promise<SignAuthResponseDTO> {
    return this.service.createCromerrActivity(user, credentials, idToken);
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
