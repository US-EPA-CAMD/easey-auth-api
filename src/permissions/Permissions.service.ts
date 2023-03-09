import { MockPermissionObject } from './../interfaces/mock-permissions.interface';
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { FacilityAccessDTO, PermissionsDTO } from '../dtos/permissions.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async getMockPermissions(userId: string): Promise<PermissionsDTO> {
    if (this.configService.get<string>('app.env') === 'production') {
      throw new LoggingException(
        'Mocking permissions in production is not allowed!',
        HttpStatus.BAD_REQUEST,
      );
    }

    const mockPermissionObject = await this.getMockPermissionObject();

    const userPermissions = mockPermissionObject.filter(
      entry => entry.userId === userId,
    );

    const permissionsDto = new PermissionsDTO();
    permissionsDto.facilities = [];
    permissionsDto.isAdmin = false;

    if (
      userPermissions.length > 0 &&
      userPermissions[0].facilities.length > 0
    ) {
      if (userPermissions[0].isAdmin) {
        permissionsDto.isAdmin = true;
      }

      for (let facility of userPermissions[0].facilities) {
        const dto = new FacilityAccessDTO();
        dto.id = facility.id;
        dto.permissions = facility.permissions;
        permissionsDto.facilities.push(dto);
      }
    } else {
      permissionsDto.facilities = null;
      permissionsDto.isAdmin = true;
    }

    return permissionsDto;
  }

  async getMockPermissionObject(): Promise<MockPermissionObject[]> {
    const contentUri = this.configService.get<string>(
      'app.contentUri',
    );
    try {
      const url =`${contentUri}/auth/mockPermissions.json`;
      const mockPermissionResult = await firstValueFrom(
        this.httpService.get(url),
      );
      return mockPermissionResult.data;
    } catch (e) {
      throw new LoggingException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
