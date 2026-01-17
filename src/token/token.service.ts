import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cacheable } from 'nestjs-cacheable';

import { UserSessionService } from '../user-session/user-session.service';
import { UserSession } from '../entities/user-session.entity';
import {
  AccessTokenResponse,
  ApiTokenResponse,
  OidcJwtPayload,
} from '../dtos/oidc-auth-dtos';
import { dateToEstString } from '@us-epa-camd/easey-common/utilities/functions';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import { Logger } from '@us-epa-camd/easey-common/logger';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { TokenDTO } from '../dtos/token.dto';
import { BypassService } from '../oidc/Bypass.service';
import { ClientTokenService } from '../client-token/client-token.service';
import { MaintenanceVerifyParamDTO } from '../dtos/maintenance-verify-param.dto';

@Injectable()
export class TokenService {
  private jwksClients = new Map<string, JwksClient>();

  //used to keep track of ongoing refreshToken executions keyed by token to prevent race conditions
  private readonly tokenRefreshPromises = new Map<string, Promise<TokenDTO>>();

  constructor(
    private configService: ConfigService,
    private readonly userSessionService: UserSessionService,
    private readonly oidcHelperService: OidcHelperService,
    private readonly bypassService: BypassService,
    private readonly logger: Logger,
    private readonly clientTokenService: ClientTokenService
  ) { }

  async refreshToken(userId: string, token: string, clientIp: string) {
    this.logger.debug('Starting refreshToken process', { userId, clientIp });

    // Check if a refresh is already in progress for this token (prevents race conditions)
    if (this.tokenRefreshPromises.has(token)) {
      this.logger.debug(
        'Refresh already in progress for this token, waiting for completion',
        { userId },
      );
      return this.tokenRefreshPromises.get(token);
    }

    // Create a promise for this refresh operation
    const refreshPromise = (async () => {
      try {
        //Grab the current session data
        let session: UserSession = await this.userSessionService.findSessionByUserIdAndToken(
          userId,
          token,
        );

        if (!session) {
          throw new EaseyException(
            new Error('Unable to refresh token, no existing session for user/token '),
            HttpStatus.BAD_REQUEST,
            { userId: userId },
          );
        }

        this.logger.debug('Retrieved user session', { sessionId: session.sessionId, });

        const sessionId = session.sessionId;

        if (this.bypassService.bypassEnabled()) {
          //Bypass Tokens
          const tokenDto = await this.bypassService.generateToken(
            session.userId,
            session.sessionId,
            clientIp,
            JSON.parse(session.roles)
          );

          //Save this in the session
          session.securityToken = tokenDto.token;
          session.idToken = '';
          session.refreshToken = '';
          session.tokenExpiration = tokenDto.expiration;
          await this.userSessionService.updateSession(session);

        } else {

          //Retrieve fresh token from the token refresh endpoint and store it in the user session
          const accessTokenResponse = await this.updateUserSessionWithNewOidcTokens(
            session,
          );
          this.logger.debug('Updated user session with newly retrieved tokens', {
            accessTokenResponse,
          });
        }

        session = await this.userSessionService.findSessionBySessionId(
          sessionId,
        ); // Get updated session

        const authToken = new TokenDTO();
        authToken.token = session.securityToken;
        authToken.expiration = session.tokenExpiration;

        return authToken;
      } finally {
        // Always clean up the token-level promise when done (success or error)
        this.tokenRefreshPromises.delete(token);
      }
    })();

    // Store the promise keyed by token
    this.tokenRefreshPromises.set(token, refreshPromise);

    // Return the promise
    return refreshPromise;
  }

  private async validateClientIp(user: CurrentUser, clientIp: string) {
    // Skip IP validation if disabled in configuration (but never in production)
    const disableIpValidation = this.configService.get<boolean>('app.disableClientIpValidation');

    if (disableIpValidation) {
      this.logger.debug('Client IP validation is disabled');
      return;
    }

    if (user.clientIp !== clientIp) {
      // CHANGED: Log IP change instead of throwing exception
      this.logger.auditLog({
        eventContext: 'TokenService',
        eventName: 'validateClientIp',
        eventOutcome: 'IP_CHANGE_DETECTED',
        eventSource: clientIp,
        userId: user.userId,
        moreInfo: {
          sessionId: user.sessionId,
          previousIp: user.clientIp,
          currentIp: clientIp,
          timestamp: new Date().toISOString()
        }
      });

  // ADDED: Update stored IP in session for future comparisons
      try {
        await this.userSessionService.updateClientIp(user.sessionId, clientIp);
        // Update user context for this request
        user.clientIp = clientIp;
      } catch (error) {
        this.logger.error('Failed to update client IP in session', `sessionId: ${user.sessionId}, error: ${error.message}`);
        // Continue processing even if update fails
      }
    }
  }

