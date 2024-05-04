import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cacheable } from 'nestjs-cacheable';

import { UserSessionService } from '../user-session/user-session.service';
import { UserSession } from '../entities/user-session.entity';
import { AccessTokenResponse, ApiTokenResponse, OidcJwtPayload } from '../dtos/oidc-auth-dtos';
import { dateToEstString } from '@us-epa-camd/easey-common/utilities/functions';
import { PermissionsService } from '../permissions/Permissions.service';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import { Logger } from '@us-epa-camd/easey-common/logger';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { TokenDTO } from '../dtos/token.dto';
import { BypassService } from '../auth/bypass.service';

@Injectable()
export class TokenService {

  private jwksClients = new Map<string, JwksClient>();

  constructor(
    private configService: ConfigService,
    private readonly userSessionService: UserSessionService,
    private readonly permissionsService: PermissionsService,
    private readonly oidcHelperService: OidcHelperService,
    private readonly bypassService: BypassService,
    private readonly logger: Logger,
  ) {}

  async refreshToken(userId: string, token: string, clientIp: string) {

    //Grab the current session data
    let session: UserSession = await this.userSessionService.findSessionByUserIdAndToken(
      userId,
      token,
    );

    //Retrieve fresh token from the token refresh endpoint
    const accessTokenResponse = await this.newTokens(session);
    //Get the updated session information from the database (updated by retrieveRefreshTokenCall)
    session = await this.userSessionService.findSessionBySessionId(session.sessionId);

    const authToken = new TokenDTO();
    authToken.token = accessTokenResponse.access_token;
    authToken.expiration = session.tokenExpiration;

    return authToken;
  }

  async validateClientIp(user: CurrentUser, clientIp: string) {
    if (user.clientIp !== clientIp) {
      throw new EaseyException(
        new Error('Request coming from invalid IP address'),
        HttpStatus.BAD_REQUEST,
        { userId: user.userId, clientIp: clientIp },
      );
    }
  }

  // Cache the API token with a default TTL; adjust based on requirements
  @Cacheable({ key: 'cdxApiToken', ttl: 300 }) // TTL in seconds (e.g., 300s = 5min)
  async getCdxApiToken(): Promise<string> {
    const clientId = this.configService.get('OIDC_CLIENT_ID');
    const clientSecret = this.configService.get('OIDC_CLIENT_SECRET');
    const scope = `${this.configService.get('OIDC_CREDENTIAL_SCOPE').replace('%s', clientId)}`;
    const tokenUrl = this.configService.get('OIDC_CDX_API_TOKEN_URL');

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('scope', scope);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const apiTokenResponse = await this.oidcHelperService.makePostRequestForToken<ApiTokenResponse>(tokenUrl, params);
    return apiTokenResponse.access_token;
  }

  async exchangeAuthCodeForToken(userSession: UserSession): Promise<AccessTokenResponse> {

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', userSession.securityToken);  //The securityToken at this point has the authorization code

    const accessTokenResponse = await this.makeAccessTokenRequestRestCall(userSession, params);
    await this.validateAndSaveTokenInUserSession(accessTokenResponse, userSession);

    return accessTokenResponse;
  }

  async newTokens(userSession: UserSession): Promise<AccessTokenResponse> {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', userSession.refreshToken);

    const accessTokenResponse = await this.makeAccessTokenRequestRestCall(userSession, params);
    await this.validateAndSaveTokenInUserSession(accessTokenResponse, userSession);

    return accessTokenResponse;
  }

  private async validateAndSaveTokenInUserSession(accessTokenResponse: AccessTokenResponse, userSession: UserSession) {
    //Validate the token
    if (!await this.isTokenValid(accessTokenResponse.access_token)) {
      throw new EaseyException(new Error('Unable to validate access token'), HttpStatus.UNAUTHORIZED);
    }

    const expiration = dateToEstString(
      Date.now() +
      this.configService.get<number>('app.tokenExpirationDurationMinutes') *
      60000,
    );

    await this.userSessionService.updateUserSessionToken(
      userSession.sessionId,
      accessTokenResponse,
      expiration,
    );
  }

