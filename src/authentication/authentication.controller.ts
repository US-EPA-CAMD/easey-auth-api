import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { Post, Controller, Body } from '@nestjs/common';

import { UserDTO } from './../dtos/user.dto';
import { UserIdDTO } from '../dtos/user-id.dto';
import { CredentialsDTO } from './../dtos/credentials.dto';
import { ValidateTokenDTO } from './../dtos/validate-token.dto';

import { ClientIP } from './../decorators/client-ip.decorator';
import { AuthenticationService } from './authentication.service';

@ApiTags('Authentication')
@Controller()
export class AuthenticationController {
  constructor(private service: AuthenticationService) {}

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

  @Post('/token')
  @ApiOkResponse({
    type: String,
    description: 'Creates a security token (user must be authenticated)',
  })
  createToken(
    @Body() dto: UserIdDTO,
    @ClientIP() clientIp: string,
  ): Promise<string> {
    return this.service.createToken(dto.userId, clientIp);
  }

  @Post('/validate')
  @ApiOkResponse({
    type: String,
    description: 'Validates a security token (user must be authenticated)',
  })
  validate(
    @Body() dto: ValidateTokenDTO,
    @ClientIP() clientIp: string,
  ): Promise<string> {
    return this.service.validateToken(dto.token, clientIp);
  }
}
