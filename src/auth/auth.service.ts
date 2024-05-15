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
import { OidcAuthValidationRequestDto } from '../dtos/oidc-auth-validation-request.dto';
import { OidcAuthValidationResponseDto } from '../dtos/oidc-auth-validation-response.dto';
import { SignInDTO } from '../dtos/signin.dto';
import * as jwt from 'jsonwebtoken';
import { OidcJwtPayload, OrganizationResponse } from '../dtos/oidc-auth-dtos';
import { dateToEstString } from '@us-epa-camd/easey-common/utilities/functions';
import { getConfigValue } from '@us-epa-camd/easey-common/utilities';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { BypassService } from '../oidc/Bypass.service';
import { UserSession } from '../entities/user-session.entity';

interface OrgEmailAndId {
  email: string;
  userOrgId: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: Logger,
    private readonly tokenService: TokenService,
    private readonly permissionsService: PermissionsService,
    private readonly userSessionService: UserSessionService,
    private readonly oidcHelperService: OidcHelperService,
    private readonly bypassService: BypassService,
  ) {}

  async determinePolicy(userId: string): Promise<PolicyResponse> {
    if (this.bypassService.bypassEnabled()) {
      const policyResponse = new PolicyResponse({
        policy: '_BYPASS',
        userId: userId,
      });
      return policyResponse;
    }

    try {
      //Get the Api Token to use as bearer Token in the determinePolicy call
      const apiToken = await this.tokenService.getCdxApiToken();

      //Make the determinePolicyCall
      return await this.oidcHelperService.determinePolicy(userId, apiToken);
    } catch (error) {
      this.logger.error('error determining user policy: ', error.message);

      // Check if the error is due to the specific condition of an invalid user ID
      if (
        error.response &&
        error.response.data &&
        error.response.data.code === 'E_WRONG_USER_ID'
      ) {
        // This is an expected use case. Instead of throwing, return a new PolicyResponse with code and message
        return new PolicyResponse({
          code: error.response.data.code,
          message:
            "You must have a CDX account to use ECMPS. Please check if the CDX User ID you typed in is correct and try again. If you do not have a CDX account, please use the 'create an account' link to register an account on CDX.",
        });
      }

      throw new Error(error);
    }
  }

  async validateAndCreateSession(
    oidcAuthValidationRequest: OidcAuthValidationRequestDto,
    clientIp: string,
  ): Promise<OidcAuthValidationResponseDto> {
    let oidcAuthValidationResponse = new OidcAuthValidationResponseDto({
      isValid: false,
    });

    try {
      oidcAuthValidationResponse = await this.oidcHelperService.validateOidcPostRequest(
        oidcAuthValidationRequest,
      );
      if (!oidcAuthValidationResponse.isValid) {
        return oidcAuthValidationResponse;
      }

      oidcAuthValidationResponse.userId = oidcAuthValidationResponse.userId.toLowerCase();
      const userId = oidcAuthValidationResponse.userId;
      let userSession = await this.userSessionService.findSessionByUserId(
        userId,
      );
      if (userSession) {
        await this.userSessionService.removeUserSessionByUserId(userId);
      }

      //Create the userSession and save the auth code in the security_token temporarily.
      //SignIn method will exchange it for a valid token
      userSession = await this.userSessionService.createUserSession(
        userId,
        oidcAuthValidationRequest.code,
        oidcAuthValidationResponse.policy,
        clientIp,
      );
      oidcAuthValidationResponse.userSession = userSession;
    } catch (error) {
      this.logger.error('Error exchanging code for tokens:', error);
      oidcAuthValidationResponse = new OidcAuthValidationResponseDto({
        isValid: false,
        code: 'ERROR_TOKEN_PROCESSING',
        message: error.message,
      });
    }

    return oidcAuthValidationResponse;
  }

  async signIn(signInDto: SignInDTO, clientIp: string): Promise<UserDTO> {
    let userDto: UserDTO;
    let session: UserSession;
    try {

      const apiToken = await this.tokenService.getCdxApiToken(); //For api calls
      if (this.bypassService.bypassEnabled()) {
        //For bypass, sessionId has the userID
        userDto = this.bypassService.getBypassUser(signInDto.sessionId);

        //Create a new user session for the first for bypass users
        session = await this.userSessionService.createUserSession(
          signInDto.sessionId,
          ' ',
          '_BYPASS',
          clientIp,
        );
        signInDto.sessionId = session.sessionId;

        //Bypass Tokens
        const tokenDto = await this.bypassService.generateToken(session.userId, session.sessionId, clientIp, userDto.roles);
        userDto.token = tokenDto.token;
        userDto.tokenExpiration = tokenDto.expiration;
        //No corresponding idToken and refreshToken for bypass tokens
        userDto.idToken = '';
        userDto.refreshToken = '';
      } else {
        //Check for a valid session that should have been created with validateAndCreateSession() call
        session = await this.userSessionService.findSessionBySessionId(signInDto.sessionId,);
        if (!session) {
          throw new EaseyException(
            new Error(
              'Unable to sign-in user. No session record exists for the given session ID.',
            ),
            HttpStatus.BAD_REQUEST,
          );
        }

        //Exchange the code for a valid token from Azure AD
        const accessTokenResponse = await this.tokenService.exchangeAuthCodeForToken(
          session,
        );
        //Get the updated session information here (after code is exchanged for token)
        session = await this.userSessionService.findSessionBySessionId(
          signInDto.sessionId,
        );

        //Decode and retrieve the claims from the token
        const decoded = jwt.decode(accessTokenResponse.access_token, {
          complete: true,
        });
        if (!decoded || !decoded.payload) {
          throw new Error('Invalid token: Unable to decode access token.');
        }
        const oidcJwtPayload = decoded as {
          header: any;
          payload: OidcJwtPayload;
          signature: string;
        };
        userDto = new UserDTO();
        userDto.userId = oidcJwtPayload.payload.userId;
        userDto.firstName = oidcJwtPayload.payload.given_name;
        userDto.lastName = oidcJwtPayload.payload.family_name;
        userDto.token = accessTokenResponse.access_token;
        userDto.idToken = accessTokenResponse.id_token;
        userDto.refreshToken = accessTokenResponse.refresh_token;
        // Set the token expiration. This was previously calculated from an ENV value.
        // Now, we calculate based on token response value. expires_in is in seconds
        userDto.tokenExpiration = this.tokenService.calculateTokenExpirationInMills(
          accessTokenResponse.expires_in,
        );

        //Retrieve email and roles
        const orgResponse = await this.getUserEmail(userDto.userId, apiToken);
        userDto.email = orgResponse.email;
        userDto.roles = await this.permissionsService.retrieveAllUserRoles(
          userDto.userId,
          apiToken,
        );
      }

      //Retrieve the list of facilities.
      const facilities = await this.permissionsService.retrieveAllUserFacilities(
        userDto.userId,
        userDto.roles,
        apiToken,
        clientIp,
      );
      userDto.facilities = facilities;

      session.securityToken = userDto.token;
      session.idToken = userDto.idToken;
      session.refreshToken = userDto.refreshToken;
      session.tokenExpiration = userDto.tokenExpiration;
      session.roles = JSON.stringify(userDto.roles);
      session.facilities = JSON.stringify(facilities);

      //Update the session with user and facility information
      await this.userSessionService.updateSession(session);

      return userDto;
    } catch (error) {
      this.logger.error('Unable to get log user in. ', error);
      throw new EaseyException(new Error(`Unable to sign in user: ${error.message}`), HttpStatus.BAD_REQUEST);
    }
  }

  async getUserEmail(
    userId: string,
    token: string,
  ): Promise<OrganizationResponse> {
    const registerApiUrl = getConfigValue('OIDC_REST_API_BASE');
    const apiUrl = `${registerApiUrl}/api/v1/registration/retrievePrimaryOrganization/${userId}`;

    try {
      return await this.oidcHelperService.makeGetRequest<OrganizationResponse>(
        apiUrl,
        token,
        null,
      );
    } catch (error) {
      this.logger.error('Unable to get user email. ', apiUrl, error);
      throw new EaseyException(error, HttpStatus.BAD_REQUEST);
    }
  }

  async updateLastActivity(token: string): Promise<void> {
    await this.userSessionService.refreshLastActivity(token);
  }

  async signOut(userId: string, token: string): Promise<void> {
    await this.userSessionService.findSessionByUserIdAndToken(userId, token);
    await this.userSessionService.removeUserSessionByUserId(userId);
  }
}
