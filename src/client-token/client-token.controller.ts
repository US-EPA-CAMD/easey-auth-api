import { Post, Controller, Body } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiSecurity } from '@nestjs/swagger';
import { ValidateClientIdParamsDTO } from '../dtos/validate-client-id.dto';
import { ValidateClientTokenParamsDTO } from '../dtos/validate-client-token.dto';
import { ClientTokenService } from './client-token.service';
import { TokenDTO } from '../dtos/token.dto';

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
    @Body() params: ValidateClientIdParamsDTO,
  ): Promise<TokenDTO> {
    return this.service.generateToken(params);
  }

  @Post('validate')
  @ApiOkResponse({
    type: String,
    description: 'Validates a jwt client token',
  })
  validateToken(
    @Body() params: ValidateClientTokenParamsDTO,
  ): Promise<boolean> {
    return this.service.validateToken(params);
  }
}
