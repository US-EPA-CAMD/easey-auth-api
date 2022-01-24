import { Request } from 'express';

import {
  ApiTags,
  ApiOkResponse,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { Post, Controller, Body, UseGuards, Delete, Req } from '@nestjs/common';

import { UserDTO } from './../dtos/user.dto';
import { CredentialsDTO } from './../dtos/credentials.dto';

import { ClientIP } from './../decorators/client-ip.decorator';
import { AuthenticationService } from './authentication.service';
import { AuthGuard } from '../guards/auth.guard';

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
    const userInfo = await this.service.signIn(
      credentials.userId,
      credentials.password,
      clientIp,
    );

    req.res.cookie('cdxToken', userInfo.token, {
      domain: req.hostname,
    });
    return userInfo;
  }

  @Delete('/sign-out')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('Token')
  @ApiOkResponse({
    description: 'Authenticates a user using EPA CDX Services',
  })
  async signOut(
    @Req() req: Request,
    @ClientIP() clientIp: string,
  ): Promise<void> {
    const token = req.headers['authorization'].split(' ')[1];
    const signOutResponse = await this.service.signOut(token, clientIp);

    req.res.clearCookie('cdxToken', { domain: req.hostname });
  }
}
