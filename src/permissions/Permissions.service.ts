import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@us-epa-camd/easey-common/enums';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { getConfigValue } from '@us-epa-camd/easey-common/utilities';
import * as crypto from 'crypto';
import * as https from 'https';
import { firstValueFrom } from 'rxjs';

import {
  OrganizationResponse,
  UserRolesResponse,
} from '../dtos/oidc-auth-dtos';
import { FacilityAccessDTO, FacilityAccessWithCertStatementFlagDTO } from '../dtos/permissions.dto';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { MockPermissionObject } from './../interfaces/mock-permissions.interface';
import { BypassService } from '../oidc/Bypass.service';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly configService: ConfigService,
    private httpService: HttpService,
    private readonly oidcHelperService: OidcHelperService,
    private readonly bypassService: BypassService,
    private readonly logger: Logger,
  ) {}

  async retrieveAllUserRoles(
    userId: string,
    apiToken: string,
  ): Promise<Array<string>> {
    const orgs = await this.getAllUserOrganizations(userId, apiToken);
    const roleSet = new Set<string>();
    for (const o of orgs) {
      const rolesForOrg = await this.getUserRoles(
        userId,
        o.userOrganizationId,
        apiToken,
      );

      rolesForOrg.forEach(r => {
        roleSet.add(r);
      });
    }

    return Array.from(roleSet.values());
  }

  async getUserRoles(
    userId: string,
    orgId: number,
    apiToken: string,
  ): Promise<string[]> {
    const registerApiUrl = getConfigValue('OIDC_REST_API_BASE', '');
    const apiUrl = `${registerApiUrl}/api/v1/registration/retrieveRoles/${this.oidcHelperService.safeEncodeURIComponent(userId)}/${this.oidcHelperService.safeEncodeURIComponent(orgId.toString())}`;

    try {
      const res = await this.oidcHelperService.makeGetRequest<
        UserRolesResponse
      >(apiUrl, apiToken, null);

      if (res && res.length > 0) {
        const activeDescriptions = res
          .filter(role => role.status.code === 'Active')
          .map(role => role.type.description);
        return activeDescriptions;
      }
      return [];
    } catch (error) {
      this.logger.error('Failed to make GET request to ', apiUrl, error);
      throw new EaseyException(error, HttpStatus.BAD_REQUEST);
    }
  }

  async getAllUserOrganizations(
    userId: string,
    token: string,
  ): Promise<OrganizationResponse[]> {
    const registerApiUrl = getConfigValue('OIDC_REST_API_BASE', '');
    const dataflow = this.configService.get<string>('app.dataFlow');
    const apiUrl = `${registerApiUrl}/api/v1/registration/retrieveOrganizationsByDataflow/${this.oidcHelperService.safeEncodeURIComponent(userId)}/${this.oidcHelperService.safeEncodeURIComponent(dataflow)}`;

    try {
      const orgs = await this.oidcHelperService.makeGetRequest<
        OrganizationResponse[]
      >(apiUrl, token, null);
      return orgs;
    } catch (error) {
      this.logger.error('Failed to make GET request to ', apiUrl, error);
      throw new EaseyException(error, HttpStatus.BAD_REQUEST);
    }
  }

  async retrieveAllUserFacilities(
    userId: string,
    roles: Array<string>,
    accessToken: string,
    clientIp: string,
  ): Promise<FacilityAccessWithCertStatementFlagDTO> {

    const bypassEnabled = this.bypassService.bypassEnabled();
    const mockPermissionsEnabled = this.configService.get<boolean>('app.mockPermissionsEnabled');
    const hasRequiredRole = roles.some((role: UserRole) =>
      [
        UserRole.SPONSOR,
        UserRole.PREPARER,
        UserRole.SUBMITTER,
        UserRole.INITIAL_AUTHORIZER,
      ].includes(role),
    );

    this.logger.debug('retrieveAllUserFacilities: ', {userId, hasRequiredRole, bypassEnabled, mockPermissionsEnabled} );

    if (!hasRequiredRole) {
      this.logger.debug('User does not have one of the required roles. Returning an empty list of responsibilities. ');
      return { plantList: [], missingCertificationStatements: true,} as FacilityAccessWithCertStatementFlagDTO;
    }

    let url: string;
    let permissionServiceName = "";
    if (bypassEnabled || mockPermissionsEnabled) {
      url = `${this.configService.get<string>('app.mockPermissionsUrl',)}?userId=${userId.toUpperCase()}`;
      permissionServiceName = "Mock Permissions";
    } else {
      url = `${this.configService.get<string>('app.permissionsUrl')}?userId=${userId.toUpperCase()}`;
      permissionServiceName = "CBS"
    }

    try {
      return await this.getUserPermissions(clientIp, accessToken, url);
    } catch (error) {
      const errorMessage = "Unable to obtain user responsibilities from " +  permissionServiceName + ". Please try again later."
      this.logger.error(errorMessage, url, error.message);
      throw new Error(errorMessage);
    }
  }

  async getMockPermissions(userId: string): Promise<FacilityAccessWithCertStatementFlagDTO> {
    if (this.configService.get<string>('app.env') === 'production') {
      throw new EaseyException(
        new Error('Mocking permissions in production is not allowed!'),
        HttpStatus.BAD_REQUEST,
      );
    }

    const permissionsDto = {plantList: [], missingCertificationStatements: true,} as FacilityAccessWithCertStatementFlagDTO;
    const mockPermissionObject = await this.getMockPermissionObject();

    //filter out all the unmactched records
    const userPermissions = mockPermissionObject.filter(
      entry => entry.userId.toUpperCase() === userId.toUpperCase(),
    );
    
    //only retrieve info from the first matched record
    if (
      userPermissions.length > 0 &&
      userPermissions[0].facilities?.length > 0
    ) {
      const plantList = []
      for (const facility of userPermissions[0].facilities) {
        const dto = new FacilityAccessDTO();
        dto.facId = facility.facId;
        dto.orisCode = facility.orisCode;
        dto.permissions = facility.roles;
        plantList.push(dto);
      };
      permissionsDto.plantList = plantList;
      //if the missingCertificationStatements flag is null or undefined, set the default value to true
      permissionsDto.missingCertificationStatements = userPermissions[0]?.missingCertificationStatements == null ? true : userPermissions[0]?.missingCertificationStatements;
    
    } else if (this.configService.get<boolean>('app.enableAllFacilities')) {
      return null;
    }

    return permissionsDto;
  }

  async getUserPermissions(
    clientIp: string,
    token: string,
    url: string,
  ): Promise<FacilityAccessWithCertStatementFlagDTO> {
    try {
      const allowLegacyRenegotiationforNodeJsOptions = {
        httpsAgent: new https.Agent({
          secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
        }),
      };
      const permissionResult = await firstValueFrom(
        this.httpService.get(url, {
          ...allowLegacyRenegotiationforNodeJsOptions,
          headers: {
            'x-api-key': this.configService.get<string>('app.apiKey'),
            'x-forwarded-for': clientIp,
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      if (permissionResult.data) {
        const data = permissionResult.data
        // check if the missingCertificationStatements is null or undefined, if it is, then set the default value to true
        data.missingCertificationStatements = data.missingCertificationStatements == null ? true : data.missingCertificationStatements; 
        return data;
      }

      return null;
    } catch (e) {
      this.logger.error('getUserPermissions: ', e);
      // throwing error, when CBS API returns error.
      if (
        !this.configService.get<boolean>('app.mockPermissionsEnabled') &&
        !e.response
      ) {
        this.logger.error('Call to CBS for user responsibilities failed.', e);
        throw new EaseyException(
          new Error(
            'Unable to obtain user responsibilities from CBS. Please try again later.',
          ),
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new EaseyException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getMockPermissionObject(): Promise<MockPermissionObject[]> {
    const contentUri = this.configService.get<string>('app.contentUri');
    try {
      const url = `${contentUri}/auth/mockPermissions.json`;
      const mockPermissionResult = await firstValueFrom(
        this.httpService.get(url),
      );
      return mockPermissionResult.data;
    } catch (e) {
      throw new EaseyException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
