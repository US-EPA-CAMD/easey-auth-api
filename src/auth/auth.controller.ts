import { Post, Controller, Body, Delete, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiSecurity,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { UserDTO } from '../dtos/user.dto';
import { CredentialsDTO } from './../dtos/credentials.dto';
import { ClientIP } from '../decorators/client-ip.decorator';
import { AuthToken } from '../decorators/auth-token.decorator';
import { AuthGuard } from '../guards/auth.guard';
import { AuthService } from './auth.service';
import { UserIdDTO } from '../dtos/user-id.dto';

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

  @Post('/update-last-activity')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('Token')
  @ApiOkResponse({
    description: 'Refreshes a users last activity date',
  })
  async lastActivity(@AuthToken() authToken: string): Promise<void> {
    await this.service.updateLastActivity(authToken);
  }

  @Delete('/sign-out')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('Token')
  @ApiOkResponse({
    description: 'Signs a user out of the system',
  })
  async signOut(
    @Body() user: UserIdDTO,
    @AuthToken() authToken: string,
  ): Promise<void> {
    await this.service.signOut(user.userId, authToken);
  }
}
