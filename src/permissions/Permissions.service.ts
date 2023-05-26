import { MockPermissionObject } from './../interfaces/mock-permissions.interface';
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';
import { FacilityAccessDTO } from '../dtos/permissions.dto';
import { firstValueFrom } from 'rxjs';
import { createClientAsync } from 'soap';
import { SignService } from '../sign/Sign.service';
import { UserSessionService } from '../user-session/user-session.service';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly signService: SignService,
    private readonly userSessionService: UserSessionService,
    private readonly configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async getUserRoles(userId, orgId, registerToken): Promise<string[]> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.RetrieveRolesAsync({
          securityToken: registerToken,
          user: { userId: userId },
          org: { userOrganizationId: orgId },
        });
      })
      .then(res => {
        if (
          res &&
          res.length > 0 &&
          res[0] !== null &&
          res[0]['Role'] &&
          res[0].Role.length > 0
        ) {
          const activeRoles = res[0].Role.filter(
            o => o.status.code === 'Active',
          );

          return activeRoles.map(r => r.type.description);
        }
        return [];
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new LoggingException(err.root.Envelope, HttpStatus.BAD_REQUEST);
        }

        throw new LoggingException(err.message, HttpStatus.BAD_REQUEST);
      });
  }

  async getAllUserOrganizations(userId, registerToken): Promise<any> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.RetrieveOrganizationsAsync({
          securityToken: registerToken,
          user: { userId: userId },
        });
      })
      .then(res => {
        return res[0].Organization;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new LoggingException(err.root.Envelope, HttpStatus.BAD_REQUEST);
        }

        throw new LoggingException(err.message, HttpStatus.BAD_REQUEST);
      });
  }

  async retrieveAllUserRoles(userId: string): Promise<Array<string>> {
    const registerToken = await this.signService.getRegisterServiceToken();
    const orgs = await this.getAllUserOrganizations(userId, registerToken);
    const roleSet = new Set<string>();
    for (const o of orgs) {
      const rolesForOrg = await this.getUserRoles(
        userId,
        o.userOrganizationId,
        registerToken,
      );

      rolesForOrg.forEach(r => {
        roleSet.add(r);
      });
    }

    return Array.from(roleSet.values());
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
      throw new LoggingException(
        'Mocking permissions in production is not allowed!',
        HttpStatus.BAD_REQUEST,
      );
    }

    let permissionsDto = [];
    const mockPermissionObject = await this.getMockPermissionObject();
    const userPermissions = mockPermissionObject.filter(
      entry => entry.userId.toLowerCase() === userId.toLowerCase(),
    );

    if (
      userPermissions.length > 0 &&
      userPermissions[0].facilities.length > 0
    ) {
      for (let facility of userPermissions[0].facilities) {
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
      const permissionResult = await firstValueFrom(
        this.httpService.get(url, {
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
      throw new LoggingException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
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
      throw new LoggingException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
