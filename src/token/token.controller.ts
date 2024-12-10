import { Post, Controller, UseGuards, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiSecurity,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { ClientIP } from './../decorators/client-ip.decorator';
import { AuthToken } from '../decorators/auth-token.decorator';
import { AuthGuard } from '../guards/auth.guard';

import { TokenService } from './token.service';
import { TokenDTO } from '../dtos/token.dto';
import { UserIdDTO } from '../dtos/user-id.dto';
import { MaintenanceVerifyParamDTO } from '../dtos/maintenance-verify-param.dto';
import { ApiExcludeEndpointByEnv } from '../utilities/swagger-decorator.const';

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
    @Body() user: UserIdDTO,
    @AuthToken() authToken: string,
    @ClientIP() clientIp: string,
  ): Promise<TokenDTO> {
    return this.service.refreshToken(user.userId, authToken, clientIp);
  }

  @Post('/validate')
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

  @Post('/maintenance-validate')
  @ApiExcludeEndpointByEnv()
  @ApiOkResponse({
    type: Boolean,
    description: 'Validates a user security token and validate user in maintenance list',
  })
  async validateMaintenance(
    @Body() maintenanceVerifyParamDTO: MaintenanceVerifyParamDTO,
  ): Promise<boolean> {
    return this.service.validateMaintenance(maintenanceVerifyParamDTO);
  }
}
