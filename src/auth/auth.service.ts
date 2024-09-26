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
import { getConfigValue } from '@us-epa-camd/easey-common/utilities';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { BypassService } from '../oidc/Bypass.service';
import { UserSession } from '../entities/user-session.entity';
import { LoginStateDTO } from '../dtos/login.state.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: Logger,
    private readonly tokenService: TokenService,
    private readonly permissionsService: PermissionsService,
    private readonly userSessionService: UserSessionService,
    private readonly oidcHelperService: OidcHelperService,
    private readonly bypassService: BypassService,
    private configService: ConfigService,
  ) {}

  async determinePolicy(userId: string): Promise<PolicyResponse> {
    this.logger.debug('Starting determinePolicy', { userId });

    userId = userId ? userId.toUpperCase() : userId;
    if (this.bypassService.bypassEnabled()) {
      const policyResponse = new PolicyResponse({
        policy: '_BYPASS',
        userId: userId,
      });

      this.logger.debug(
        'Bypass service is enabled, returning bypass policy response',
        { policyResponse },
      );
      return policyResponse;
    }

    try {
      //Get the Api Token to use as bearer Token in the determinePolicy call
      const apiToken = await this.tokenService.getCdxApiToken();
      this.logger.debug('Retrieved API token for policy calls ');

      //Make the determinePolicyCall
      const policyResponse = await this.oidcHelperService.determinePolicy(
        userId,
        apiToken,
      );
      this.logger.debug('Received policy response', { policyResponse });

      //If this is a sign-in flow, log the user out of B2C to avoid any
      //session conflict during the sign-in process.
      if (policyResponse.policy.includes('_SIGNIN')) {
        await this.oidcHelperService.terminateOidcSession(policyResponse.policy, apiToken);
      }

      return policyResponse;
    } catch (error) {
      this.logger.error('error determining user policy: ', error.message);

      // Check if the error is due to the specific condition of an invalid user ID
      if (
        error.response &&
        error.response.data &&
        error.response.data.code === 'E_WRONG_USER_ID'
      ) {
        this.logger.warn('Invalid user ID provided', {
          userId,
          code: error.response.data.code,
        });

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
      this.logger.debug('Starting OIDC (/oauth2/code) validation process', {
        oidcAuthValidationRequest,
        clientIp,
      });

      oidcAuthValidationResponse = await this.oidcHelperService.validateOidcPostRequest(
        oidcAuthValidationRequest,
      );
      this.logger.debug('OIDC post request validation result', {
        code: oidcAuthValidationResponse.isValid,
        policy: oidcAuthValidationResponse.policy,
      });

      if (!oidcAuthValidationResponse.isValid) {
        return oidcAuthValidationResponse;
      }

      oidcAuthValidationResponse.userId = oidcAuthValidationResponse.userId.toUpperCase();
      const userId = oidcAuthValidationResponse.userId;
      let userSession = await this.userSessionService.findSessionByUserId(
        userId,
      );
      if (userSession) {
        await this.userSessionService.removeUserSessionByUserId(userId);
        this.logger.debug('Removed existing user session', { userId });
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
      this.logger.debug('Created new user session. Validation successful.', {
        userSession,
      });
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
      this.logger.debug('service: starting signIn process', {
        signInDto,
        clientIp,
      });

      if (this.bypassService.bypassEnabled()) {
        this.logger.debug('Bypass is enabled');
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

        this.logger.debug('Created new user session for bypass user', {
          session,
        });

        //Bypass Tokens
        const tokenDto = await this.bypassService.generateToken(
          session.userId,
          session.sessionId,
          clientIp,
          userDto.roles,
        );
        userDto.token = tokenDto.token;
        userDto.tokenExpiration = tokenDto.expiration;
        //No corresponding idToken and refreshToken for bypass tokens
        userDto.idToken = '';
        userDto.refreshToken = '';

        //Save this in the session
        session.securityToken = userDto.token;
        session.idToken = userDto.idToken;
        session.refreshToken = userDto.refreshToken;
        session.tokenExpiration = userDto.tokenExpiration;
        await this.userSessionService.updateSession(session);
      } else {
        //Check for a valid session that should have been created with validateAndCreateSession() call
        session = await this.userSessionService.findSessionBySessionId(
          signInDto.sessionId,
        );
        if (!session) {
          throw new EaseyException(
            new Error(
              'Unable to sign-in user. No session record exists for the given session ID.',
            ),
            HttpStatus.BAD_REQUEST,
          );
        }

        this.logger.debug('Found existing session', { session });
        //Exchange the code for a valid token from Azure AD
        const accessTokenResponse = await this.tokenService.exchangeAuthCodeForToken(
          session,
        );
        this.logger.debug(
          `Exchanged auth code for token, access token expires in ${accessTokenResponse.expires_in /
            60} minutes`,
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
          this.logger.error('Invalid token: Unable to decode access token');
          throw new Error('Invalid token: Unable to decode access token.');
        }

        this.logger.debug('Decoded access token');
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
        this.logger.debug(
          'Extracted user information from decoded token and created user object',
          { userDto },
        );

        //Retrieve email and roles
        const apiToken = await this.tokenService.getCdxApiToken(); //For api calls
        const orgResponse = await this.getUserEmail(userDto.userId, apiToken);
        userDto.email = orgResponse.email;
        this.logger.debug('Retrieved user email', { email: userDto.email });

        // At this point, it is important to save the session in the database. Otherwise,
        // the subsequent calls that go to other APIs (CBS) will call back here to auth API to validate the token.
        // If session information is not in the database with valid token info, the validation will fail.
        session.securityToken = userDto.token;
        session.idToken = userDto.idToken;
        session.refreshToken = userDto.refreshToken;
        session.tokenExpiration = userDto.tokenExpiration;
        await this.userSessionService.updateSession(session);

        userDto.roles = await this.permissionsService.retrieveAllUserRoles(
          userDto.userId,
          apiToken,
        );
        this.logger.debug('Retrieved user roles', { roles: userDto.roles });
        this.logger.debug(
          `Retrieved user roles, number of roles: ${
            userDto.roles ? userDto.roles.length : 0
          }`,
        );
      }

      //Retrieve the list of facilities.
      const facilities = await this.permissionsService.retrieveAllUserFacilities(
        userDto.userId,
        userDto.roles,
        userDto.token,
        clientIp,
      );
      //check if the user has any unsigned cert statements
      if (facilities.missingCertificationStatements) {
        this.logger.error('Login Error: User has unsigned certificate statements');
        //if the user has unsigned cert statements, we need to fail the login

        if (!this.bypassService.bypassEnabled()) {
          //terminate OIDC session
          const apiToken = await this.tokenService.getCdxApiToken();
          await this.oidcHelperService.terminateOidcSession(session.oidcPolicy, apiToken);
        }
      
        //throw and display to error message
        throw new EaseyException( 
          new Error(`You have not signed all of the necessary certification statements which are associated with your responsibilities as a representative or agent. Until these certification statements have been signed, you will not be able to log in to ECMPS. Please use the CAMD Business System to sign all of your required certification statements.`),
          HttpStatus.FORBIDDEN,
        );
      };

      userDto.facilities = facilities;
      this.logger.debug('Retrieved user facilities', { facilities });
      this.logger.debug(
        `Retrieved user facilities, number of facilities: ${
          userDto.facilities.plantList ? userDto.facilities.plantList.length : 0
        }`,
      );

      session.roles = JSON.stringify(userDto.roles);
      session.facilities = JSON.stringify(facilities);

      //Update the session with user and facility information
      await this.userSessionService.updateSession(session);
      this.logger.debug(
        'Updated user session with token, roles, facilities, etc. User and session creation completed.',
        { session },
      );

      return userDto;
    } catch (error) {
      this.logger.error('Login Error: ', error);
      throw new EaseyException( new Error(`Login Error: ${error.message}`), HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getUserEmail(
    userId: string,
    token: string,
  ): Promise<OrganizationResponse> {
    this.logger.debug('Starting getUserEmail', { userId });
    const registerApiUrl = getConfigValue('OIDC_REST_API_BASE');
    const apiUrl = `${registerApiUrl}/api/v1/registration/retrievePrimaryOrganization/${this.oidcHelperService.safeEncodeURIComponent(userId)}`;

    try {
      return await this.oidcHelperService.makeGetRequest<OrganizationResponse>(
        apiUrl,
        token,
        null,
      );
    } catch (error) {
      this.logger.error(
        `Unable to get user email. URL: ${apiUrl}, Error: ${error.message}, Stack: ${error.stack}`,
      );
      throw new EaseyException(error, HttpStatus.BAD_REQUEST);
    }
  }

  async updateLastActivity(token: string): Promise<void> {
    await this.userSessionService.refreshLastActivity(token);
  }

  async signOut(userId: string, token: string): Promise<void> {
    this.logger.debug('signOut, signing user out: ', userId);
    const session: UserSession = await this.userSessionService.findSessionByUserIdAndToken(userId, token);

    //sign the user out with the OIDC provider
    if (session && session.oidcPolicy && !this.bypassService.bypassEnabled() ) {
      this.logger.debug('signOut, signing user out from OIDC provider: ', userId);
      const apiToken = await this.tokenService.getCdxApiToken();
      await this.oidcHelperService.terminateOidcSession(session.oidcPolicy, apiToken);
    }

    await this.userSessionService.removeUserSessionByUserId(userId);
  }

  async getLoginState(): Promise<LoginStateDTO> {
    const loginState= new LoginStateDTO();
    loginState.isDisabled = this.configService.get<boolean>('app.disableLogin');
    return loginState;
  }

}
