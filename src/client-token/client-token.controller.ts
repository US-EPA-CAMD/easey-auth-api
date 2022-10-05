import { Body, Post, UseGuards, Controller } from '@nestjs/common';

import {
  ApiTags,
  ApiOkResponse,
  ApiSecurity,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { ClientTokenGuard } from '../guards/client-token.guard';

import { TokenDTO } from '../dtos/token.dto';
import { ClientIdDTO } from './../dtos/client-id.dto';
import { ClientTokenService } from './client-token.service';
import { AuthToken } from '../decorators/auth-token.decorator';
import { ClientCredentialsDTO } from '../dtos/client-credentials.dto';

@Controller()
@ApiTags('Tokens')
@ApiSecurity('APIKey')
export class ClientTokenController {
  constructor(private readonly service: ClientTokenService) {}

  @Post()
  @ApiOkResponse({
    type: TokenDTO,
    description: 'Generates a client token, given a client id and secret',
  })
  generateToken(@Body() payload: ClientCredentialsDTO): Promise<TokenDTO> {
    return this.service.generateToken(payload.clientId, payload.clientSecret);
  }

  @Post('validate')
  @ApiBearerAuth('ClientToken')
  @UseGuards(ClientTokenGuard)
  @ApiOkResponse({
    type: String,
    description: 'Validates a jwt client token',
  })
  validateToken(
    @Body() payload: ClientIdDTO,
    @AuthToken() clientToken: string,
  ): Promise<boolean> {
    console.log(payload.clientId, clientToken);
    return this.service.validateToken(payload.clientId, clientToken);
  }
}
