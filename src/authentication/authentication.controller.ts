import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { Post, Controller, Body } from '@nestjs/common';

import { UserDTO } from './../dtos/user.dto';
import { CredentialsDTO } from './../dtos/credentials.dto';

import { ClientIP } from './../decorators/client-ip.decorator';
import { AuthenticationService } from './authentication.service';
import { ValidateTokenDTO } from 'src/dtos/validate-token.dto';

@ApiTags('Authentication')
@Controller()
export class AuthenticationController {
  constructor(private service: AuthenticationService) {}

  // Refactor out eventually
  @Post('/authenticate')
  @ApiOkResponse({
    type: UserDTO,
    description: 'Authenticates a user using EPA CDX Services',
  })
  authenticate(
    @Body() credentials: CredentialsDTO,
    @ClientIP() clientIp: string,
  ): Promise<UserDTO> {
    return this.service.authenticate(
      credentials.userId,
      credentials.password,
      clientIp,
    );
  }

  @Post('/sign-in')
  @ApiOkResponse({
    type: UserDTO,
    description: 'Authenticates a user using EPA CDX Services',
  })
  signIn(
    @Body() credentials: CredentialsDTO,
    @ClientIP() clientIp: string,
  ): Promise<UserDTO> {
    return this.service.authenticate(
      credentials.userId,
      credentials.password,
      clientIp,
    );
  }

  @Post('/sign-out')
  @ApiOkResponse({
    description: 'Authenticates a user using EPA CDX Services',
  })
  signOut(@Body() credentials: ValidateTokenDTO, @ClientIP() clientIp: string) {
    this.service.signOut(credentials.token, clientIp);
  }
}
