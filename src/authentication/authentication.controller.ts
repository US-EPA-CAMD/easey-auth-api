import { ApiTags, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Post, Controller, Body, UseGuards, Delete, Req } from '@nestjs/common';
import { Request } from '@nestjs/common';

import { UserDTO } from './../dtos/user.dto';
import { CredentialsDTO } from './../dtos/credentials.dto';

import { ClientIP } from './../decorators/client-ip.decorator';
import { AuthenticationService } from './authentication.service';
import { AuthGuard } from '../guards/auth.guard';

@ApiTags('Authentication')
@Controller()
export class AuthenticationController {
  constructor(private service: AuthenticationService) {}

  @Post('/sign-in')
  @ApiOkResponse({
    type: UserDTO,
    description: 'Authenticates a user using EPA CDX Services',
  })
  signIn(
    @Body() credentials: CredentialsDTO,
    @ClientIP() clientIp: string,
  ): Promise<UserDTO> {
    return this.service.signIn(
      credentials.userId,
      credentials.password,
      clientIp,
    );
  }

  @Delete('/sign-out')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('Token')
  @ApiOkResponse({
    description: 'Authenticates a user using EPA CDX Services',
  })
  signOut(@Req() req: Request, @ClientIP() clientIp: string): Promise<void> {
    const token = req.headers['authorization'].split(' ')[1];
    return this.service.signOut(token, clientIp);
  }
}
