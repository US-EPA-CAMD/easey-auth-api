import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { getConfigValue } from '@us-epa-camd/easey-common/utilities';
import { Logger } from '@us-epa-camd/easey-common/logger';
import * as FormData from 'form-data';
import { PolicyResponse } from '../dtos/policy-response';
import * as crypto from 'crypto';
import { OidcAuthValidationRequestDto } from '../dtos/oidc-auth-validation-request.dto';
import { OidcAuthValidationResponseDto } from '../dtos/oidc-auth-validation-response.dto';
import { OrganizationResponse, RetrieveUsersResponse } from '../dtos/oidc-auth-dtos';
import { SignatureRequest } from '../dtos/certification-sign-param.dto';

@Injectable()
export class OidcHelperService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  async determinePolicy(
    userId: string,
    apiToken: string,
  ): Promise<PolicyResponse> {
    //Prepare request body, ai url etc.
    const requestBody = {
      userId: this.safeEncodeURIComponent( userId),
    };
    const registerApiUrl = getConfigValue('OIDC_REST_API_BASE', '');
    const apiUrl = `${registerApiUrl}/api/v1/oidcEnrichment/determinePolicy`;

    //Make the api call to determine policy
    const response = await firstValueFrom(
      this.httpService.post(apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
      }),
    );

    this.logger.debug(
      '/oidcEnrichment/determinePolicy response data:\n',
      response.data,
    );

    //Prepare data to be returned to the frontend as a PolicyResponse object
    return await this.createPolicyResponse(response.data, userId, apiToken);
  }

  private async createPolicyResponse(
    response: any,
    userId: string,
    apiToken: string,
  ): Promise<PolicyResponse> {
    let policyResponse: PolicyResponse;

    if ('policy' in response) {
      // Initial setup for PolicyResponse
      policyResponse = new PolicyResponse({
        policy: response.policy,
        userId: userId,
      });

      if (response.policy.includes('_SIGNIN')) {
        policyResponse.userRoleId = await this.getUserRoleId(userId, apiToken);
        const { nonce, state } = await this.generateNonceAndState(
          userId,
          response.policy,
        );
        policyResponse.nonce = nonce;
        policyResponse.state = state;
      }

      // Set the redirectUri part of the response here directly
      policyResponse.redirectUri = getConfigValue('OIDC_AUTH_API_REDIRECT_URI');
    } else if ('code' in response) {
      // Case with error code and message
      policyResponse = new PolicyResponse({
        code: response.code,
        message: response.message,
        userId: userId,
      });
    } else {
      // Handle unexpected structure or throw an error
      policyResponse = new PolicyResponse({
        message: 'Unexpected response structure received.',
      });
    }

    return policyResponse;
  }

  async getUserRoleId(
    userIdToLookup: string,
    apiToken: string,
  ): Promise<number> {
    const dataflowName = this.configService.get<string>('app.dataFlow');
    const requestBody = {
      userId: this.safeEncodeURIComponent( userIdToLookup),
      dataflow: this.safeEncodeURIComponent( dataflowName),
    };

    const registerApiUrl = getConfigValue('OIDC_REST_API_BASE', '');
    const apiUrl = `${registerApiUrl}/api/v1/streamlined/retrieveUsersByCriteria`;

    try {
      const response = await this.makePostRequestJson<RetrieveUsersResponse>(
        apiUrl,
        requestBody,
        apiToken,
      );
      if (!response || response.length === 0) {
        throw new Error(
          `No ${dataflowName} roles found for user ${userIdToLookup}`,
        );
      }

      return response[0].role.userRoleId;
    } catch (error) {
      this.logger.error(`Error obtaining user role id: `, error);
      throw new Error(`Error obtaining user role id: ${error.message}`);
    }
  }

  async terminateB2CSession(oidcPolicy: string, apiToken: string) {

    this.logger.debug('Terminating any existing user session with B2C for policy ', {
      oidcPolicy,
    });

    const logoutEndpoint = `${this.configService.get('OIDC_CDX_LOGOUT_ENDPOINT').replace('%s', oidcPolicy)}`;

    //sign the user out
    await this.makeGetRequest<OrganizationResponse>(
      logoutEndpoint,
      apiToken,
      null,
    );
  }

  async makePostRequestJson<T>(
    url: string,
    body: any,
    apiToken: string,
    customHeaders?: Record<string, string>,
  ): Promise<T> {
    try {
      let headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      };

      // If custom headers are provided, merge them with the default headers
      if (customHeaders && Object.keys(customHeaders).length > 0) {
        headers = { ...headers, ...customHeaders };
      }

      const response = await firstValueFrom(
        this.httpService.post<T>(url, body, { headers }),
      );
      return response.data;
    } catch (error) {
      this.handleError(error, url, body);
    }
  }

  async makePostRequestForToken<T>(
    tokenUrl: string,
    params: URLSearchParams,
  ): Promise<T> {
    try {
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      const response = await firstValueFrom(
        this.httpService.post<T>(tokenUrl, params, { headers }),
      );
      return response.data;
    } catch (error) {
      this.handleError(error, tokenUrl, params);
    }
  }

  async signMultipleFiles<T>(
    postUrl: string,
    apiToken: string,
    files: Express.Multer.File[],
    signatureRequest: SignatureRequest,
  ): Promise<T> {
    try {
      const formData = new FormData();
      signatureRequest.documents = signatureRequest.documents || [];

      // Append files to formData and construct documents array in DTO
      files.forEach((file, index) => {
        formData.append(`file`, file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
        // Populate the documents array in the SignatureRequest DTO
        signatureRequest.documents[index] = {
          name: file.originalname,
          format: file.mimetype.split('/')[1], // Extracts the file extension from MIME type
        };
      });

      // Append the metadata (SignatureRequest) as JSON string
      formData.append('meta', JSON.stringify(signatureRequest), {
        contentType: 'application/json',
      });

      const headers = {
        ...formData.getHeaders(),
        Authorization: `Bearer ${apiToken}`,
      };

      const response = await firstValueFrom(
        this.httpService.post<T>(postUrl, formData, { headers }),
      );

      return response.data;
    } catch (error) {
      this.handleError(error, postUrl, null);
    }
  }

  async signSingleFile<T>(
    postUrl: string,
    apiToken: string,
    file: Express.Multer.File,
    signatureRequest: SignatureRequest,
  ): Promise<T> {
    try {
      const formData = new FormData();
      signatureRequest.documents = signatureRequest.documents || [];

      // Append the single file to formData and construct the documents array in DTO
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      // Populate the documents array in the SignatureRequest DTO with the single file
      signatureRequest.documents[0] = {
        name: file.originalname,
        format: file.mimetype.split('/')[1], // Extracts the file extension from MIME type
      };

      // Append the metadata (SignatureRequest) as JSON string
      formData.append('meta', JSON.stringify(signatureRequest), {
        contentType: 'application/json',
      });

      const headers = {
        ...formData.getHeaders(),
        Authorization: `Bearer ${apiToken}`,
      };

      const response = await firstValueFrom(
        this.httpService.post<T>(postUrl, formData, { headers }),
      );

      return response.data;
    } catch (error) {
      this.handleError(error, postUrl, null);
    }
  }

  async makeGetRequest<T>(
    url: string,
    apiToken: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      };

      const response = await firstValueFrom(
        this.httpService.get<T>(url, {
          headers,
          params,
        }),
      );
      return response.data;
    } catch (error) {
      this.handleError(error, url, params);
    }
  }

  private handleError(
    error: any,
    url: string,
    params?: Record<string, any> | URLSearchParams,
  ): void {
    const {
      message = 'Unknown error occurred',
      stack = 'No stack trace available',
      ...rest
    } = error;

    this.logger.error(
      `Error making a request to ${url} with params ${
        params ? JSON.stringify(params) : 'n/a'
      }:`,
      {
        message,
        stack,
        ...rest,
      },
    );

    let errorMessage = message;
    let errorCode = 'UNKNOWN_ERROR';
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    if (error.response) {
      // Handle known error structure
      const { data, status } = error.response;
      statusCode = status;
      if (data && data.message && data.code) {
        errorMessage = data.message;
        errorCode = data.code;
      } else if (typeof data === 'string') {
        errorMessage = data;
      }
    } else if (error.message) {
      // Fallback for other errors
      errorMessage = error.message;
    }

    throw new HttpException(
      { code: errorCode, message: errorMessage },
      statusCode,
    );
  }

  /*
  Since we are not using session to store the nonce and state values (to compare later after user is redirected back
  to us), we are going to include the nonce value in the state (since we are encrypting the state value) and send it off
  on the auth flow. Upon redirect, we can decrypt the state value and make sure it is intact by checking its signature.
  Then extract the nonce value and then compare that against the nonce value included in the id token.
   */
  async generateNonceAndState(
    userId: string,
    policy: string,
  ): Promise<{ nonce: string; state: string }> {
    const nonce = this.generateNonce(32);
    const timestamp = Date.now().toString();
    const state = await this.generateState(nonce, timestamp, userId, policy);
    return { nonce, state };
  }

  /*
   We generate a nonce to prevent replay attacks. The nonce value will be included in the ID token returned by the OIDC
   provider. This allows us to verify that the token we receive is indeed directly in response our own recent
   request and not a replay of a previous request.
   */
  generateNonce(length = 32): string {
    return crypto
      .randomBytes(length)
      .toString('hex')
      .slice(0, length);
  }

  /*
   We generate a random state value to protect against Cross-Site Request Forgery (CSRF) attacks.
   We do this by maintaining a link between a user's initial auth request and the callback from the
   authorization server. Since we are NOT maintaining a session, we are encrypting a nonce and state values
   and sending it with the auth request, and we will validate it again when the redirect bring the user back to
   our page.
   */
  async generateState(
    nonce: string,
    timestamp: string,
    userId: string,
    policy: string,
  ): Promise<string> {
    const secretKey = getConfigValue('OIDC_HMAC_SECRET_KEY');
    const hmac = crypto.createHmac('sha256', secretKey);
    const dataToSign = `${nonce}|${timestamp}|${userId}|${policy}`;
    hmac.update(dataToSign);
    const signature = hmac.digest('hex');
    return `${nonce}::${timestamp}::${userId}::${policy}::${signature}`;
  }

  async validateNonceAndState(
    state: string,
  ): Promise<{ isValid: boolean; userId?: string; policy?: string }> {
    if (!state) {
      return { isValid: false };
    }

    const [nonce, timestamp, userId, policy, signature] = state.split('::');
    const secretKey = getConfigValue('OIDC_HMAC_SECRET_KEY');
    const hmac = crypto.createHmac('sha256', secretKey);
    const dataToSign = `${nonce}|${timestamp}|${userId}|${policy}`; // Include userId in the data to sign
    hmac.update(dataToSign);
    const computedSignature = hmac.digest('hex');

    // Check if the computed signature matches the one in the state
    if (signature === computedSignature) {
      return { isValid: true, userId, policy }; // Return userId if valid
    } else {
      return { isValid: false };
    }
  }

  /*
  Checks if the OIDC post coming from the auth-flow redirect has errors
   */
  async validateOidcPostRequest(
    oidcAuthValidationRequest: OidcAuthValidationRequestDto,
  ) {
    const oidcAuthValidationResponse: OidcAuthValidationResponseDto = new OidcAuthValidationResponseDto(
      {
        isValid: true,
      },
    );

    //Does the OidcPost request itself has an error?
    if (oidcAuthValidationRequest.error) {
      this.logger.debug('OIDC post request contains error', {
        error: oidcAuthValidationRequest.error,
        errorDescription: oidcAuthValidationRequest.error_description,
      });

      oidcAuthValidationResponse.isValid = false;
      oidcAuthValidationResponse.code = oidcAuthValidationRequest.code;
      oidcAuthValidationResponse.message =
        oidcAuthValidationRequest.error_description;
      return oidcAuthValidationResponse;
    }

    //Check and state values and return userId if they are valid.
    this.logger.debug('Validating nonce and state...', {
      state: oidcAuthValidationRequest.state,
    });

    const validationResult = await this.validateNonceAndState(
      oidcAuthValidationRequest.state,
    );
    this.logger.debug('Nonce and state validation result', {
      validationResult,
    });
    if (!validationResult.isValid) {
      oidcAuthValidationResponse.isValid = false;
      oidcAuthValidationResponse.code = encodeURIComponent(
        'INVALID_NONCE_OR_STATE',
      );
      oidcAuthValidationResponse.message = encodeURIComponent(
        'Invalid state or nonce',
      );
      return oidcAuthValidationResponse;
    }

    oidcAuthValidationResponse.userId = validationResult.userId;
    oidcAuthValidationResponse.policy = validationResult.policy;

    this.logger.debug('OIDC post request validation successful', {
      oidcAuthValidationResponse,
    });

    return oidcAuthValidationResponse;
  }

  /*encodeRecordParams(params: Record<string, string | null | undefined>): string {
    return Object.keys(params)
      .map(key => {
        const value = params[key];
        if (value === null || value === undefined) {
          return `${encodeURIComponent(key)}=`;
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      })
      .join('&');
  }*/

  safeEncodeURIComponent(value: string | null | undefined): string {
    return value ? encodeURIComponent(value) : '';
  }

}