  private async makeAccessTokenRequestRestCall(userSession: UserSession, params: URLSearchParams) {
    const tokenEndpoint = `${this.configService.get('OIDC_CDX_TOKEN_ENDPOINT').replace('%s', userSession.oidcPolicy)}`;
    const clientId = this.configService.get('OIDC_CLIENT_ID');
    const clientSecret = this.configService.get('OIDC_CLIENT_SECRET');

    if (!params) {
      params = new URLSearchParams();
    }

    params.append('p', userSession.oidcPolicy);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    return await this.oidcHelperService.makePostRequestForToken<AccessTokenResponse>(tokenEndpoint, params);
  }

  private getJwksClient(jwksUri: string): JwksClient {
    if (!this.jwksClients.has(jwksUri)) {
      const client = new JwksClient({ jwksUri });
      this.jwksClients.set(jwksUri, client);
    }
    return this.jwksClients.get(jwksUri);
  }

  private async getKey(jwksUri: string, header): Promise<string> {
    const client = this.getJwksClient(jwksUri);
    const key = await client.getSigningKey(header.kid);
    return key.getPublicKey();
  }

  async isTokenValid(authToken: string): Promise<any> {

    try {
      const oidcJwtPayload = jwt.decode(authToken, { complete: true }) as { header: any, payload: OidcJwtPayload, signature: string };
      if (!oidcJwtPayload || typeof oidcJwtPayload === 'string') {
        return false;
      }
      //Grab the user ID to validate against
      if (!oidcJwtPayload.payload.userId || !oidcJwtPayload.payload.acr) {
        return false;
      }

      const policy: string = oidcJwtPayload.payload.acr;
      const jwksUri = `${this.configService.get('OIDC_CDX_JWKS_URI').replace('%s', policy)}`;
      const clientId = this.configService.get('OIDC_CLIENT_ID');
      const tokenIssuer = this.configService.get('OIDC_CDX_TOKEN_ISSUER');

      const publicKey = await this.getKey(jwksUri, oidcJwtPayload.header);
      const verifiedToken = jwt.verify(authToken, publicKey, {
        algorithms: ['RS256'],
        issuer: tokenIssuer,
        audience: clientId
      });

      if (!this.areAdditionalClaimsValid(verifiedToken, tokenIssuer, clientId) ) {
        return false;
      }

    } catch (error) {
      this.logger.error('JWT validation failed:', error);
      return false;
    }

    return true;
  }

  private areAdditionalClaimsValid(token: any, expectedIssuer: string, expectedAudience: string): any {
    const now = Math.floor(Date.now() / 1000);
    if (token.exp && token.exp < now) {
      return false;
    }

    if (token.nbf && token.nbf > now) {
      return false;
    }

    if (token.iss && token.iss !== expectedIssuer) {
      return false;
    }

    if (token.aud && token.aud !== expectedAudience) {
      return false;
    }

    return true;
    // Add any additional claim validations here
  }

  async validateToken(token: string, clientIp: string): Promise<any> {

    if (! await this.isTokenValid(token)) {
      return false;
    }

    const oidcJwtPayload = jwt.decode(token, { complete: true }) as { header: any, payload: OidcJwtPayload, signature: string };
    const userId = oidcJwtPayload.payload.userId;

    // Look up facilities based on userId and token
    const userSession = await this.userSessionService.findSessionByUserIdAndToken(
      userId,
      token,
    );

    if (!userSession) {
      return false;
    }

    const user: CurrentUser = {
      userId: null,
      sessionId: null,
      expiration: null,
      clientIp: null,
      facilities: [],
      roles: [],
    };

    //populate user values
    user.userId = userSession.userId;
    user.sessionId = userSession.sessionId;
    user.expiration = userSession.tokenExpiration
    //user.clientIp = userSession
    user.facilities = JSON.parse(userSession.facilities);
    user.roles = await this.permissionsService.retrieveAllUserRoles( userSession.userId, await this.getCdxApiToken() );

    //await this.validateClientIp(user, clientIp);

    if (
      await this.userSessionService.isValidSessionForToken(
        user.sessionId,
        token,
        false,
      )
    ) {
      return user;
    }

    return false;
  }
}
