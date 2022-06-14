import { Request } from 'express';

import { ApiTags, ApiOkResponse, ApiSecurity } from '@nestjs/swagger';
import { Post, Controller, Body, Req, Delete } from '@nestjs/common';

import { UserDTO } from './../dtos/user.dto';
import { CredentialsDTO } from './../dtos/credentials.dto';

import { ClientIP } from './../decorators/client-ip.decorator';
import { AuthenticationService } from './authentication.service';
import { UserTokenDTO } from 'src/dtos/userToken.dto';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Authentication')
export class AuthenticationController {
  constructor(private service: AuthenticationService) {}

  @Post('/sign-in')
  @ApiOkResponse({
    type: UserDTO,
    description: 'Authenticates a user using EPA CDX Services',
  })
  async signIn(
    @Body() credentials: CredentialsDTO,
    @ClientIP() clientIp: string,
    @Req() req: Request,
  ): Promise<UserDTO> {
    return this.service.signIn(
      credentials.userId,
      credentials.password,
      clientIp,
    );
  }

  @Delete('/sign-out')
  @ApiOkResponse({
    description: 'Authenticates a user using EPA CDX Services',
  })
  async signOut(
    @Body() credentials: UserTokenDTO,
    @ClientIP() clientIp: string,
  ): Promise<void> {
    console.log(credentials);

    await this.service.signOut(credentials.userId, credentials.token, clientIp);
  }
}
