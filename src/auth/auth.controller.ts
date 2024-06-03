import { Body, Controller, Delete, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

import { Response } from 'express';

import { UserDTO } from '../dtos/user.dto';
import { ClientIP } from '../decorators/client-ip.decorator';
import { AuthToken } from '../decorators/auth-token.decorator';
import { AuthGuard } from '../guards/auth.guard';
import { AuthService } from './auth.service';
import { UserIdDTO } from '../dtos/user-id.dto';
import { PolicyResponse } from '../dtos/policy-response';
import { OidcAuthValidationRequestDto } from '../dtos/oidc-auth-validation-request.dto';
import { getConfigValue } from '@us-epa-camd/easey-common/utilities';
import { SignInDTO } from '../dtos/signin.dto';
import { CredentialsDTO } from '../dtos/credentials.dto';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { FacilityAccessDTO } from '../dtos/permissions.dto';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Authentication')
export class AuthController {
  constructor(private service: AuthService, private readonly logger: Logger) {}

  @Post('/determinePolicy')
  @ApiOkResponse({
    type: PolicyResponse,
    description: 'Determines the users policy based the given user id',
  })
  async determinePolicy(
    @Body() credentials: CredentialsDTO,
  ): Promise<PolicyResponse> {
    return await this.service.determinePolicy(credentials.userId);
  }

  @Post('/oauth2/code')
  @ApiOkResponse({
    description:
      'Validates the given OIDC parameters and redirects the user to the ECMPS UI home page ',
  })
  async processOidcRedirect(
    @Body() oidcPostRequest: OidcAuthValidationRequestDto,
    @ClientIP() clientIp: string,
    @Res() res: Response,
  ): Promise<void> {
    console.log('oidcPostRequest is', oidcPostRequest);
    const ecmpsUiRedirectUrl = getConfigValue('ECMPS_UI_REDIRECT_URL');
    const oidcAuthValidationResponse = await this.service.validateAndCreateSession(
      oidcPostRequest,
      clientIp,
    );
    if (!oidcAuthValidationResponse || !oidcAuthValidationResponse.isValid) {
      return res.redirect(
        `${ecmpsUiRedirectUrl}?message=${oidcAuthValidationResponse.message}&code=${oidcAuthValidationResponse.code}`,
      );
    }

    return res.redirect(
      `${ecmpsUiRedirectUrl}?sessionId=${oidcAuthValidationResponse.userSession.sessionId}`,
    );
  }

  @Post('/sign-in')
  @ApiOkResponse({
    type: UserDTO,
    description: 'Authenticates a user using a previously provided sessionId',
  })
  async signIn(
    @Body() signInDto: SignInDTO,
    @ClientIP() clientIp: string,
  ): Promise<UserDTO> {
    this.logger.debug('controller: starting signIn process', { signInDto });
    return this.service.signIn(signInDto, clientIp);
  }

  @Post('/update-last-activity')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('Token')
  @ApiOkResponse({
    description: 'Refreshes a users last activity date',
  })
  async lastActivity(@AuthToken() authToken: string): Promise<void> {
    await this.service.updateLastActivity(authToken);
  }

  @Delete('/sign-out')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('Token')
  @ApiOkResponse({
    description: 'Signs a user out of the system',
  })
  async signOut(
    @Body() user: UserIdDTO,
    @AuthToken() authToken: string,
  ): Promise<void> {
    await this.service.signOut(user.userId, authToken);
  }
}
