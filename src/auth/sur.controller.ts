import { Post, Controller, Body, Delete, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiSecurity,
} from '@nestjs/swagger';

import { UserDTO } from '../dtos/user.dto';
import { ClientIP } from '../decorators/client-ip.decorator';
import { SurAuthService } from './sur.auth.service';
import { PolicyResponse } from '../dtos/policy-response';
import { CredentialsOidcDTO } from '../dtos/credentialsOidc.dto';
import { CredentialsDTO } from '../dtos/credentials.dto';


@Controller()
@ApiSecurity('APIKey')
@ApiTags('Authentication')
export class SurController {
  constructor(private service: SurAuthService) {}

  @Post('/determinePolicy')
  @ApiOkResponse({
    type: PolicyResponse,
    description: 'Determines the users policy based a given user id',
  })
  async determinePolicy(
    @Body() credentials: CredentialsOidcDTO,
    @ClientIP() clientIp: string,
  ): Promise<PolicyResponse> {

    return this.service.determinePolicy(
      credentials.userId
    );
  }

}
