import { ApiTags, ApiOkResponse, ApiSecurity } from '@nestjs/swagger';
import { Post, Controller, Body } from '@nestjs/common';
import { ClientIP } from './../decorators/client-ip.decorator';
import { ValidateTokenDTO } from '../dtos/validate-token.dto';
import { TokenService } from './token.service';
import { ValidateClientIdParamsDTO } from '../dtos/validate-client-id.dto';
import { ValidateClientTokenParamsDTO } from '../dtos/validate-client-token.dto';
import { TokenDTO } from '../dtos/token.dto';
import { TokenClientService } from './token-client.service';
import { UserTokenDTO } from '../dtos/userToken.dto';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Tokens')
export class TokenController {
  constructor(
    private readonly service: TokenService,
    private readonly clientService: TokenClientService,
  ) {}

  @Post('/client/validate')
  @ApiOkResponse({
    type: String,
    description: 'Validates a jwt client token',
  })
  validateClientToken(
    @Body() validateClientTokenParamsDTO: ValidateClientTokenParamsDTO,
  ): Promise<boolean> {
    // app Name
    return this.clientService.validateClientToken(validateClientTokenParamsDTO);
  }

  @Post('/client')
  @ApiOkResponse({
    type: String,
    description: 'Generates a client token, given a client id and secret',
  })
  genClientToken(
    @Body() validateClientIdParams: ValidateClientIdParamsDTO,
  ): Promise<TokenDTO> {
    // app Name
    return this.clientService.generateClientToken(validateClientIdParams);
  }
}
