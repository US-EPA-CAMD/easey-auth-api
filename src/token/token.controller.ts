import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { Post, Controller, Body } from '@nestjs/common';
import { ClientIP } from './../decorators/client-ip.decorator';
import { UserIdDTO } from '../dtos/user-id.dto';
import { AuthenticationService } from '../authentication/authentication.service';
import { ValidateTokenDTO } from '../dtos/validate-token.dto';

@ApiTags('Tokens')
@Controller()
export class TokenController {
  constructor(private service: AuthenticationService) {}

  @Post('/createToken')
  @ApiOkResponse({
    type: String,
    description: 'Creates a security token (user must be authenticated)',
  })
  createToken(
    @Body() dto: UserIdDTO,
    @ClientIP() clientIp: string,
  ): Promise<string> {
    return this.service.createToken(dto.userId, 'Kyle', 'Herceg', clientIp);
  }

  @Post('/validateToken')
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
