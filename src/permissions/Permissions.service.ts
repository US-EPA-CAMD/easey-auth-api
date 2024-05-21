import * as crypto from 'crypto';
import * as https from 'https';
import { MockPermissionObject } from './../interfaces/mock-permissions.interface';
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FacilityAccessDTO } from '../dtos/permissions.dto';
import { firstValueFrom } from 'rxjs';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import { getConfigValue } from '@us-epa-camd/easey-common/utilities';
import {
  OrganizationResponse,
  UserRolesResponse,
} from '../dtos/oidc-auth-dtos';
import { Logger } from '@us-epa-camd/easey-common/logger';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly configService: ConfigService,
    private httpService: HttpService,
    private readonly oidcHelperService: OidcHelperService,
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
    token: string,
  ): Promise<string[]> {
    const registerApiUrl = getConfigValue('OIDC_REST_API_BASE', '');
    const apiUrl = `${registerApiUrl}/api/v1/registration/retrieveRoles/${userId}/${orgId}`;

    try {
      const res = await this.oidcHelperService.makeGetRequest<
        UserRolesResponse
      >(apiUrl, token, null);

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
    const apiUrl = `${registerApiUrl}/api/v1/registration/retrieveOrganizationsByDataflow/${userId}/${dataflow}`;

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
    token: string,
    clientIp: string,
  ) {
    const bypassEnabled =
      this.configService.get<string>('app.env') !== 'production' &&
      this.configService.get<boolean>('cdxBypass.enabled');

    if (
      bypassEnabled ||
      this.configService.get<boolean>('app.mockPermissionsEnabled') ||
      roles.includes(this.configService.get<string>('app.sponsorRole')) ||
      roles.includes(this.configService.get<string>('app.preparerRole')) ||
      roles.includes(this.configService.get<string>('app.submitterRole'))
    ) {
      let url;
      if (
        bypassEnabled ||
        this.configService.get<boolean>('app.mockPermissionsEnabled')
      ) {
        url = `${this.configService.get<string>(
          'app.mockPermissionsUrl',
        )}?userId=${userId.toLowerCase()}`;
      } else {
        url = `${this.configService.get<string>(
          'app.permissionsUrl',
        )}?userId=${userId.toLowerCase()}`;
      }
      return await this.getUserPermissions(clientIp, token, url);
    } else {
      return [];
    }
  }

  async getMockPermissions(userId: string): Promise<FacilityAccessDTO[]> {
    if (this.configService.get<string>('app.env') === 'production') {
      throw new EaseyException(
        new Error('Mocking permissions in production is not allowed!'),
        HttpStatus.BAD_REQUEST,
      );
    }

    const permissionsDto = [];
    const mockPermissionObject = await this.getMockPermissionObject();
    const userPermissions = mockPermissionObject.filter(
      entry => entry.userId.toLowerCase() === userId.toLowerCase(),
    );

    if (
      userPermissions.length > 0 &&
      userPermissions[0].facilities.length > 0
    ) {
      for (const facility of userPermissions[0].facilities) {
        const dto = new FacilityAccessDTO();
        dto.facId = facility.facId;
        dto.orisCode = facility.orisCode;
        dto.permissions = facility.roles;
        permissionsDto.push(dto);
      }
    } else if (this.configService.get<boolean>('app.enableAllFacilities')) {
      return null;
    }

    return permissionsDto;
  }

  async getUserPermissions(
    clientIp: string,
    token: string,
    url: string,
  ): Promise<FacilityAccessDTO[]> {
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
        return permissionResult.data;
      }

      return null;
    } catch (e) {
      // throwing error, when CBS API returns error.
      if (
        !this.configService.get<boolean>('app.mockPermissionsEnabled') &&
        !e.response
      ) {
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
