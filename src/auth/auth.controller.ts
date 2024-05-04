import { Body, Controller, Delete, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { Response } from 'express';

import { UserDTO } from '../dtos/user.dto';
import { ClientIP } from '../decorators/client-ip.decorator';
import { AuthToken } from '../decorators/auth-token.decorator';
import { AuthGuard } from '../guards/auth.guard';
import { AuthService } from './auth.service';
import { UserIdDTO } from '../dtos/user-id.dto';
import { PolicyResponse } from '../dtos/policy-response';
import { CredentialsOidcDTO } from '../dtos/credentialsOidc.dto';
import { OidcPostRequestDto } from '../dtos/oidc-post.request.dto';
import { getConfigValue } from '@us-epa-camd/easey-common/utilities';
import { SignInDTO } from '../dtos/signin.dto';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Authentication')
export class AuthController {
  constructor(private service: AuthService) {}

  @Post('/determinePolicy')
  @ApiOkResponse({
    type: PolicyResponse,
    description: 'Determines the users policy based a given user id',
  })
  async determinePolicy(
    @Body() credentials: CredentialsOidcDTO,
    @ClientIP() clientIp: string,
  ): Promise<PolicyResponse> {

    return this.service.determinePolicy(
      credentials.userId
    );
  }

  @Post('/oauth2/code')
  @ApiOkResponse({
    description: 'Validates the OIDC parameters and redirect the user to the ECMPS UI home page ',
  })
  async processOidcRedirect(
      @Req() req: Request,
      @Body() oidcPostRequest: OidcPostRequestDto,
      @Res() res: Response,
  ): Promise<void> {

    console.log('oidcPostRequest is', oidcPostRequest);
    const ecmpsUiRedirectUrl = getConfigValue('ECMPS_UI_REDIRECT_URL');
    const oidcPostResponse = await this.service.validateAndCreateSession(oidcPostRequest);
    if (!oidcPostResponse || !oidcPostResponse.isValid) {
      return res.redirect(`${ecmpsUiRedirectUrl}?message=${oidcPostResponse.message}&code=${oidcPostResponse.code}`);
    }

    return res.redirect(`${ecmpsUiRedirectUrl}?sessionId=${oidcPostResponse.userSession.sessionId}`);
  }

  @Post('/sign-in')
  @ApiOkResponse({
    type: SignInDTO,
    description: 'Authenticates a user using a previously provided sessionId',
  })
  async signIn(
    @Body() signInDto: SignInDTO,
    @ClientIP() clientIp: string,
  ): Promise<UserDTO> {
    return this.service.signIn(
      signInDto,
      clientIp,
    );
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
