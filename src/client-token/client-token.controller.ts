import { Post, Controller, Body } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiSecurity } from '@nestjs/swagger';

import { TokenDTO } from '../dtos/token.dto';
import { ClientIdDTO } from './../dtos/client-id.dto';
import { ClientTokenService } from './client-token.service';
import { AuthToken } from '../decorators/auth-token.decorator';
import { ClientCredentialsDTO } from '../dtos/client-credentials.dto';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Tokens')
export class ClientTokenController {
  constructor(
    private readonly service: ClientTokenService,
  ) {}

  @Post()
  @ApiOkResponse({
    type: TokenDTO,
    description: 'Generates a client token, given a client id and secret',
  })
  generateToken(
    @Body() dto: ClientCredentialsDTO,
  ): Promise<TokenDTO> {
    return this.service.generateToken(dto.clientId, dto.clientSecret);
  }

  @Post('validate')
  @ApiOkResponse({
    type: String,
    description: 'Validates a jwt client token',
  })
  validateToken(
    @Body() dto: ClientIdDTO,
    @AuthToken() clientToken: string,
  ): Promise<boolean> {
    return this.service.validateToken(dto.clientId, clientToken);
  }
}