  // Cache the API token with a default TTL; adjust based on requirements
  @Cacheable({ key: 'cdxApiToken', ttl: 300 }) // TTL in seconds (e.g., 300s = 5min)
  async getCdxApiToken(): Promise<string> {
    const clientId = this.configService.get('OIDC_CLIENT_ID');
    const clientSecret = this.configService.get('OIDC_CLIENT_SECRET');
    const scope = this.configService.get('OIDC_CLIENT_CREDENTIAL_SCOPE');
    const tokenUrl = this.configService.get('OIDC_CDX_API_TOKEN_URL');

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('scope', scope);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const apiTokenResponse = await this.oidcHelperService.makePostRequestForToken<
      ApiTokenResponse
    >(tokenUrl, params);
    return apiTokenResponse.access_token;
  }

  async exchangeAuthCodeForToken(
    userSession: UserSession,
  ): Promise<AccessTokenResponse> {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', userSession.securityToken); //The securityToken at this point has the authorization code

    const accessTokenResponse = await this.makeAccessTokenRequestRestCall(
      userSession,
      params,
    );
    await this.validateAndSaveOidcTokenInUserSession(
      accessTokenResponse,
      userSession,
    );

    return accessTokenResponse;
  }

  async updateUserSessionWithNewOidcTokens(
    userSession: UserSession,
  ): Promise<AccessTokenResponse> {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', userSession.refreshToken);

    const accessTokenResponse = await this.makeAccessTokenRequestRestCall(
      userSession,
      params,
    );
    await this.validateAndSaveOidcTokenInUserSession(
      accessTokenResponse,
      userSession,
    );

    return accessTokenResponse;
  }

  private async validateAndSaveOidcTokenInUserSession(
    accessTokenResponse: AccessTokenResponse,
    userSession: UserSession,
  ) {
    //Validate the token
    if (
      !(await this.isOidcTokenValid(
        accessTokenResponse.access_token,
        userSession,
      ))
    ) {
      throw new EaseyException(
        new Error('Unable to validate access token'),
        HttpStatus.UNAUTHORIZED,
      );
    }

    const expiration = this.calculateTokenExpirationInMills(
      accessTokenResponse.expires_in,
    );
    await this.userSessionService.updateUserSessionToken(
      userSession.sessionId,
      accessTokenResponse,
      expiration,
    );
  }

  private async makeAccessTokenRequestRestCall(
    userSession: UserSession,
    params: URLSearchParams,
  ) {
    const tokenEndpoint = `${this.configService
      .get('OIDC_CDX_TOKEN_ENDPOINT')
      .replace('%s', userSession.oidcPolicy)}`;
    const clientId = this.configService.get('OIDC_CLIENT_ID');
    const clientSecret = this.configService.get('OIDC_CLIENT_SECRET');

    if (!params) {
      params = new URLSearchParams();
    }

    params.append('p', userSession.oidcPolicy);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    return await this.oidcHelperService.makePostRequestForToken<
      AccessTokenResponse
    >(tokenEndpoint, params);
  }

  calculateTokenExpirationInMills(seconds: number) {
    return dateToEstString(Date.now() + seconds * 1000);
  }

  private getJwksClient(jwksUri: string): JwksClient {
    if (!this.jwksClients.has(jwksUri)) {
      const client = new JwksClient({ jwksUri });
      this.jwksClients.set(jwksUri, client);
    }
    return this.jwksClients.get(jwksUri);
  }

  private async getKey(
    jwksUri: string,
    header: { kid: string },
  ): Promise<string> {
    const client = this.getJwksClient(jwksUri);
    const key = await client.getSigningKey(header.kid);
    return key.getPublicKey();
  }

  async isOidcTokenValid(
    authToken: string,
    userSession: UserSession,
  ): Promise<any> {
    this.logger.debug(
      'Starting OIDC token validation process (isOidcTokenValid)',
    );
    try {
      const oidcJwtPayload = jwt.decode(authToken, { complete: true }) as {
        header: any;
        payload: OidcJwtPayload;
        signature: string;
      };
      this.logger.debug('Decoded JWT payload...');

      if (!oidcJwtPayload || typeof oidcJwtPayload === 'string') {
        this.logger.debug('Invalid JWT payload or JWT payload is a string');
        return false;
      }
      //Grab the user ID to validate against
      if (!oidcJwtPayload.payload.userId) {
        this.logger.debug('Missing userId or acr in JWT payload', {
          payload: oidcJwtPayload.payload,
        });
        return false;
      }

      const policy: string = userSession.oidcPolicy;
      const jwksUri = `${this.configService
        .get('OIDC_CDX_JWKS_URI')
        .replace('%s', policy)}`;
      const clientId = this.configService.get('OIDC_CLIENT_ID');
      const tokenIssuer = this.configService.get('OIDC_CDX_TOKEN_ISSUER');
      this.logger.debug('Constructed JWKS URI', {
        jwksUri,
        clientId,
        tokenIssuer,
      });

      const publicKey = await this.getKey(jwksUri, oidcJwtPayload.header);
      const verifiedToken = jwt.verify(authToken, publicKey, {
        algorithms: ['RS256'],
        issuer: tokenIssuer,
        audience: clientId,
      });
      this.logger.debug('Verified JWT for signature.');

      if (
        !this.areAdditionalClaimsValid(verifiedToken, tokenIssuer, clientId)
      ) {
        return false;
      }
    } catch (error) {
      this.logger.error('JWT validation failed:', error);
      return false;
    }

    this.logger.debug('OIDC token validation successful');
    return true;
  }

