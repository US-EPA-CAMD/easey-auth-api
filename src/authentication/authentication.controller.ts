import {
  ApiTags,
  ApiOkResponse,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';

import {
  Post,
  Controller,
  Body,
} from '@nestjs/common';

import { UserDTO } from './../dtos/user.dto';
import { CredentialsDTO } from './../dtos/credentials.dto';
import { AuthenticationService } from './authentication.service';

@ApiTags('Authentication')
@Controller()
export class AuthenticationController {
  constructor(
    private service: AuthenticationService,
  ) {}

  @Post('/authenticate')
  @ApiOkResponse({
    status: 201,
    description: 'Authenticated',
    content: {
      'application/json': {
        schema: {
          $ref: getSchemaPath(UserDTO)
        }
      }
    }
  })
  @ApiExtraModels(UserDTO)
  authenticate(@Body() credentials: CredentialsDTO): Promise<UserDTO> {
    return this.service.authenticate(credentials.userId, credentials.password);
  }
}
