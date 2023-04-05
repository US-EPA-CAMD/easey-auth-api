import { MockPermissionObject } from './../interfaces/mock-permissions.interface';
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { FacilityAccessDTO } from '../dtos/permissions.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async getMockPermissions(userId: string): Promise<FacilityAccessDTO[]> {
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

    let permissionsDto = [];
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
    } else {
      permissionsDto = null;
    }

    return permissionsDto;
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