  private areAdditionalClaimsValid(
    token: any,
    expectedIssuer: string,
    expectedAudience: string,
  ): any {
    const now = Math.floor(Date.now() / 1000);

    const clockTolerance = {
      nbf: 300,  // 5 minutes for not-before
      exp: 60    // 1 minute for expiration
    };

    if (token.exp && token.exp < (now - clockTolerance.exp)) {
      this.logger.debug(
        `Token has expired. exp: ${token.exp}, now: ${now}, exp with tolerance: ${token.exp + clockTolerance.exp}`
      );
      return false;
    }

    if (token.nbf && token.nbf > (now + clockTolerance.nbf)) {
      this.logger.debug(
        `Token cannot be used before its begin time. nbf: ${token.nbf}, now: ${now}, nbf with tolerance: ${token.nbf - clockTolerance.nbf}`
      );
      return false;
    }

    if (token.iss && token.iss !== expectedIssuer) {
      this.logger.debug('Token is not issued by the expected issuer');
      return false;
    }

    if (token.aud && token.aud !== expectedAudience) {
      this.logger.debug('Token is not issued to the correct audience');
      return false;
    }

    return true;
  }

  async validateToken(token: string, clientIp: string): Promise<any> {
    this.logger.debug('Starting token validation process', { clientIp });

    let user: CurrentUser = {
      userId: null,
      sessionId: null,
      expiration: null,
      clientIp: null,
      facilities: [],
      roles: [],
    };
    let userId: string;
    if (this.bypassService.bypassEnabled()) {
      this.logger.debug('Bypass service is enabled');
      user = await this.bypassService.extractUserFromValidatedBypassToken(
        token,
      );
      userId = user.userId;
    } else {
      const oidcJwtPayload = jwt.decode(token, { complete: true }) as {
        header: any;
        payload: OidcJwtPayload;
        signature: string;
      };
      this.logger.debug('Decoded JWT payload');

      if (!oidcJwtPayload || typeof oidcJwtPayload === 'string') {
        this.logger.debug('Invalid token format: Unable to decode token');
        throw new UnauthorizedException('Invalid or expired token. Access denied.');
      }

      userId = oidcJwtPayload.payload.userId;
    }

    // Look up facilities based on userId and token
    this.logger.debug('Looking up user session');
    const userSession = await this.userSessionService.findSessionByUserIdAndToken(
      userId,
      token,
    );

    if (!userSession) {
      this.logger.error(
        'Token validation failed: No user session found',
        `userId: ${userId}, tokenPrefix: ${token?.substring(0, 10)}, clientIp: ${clientIp}`
      );
      throw new UnauthorizedException('Invalid or expired token. Access denied.');
    }

    //populate user values
    user.userId = userSession.userId;
    user.sessionId = userSession.sessionId;
    user.expiration = userSession.tokenExpiration;
    user.clientIp = userSession.clientIp;
    user.facilities = JSON.parse(userSession.facilities);
    user.roles = JSON.parse(userSession.roles);
    this.logger.debug('Populated user values from session', { user });

    await this.validateClientIp(user, clientIp);
    this.logger.debug('Validated client IP', { clientIp });

    if (
      await this.userSessionService.isValidSessionForToken(
        user.sessionId,
        token,
        false,
      )
    ) {
      this.logger.debug('Session is valid for token', {
        sessionId: user.sessionId,
      });
      return user;
    }

    // INVESTIGATION NOTE (Issue #6939): Session token validation failed
    // This may occur when the session exists but the token is invalid or expired
    this.logger.error(
      'Token validation failed: Invalid session token',
      `userId: ${userId}, sessionId: ${user.sessionId}, tokenPrefix: ${token?.substring(0, 10)}, clientIp: ${clientIp}`
    );
    throw new UnauthorizedException('Invalid or expired token. Access denied.');
  }

  async validateMaintenance(maintenance: MaintenanceVerifyParamDTO): Promise<boolean> {
    const { appIdentifier, clientIp, authToken } = maintenance;

    // CAMPD is always allowed in TEST mode (public data access)
    if (appIdentifier === 'campd-ui') {
      return true;
    }

    // ECMPS requires user to be authenticated and in maintenance bypass list
    if (appIdentifier === 'ecmps-ui') {
      // If no auth token, deny access
      if (!authToken) {
        return false;
      }

      // Validate user token and check bypass list
      const user = await this.validateToken(authToken, clientIp);
      if (!user) {
        return false;
      }

      const maintenanceBypassUsers = this.configService.get('app.maintenanceBypassUsers');
      const userId = user.userId.toLowerCase();

      // Check if user is in bypass list (case-insensitive)
      if (maintenanceBypassUsers.some(bypassUser => bypassUser.toLowerCase() === userId)) {
        return true;
      }
    }

    return false;
  }

}
