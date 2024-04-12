import { Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { TokenService } from '../token/token.service';
import { UserSessionService } from '../user-session/user-session.service';
import { PermissionsService } from '../permissions/Permissions.service';
import { getConfigValue } from '@us-epa-camd/easey-common/utilities';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { PolicyResponse } from '../dtos/policy-response';

@Injectable()
export class SurAuthService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly httpService: HttpService,
    private readonly oidcHelperService: OidcHelperService,
    private readonly logger: Logger,
  ) {}

  async determinePolicy(userId: string): Promise<PolicyResponse> {

    //TODO Implement bypass. Question: what do we pass for password that is required by current bypass implementation
    if (this.tokenService.bypassEnabled()) {
      return new PolicyResponse({ message: "Bypass is enabled but functionality is currently unavailable" });
    }

    try {

      //Get the Api Token to use as bearer Token in the determinePolicy call
      const apiToken = await this.oidcHelperService.getCdxApiToken();
      this.logger.debug('Succesfully Retrieved Token....');

      //Make the determinePolicyCall
      return await this.oidcHelperService.determinePolicy(userId, apiToken);
    } catch (error) {
      this.logger.error("error calling REST service: ", error.message);
      throw new Error(error); // Adjust based on your error handling strategy
    }

  }
}
