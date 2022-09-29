import { Post, Controller, Body, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiSecurity } from '@nestjs/swagger';

import { User } from '@us-epa-camd/easey-common/decorators';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';

import { UserDTO } from '../dtos/user.dto';
import { CredentialsDTO } from './../dtos/credentials.dto';
import { ClientIP } from '../decorators/client-ip.decorator';
import { AuthToken } from '../decorators/auth-token.decorator';
import { AuthGuard } from '../guards/auth.guard';
import { AuthService } from './auth.service';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Authentication')
export class AuthController {
  constructor(private service: AuthService) {}

  @Post('/sign-in')
  @ApiOkResponse({
    type: UserDTO,
    description: 'Authenticates a user using EPA CDX Services',
  })
  async signIn(
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
  @ApiOkResponse({
    description: 'Signs a user out of the system',
  })
  async signOut(
    @User() user: CurrentUser,
    @AuthToken() authToken: string,
  ): Promise<void> {
    await this.service.signOut(user.userId, authToken);
  }
}
