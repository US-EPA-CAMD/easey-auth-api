import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { Post, Controller, Body } from '@nestjs/common';
import { ClientIP } from './../decorators/client-ip.decorator';
import { UserIdDTO } from '../dtos/user-id.dto';
import { ValidateTokenDTO } from '../dtos/validate-token.dto';
import { TokenService } from './token.service';

@ApiTags('Tokens')
@Controller()
export class TokenController {
  constructor(private service: TokenService) {}

  @Post()
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
    description: 'Validates a security token (user must have valid session)',
  })
  validateToken(
    @Body() dto: ValidateTokenDTO,
    @ClientIP() clientIp: string,
  ): Promise<string> {
    return this.service.validateToken(dto.token, clientIp);
  }
}
