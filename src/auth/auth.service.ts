import { createClientAsync } from 'soap';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@us-epa-camd/easey-common/logger';

import { UserDTO } from '../dtos/user.dto';
import { TokenService } from '../token/token.service';
import { UserSessionService } from '../user-session/user-session.service';
import { PermissionsService } from '../permissions/Permissions.service';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import { PolicyResponse } from '../dtos/policy-response';
import { OidcPostRequestDto } from '../dtos/oidc-post.request.dto';
import { OidcPostResponse } from '../dtos/oidc-post-response.dto';
import { SignInDTO } from '../dtos/signin.dto';
import * as jwt from 'jsonwebtoken';
import { OidcJwtPayload, OrganizationResponse } from '../dtos/oidc-auth-dtos';
import { dateToEstString } from '@us-epa-camd/easey-common/utilities/functions';
import { getConfigValue } from '@us-epa-camd/easey-common/utilities';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { BypassService } from './bypass.service';

interface OrgEmailAndId {
  email: string;
  userOrgId: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly permissionsService: PermissionsService,
    private readonly userSessionService: UserSessionService,
    private readonly oidcHelperService: OidcHelperService,
    private readonly bypassService: BypassService,
  ) {}

  async determinePolicy(userId: string): Promise<PolicyResponse> {

    try {

      /*let user: UserDTO;
      if (this.bypassService.bypassEnabled()) {
        user = this.bypassService.getBypassUser(userId);
      }*/

      //Get the Api Token to use as bearer Token in the determinePolicy call
      const apiToken = await this.tokenService.getCdxApiToken();

      //Make the determinePolicyCall
      return await this.oidcHelperService.determinePolicy(userId, apiToken);
    } catch (error) {
      this.logger.error("error calling REST service: ", error.message);

      // Check if the error is due to the specific condition of an invalid user ID
      if (error.response && error.response.data && error.response.data.code === 'E_WRONG_USER_ID') {
        // This is an expected use case. Instead of throwing, return a new PolicyResponse with code and message
        return new PolicyResponse({
          code: error.response.data.code,
          message: "You must have a CDX account to use ECMPS. Please check if the CDX User ID you typed in is correct and try again. If you do not have a CDX account, please use the 'create an account' link to register an account on CDX."
        });
      }

      throw new Error(error);
    }

  }

  async validateAndCreateSession(
    oidcPostDto: OidcPostRequestDto,
  ): Promise<OidcPostResponse> {

    let oidcPostResponse: OidcPostResponse = new OidcPostResponse({
      isValid: true
    });

    try {
      oidcPostResponse = await this.oidcHelperService.validateOidcPostRequest(oidcPostDto);
      if (! oidcPostResponse.isValid) {
        return oidcPostResponse;
      }

      oidcPostResponse.userId = oidcPostResponse.userId.toLowerCase();
      const userId = oidcPostResponse.userId;
      let userSession = await this.userSessionService.findSessionByUserId(userId);
      if (userSession) {
        await this.userSessionService.removeUserSessionByUserId(userId);
      }
      userSession = await this.userSessionService.createUserSession(userId, oidcPostResponse.policy);

      //We are storing the auth code in the token field for now. When ECMPS UI sends
      //the session ID back for signing in, we will exchange it for a valid token
      userSession.securityToken = oidcPostDto.code;

      //Update session
      await this.userSessionService.updateSession(userSession);
      oidcPostResponse.userSession = userSession;

    } catch (error) {
      this.logger.error('Error exchanging code for tokens:', error);
      oidcPostResponse = new OidcPostResponse({
        isValid: false,
        code: "ERROR_TOKEN_PROCESSING",
        message: error.message
      });
    }

    return oidcPostResponse;
  }

  async signIn(
    signInDto: SignInDTO,
    clientIp: string
  ): Promise<UserDTO> {

    let session = await this.userSessionService.findSessionBySessionId(signInDto.sessionId);
    if (!session) {
      throw new EaseyException(new Error('Unable to sign-in user. No session record exists for the given session ID.'), HttpStatus.BAD_REQUEST);
    }

    //Exchange the code for a valid token from Azure AD
    const accessTokenResponse = await this.tokenService.exchangeAuthCodeForToken(session);
    //Get the updated session information here (after code is exchanged for token)
    session = await this.userSessionService.findSessionBySessionId(signInDto.sessionId);

    //Decode and retrieve the claims from the token
    const oidcJwtPayload = jwt.decode(accessTokenResponse.access_token, { complete: true }) as { header: any, payload: OidcJwtPayload, signature: string };
    const userDto = new UserDTO();
    userDto.userId = oidcJwtPayload.payload.userId;
    userDto.firstName = oidcJwtPayload.payload.given_name;
    userDto.lastName = oidcJwtPayload.payload.family_name;
    userDto.token = accessTokenResponse.access_token
    // Set the token expiration. This was previously calculated from an ENV value.
    // Now, we calculate based on token response value. expires_in is in seconds
    userDto.tokenExpiration = dateToEstString(Date.now() + accessTokenResponse.expires_in * 1000,);

    //Retrieve email
    const apiToken = await this.tokenService.getCdxApiToken();
    const orgResponse = await this.getUserEmail(userDto.userId, apiToken);
    userDto.email = orgResponse.email;
    userDto.roles = await this.permissionsService.retrieveAllUserRoles(userDto.userId, apiToken);

    //Retrieve the list of facilities.
    const facilities =
      await this.permissionsService.retrieveAllUserFacilities(
        userDto.userId,
        userDto.roles,
        apiToken,
        clientIp,
      );
    session.facilities = JSON.stringify(facilities);
    userDto.facilities = facilities;

    //Update the session with user and facility information
    await this.userSessionService.updateSession(session);

    return userDto;
  }

  async getUserEmail(userId: string, token: string): Promise<OrganizationResponse> {
    const registerApiUrl = getConfigValue('OIDC_REST_API_BASE');
    const apiUrl = `${registerApiUrl}/api/v1/registration/retrievePrimaryOrganization/${userId}`;

    try {
      return await this.oidcHelperService.makeGetRequest<OrganizationResponse>(apiUrl, token, null);
    } catch (error) {
      this.logger.error('Failed to make GET request to ', apiUrl, error);
      throw new EaseyException(error, HttpStatus.BAD_REQUEST);
    }
  }

  //OLD

  async getStreamlinedRegistrationToken(userId: string): Promise<string> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/StreamlinedRegistrationService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.AuthenticateAsync({
          userId: this.configService.get<string>('app.naasAppId'),
          credential: this.configService.get<string>('app.nassAppPwd'),
        });
      })
      .then(res => {
        return res[0].securityToken;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new EaseyException(
            new Error(JSON.stringify(err.root.Envelope)),
            HttpStatus.BAD_REQUEST,
            { userId: userId },
          );
        }

        throw new EaseyException(new Error(err), HttpStatus.BAD_REQUEST, {
          userId: userId,
        });
      });
  }

  async updateLastActivity(token: string): Promise<void> {
    await this.userSessionService.refreshLastActivity(token);
  }

  async signOut(userId: string, token: string): Promise<void> {
    await this.userSessionService.findSessionByUserIdAndToken(userId, token);
    await this.userSessionService.removeUserSessionByUserId(userId);
  }
}
