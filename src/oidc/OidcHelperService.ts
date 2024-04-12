import { Cacheable } from 'nestjs-cacheable';
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { getConfigValue } from '@us-epa-camd/easey-common/utilities';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { RegistrationNewUserProfile } from '../dtos/registration-new-user-profile.dto';
import { PolicyResponse } from '../dtos/policy-response';


@Injectable()
export class OidcHelperService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  // Cache the API token with a default TTL; adjust based on requirements
  @Cacheable({ key: 'cdxApiToken', ttl: 300 }) // TTL in seconds (e.g., 300s = 5min)
  async getCdxApiToken(): Promise<string> {
    const clientId = this.configService.get('OIDC_CLIENT_ID');
    const scope = `${this.configService.get('OIDC_CREDENTIAL_SCOPE').replace('%s', clientId)}`;

    const tokenUrl = this.configService.get('OIDC_TOKEN_URL');
    const clientSecret = this.configService.get('OIDC_CLIENT_SECRET');
    const clientCredentialsPolicy = this.configService.get('OIDC_CLIENT_CREDENTIALS_POLICY');

    return this.generateClientCredentialsToken(tokenUrl, clientId, clientSecret, scope, clientCredentialsPolicy);
  }

  async determinePolicy(userId: string, apiToken: string) : Promise<PolicyResponse> {
    //Prepare request body, ai url etc.
    const requestBody = {
      userId: userId,
    };
    const registerApiUrl = getConfigValue('EASEY_AUTH_REGISTER_API', '');
    const apiUrl = `${registerApiUrl}/api/v1/oidcEnrichment/determinePolicy`;

    //Make the api call
    const response = await firstValueFrom(
      this.httpService.post(apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
      }),
    );

    const responseData = response.data; // Accessing the data property after having the full response
    this.logger.debug('/oidcEnrichment/determinePolicy response data:\n', response.data);

    //Prepare data to be returned to the frontend as a PolicyResponse object
    let policyResponse: PolicyResponse;
    if ('policy' in response.data) {
      policyResponse = await this.determineAuthFlow(response.data.policy, userId);
    } else if ('code' in response.data) {
      // Case with error code and message
      policyResponse = new PolicyResponse({
        code: response.data.code,
        message: response.data.message,
      });
    } else {
      // Handle unexpected structure or throw an error
      policyResponse = new PolicyResponse({ message: 'Unexpected response structure received.' });
    }

    return policyResponse;
  }

  private async determineAuthFlow(policy: string, userId: string): Promise<PolicyResponse> {

    let policyResponse = new PolicyResponse({ policy: policy });

    if (policy.endsWith("_SIGNUP")) {
      //TODO add the _SIGNUP auth-flow-url to the PolicyResponse?  this is the URL the user will be navigated to
    } else if (policy.endsWith("_MIGRATE")) {
      //TODO add the _MIGRATE auth-flow-url to the PolicyResponse?  this is the URL the user will be navigated to
    } else {
      //const profile = await this.lookupCdxProfile( userId );
      //policyResponse.userRoleId = profile.role.getUserRoleId();
      policyResponse.userRoleId = 777; //TODO replace with actual call 
    }

    return policyResponse;
  }

  async lookupCdxProfile(userIdToLookup: string): Promise<RegistrationNewUserProfile> {
    const dataflowName = 'DEMO3';
    const requestBody = {
      userId: userIdToLookup,
      dataflow: dataflowName,
    };

    const registerApiUrl = getConfigValue('EASEY_AUTH_REGISTER_API', '');
    const apiUrl = `${registerApiUrl}/api/v1/streamlined/retrieveUsersByCriteria`;

    try {
      const response = await firstValueFrom(this.httpService.post(apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getCdxApiToken()}`,
        },
      }));

      this.logger.debug(`/streamlined/retrieveUsersByCriteria response:\n${JSON.stringify(response.data)}`);

      const responseArr: RegistrationNewUserProfile[] = response.data;
      this.logger.debug(`/streamlined/retrieveUsersByCriteria number of profiles returned: ${responseArr.length}`);

      if (responseArr.length < 1) {
        throw new Error(`No ${dataflowName} roles found for user ${userIdToLookup}`);
      }

      return responseArr[0];
    } catch (error) {
      this.logger.error(`Error calling REST service: ${error.message}`, error.stack);
      throw new Error(`Application error occurred: ${error.message}`);
    }
  }

  private async generateClientCredentialsToken(tokenUrl: string, clientId: string, clientSecret: string, scope: string, clientCredentialsPolicy: string): Promise<string> {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', scope);
    params.append('p', clientCredentialsPolicy);

    try {
      const response = await firstValueFrom(this.httpService.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }));

      const tokenResponse = response.data;
      if (!tokenResponse.access_token) {
        throw new Error('Failed to retrieve access token');
      }
      return tokenResponse.access_token;
    } catch (error) {
      throw new Error(`Error generating client credentials token: ${error.message}`);
    }
  }
}
