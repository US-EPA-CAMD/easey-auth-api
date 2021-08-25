import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { Post, Controller, Body } from '@nestjs/common';
import { ClientIP } from './../decorators/client-ip.decorator';
import { UserIdDTO } from 'src/dtos/user-id.dto';
import { AuthenticationService } from 'src/authentication/authentication.service';

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
}
