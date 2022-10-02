import { Post, Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';

import { User } from '@us-epa-camd/easey-common/decorators';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';

import { ClientIP } from './../decorators/client-ip.decorator';
import { AuthToken } from '../decorators/auth-token.decorator';
import { AuthGuard } from '../guards/auth.guard';

import { TokenService } from './token.service';
import { TokenDTO } from '../dtos/token.dto';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Tokens')
export class TokenController {
  constructor(private readonly service: TokenService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth('Token')
  @ApiOkResponse({
    type: TokenDTO,
    description: 'Creates a user security token (user must be authenticated)',
  })
  async createToken(
    @User() user: CurrentUser,
    @AuthToken() authToken: string,
    @ClientIP() clientIp: string,
  ): Promise<TokenDTO> {
    return this.service.refreshToken(user.userId, authToken, clientIp);
  }

  @Post('/validate')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('Token')
  @ApiOkResponse({
    type: String,
    description:
      'Validates a user security token (user must have valid session)',
  })
  validateToken(
    @AuthToken() authToken: string,
    @ClientIP() clientIp: string,
  ): Promise<string> {
    return this.service.validateToken(authToken, clientIp);
  }
}
