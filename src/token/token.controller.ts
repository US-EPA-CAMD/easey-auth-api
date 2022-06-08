import { Request } from 'express';
import {
  ApiTags,
  ApiOkResponse,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { Post, Controller, Body, Req } from '@nestjs/common';
import { ClientIP } from './../decorators/client-ip.decorator';
import { UserIdDTO } from '../dtos/user-id.dto';
import { ValidateTokenDTO } from '../dtos/validate-token.dto';
import { TokenService } from './token.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';
import { ValidateClientIdParamsDTO } from '../dtos/validate-client-id.dto';
import { ValidateClientTokenParamsDTO } from 'src/dtos/validate-client-token.dto';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Tokens')
export class TokenController {
  constructor(private service: TokenService) {}

  @Post('/client/validate')
  @ApiOkResponse({
    type: String,
    description: 'Validates a jwt client token',
  })
  validateClientToken(
    @Body() validateClientTokenParamsDTO: ValidateClientTokenParamsDTO,
  ): Promise<boolean> {
    // app Name
    return this.service.validateClientToken(validateClientTokenParamsDTO);
  }

  @Post('/client')
  @ApiOkResponse({
    type: String,
    description: 'Generates a client token, given a client id and secret',
  })
  genClientToken(
    @Body() validateClientIdParams: ValidateClientIdParamsDTO,
  ): Promise<string> {
    // app Name
    return this.service.generateClientToken(validateClientIdParams);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth('Token')
  @ApiOkResponse({
    type: String,
    description: 'Creates a security token (user must be authenticated)',
  })
  async createToken(
    @Body() dto: UserIdDTO,
    @ClientIP() clientIp: string,
    @Req() req: Request,
  ): Promise<string> {
    const token = await this.service.createToken(dto.userId, clientIp);

    req.res.cookie('cdxToken', token, {
      domain: req.hostname,
    });

    return token;
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
