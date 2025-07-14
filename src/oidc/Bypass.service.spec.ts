import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { PermissionsService } from './Permissions.service';
import { HttpService } from '@nestjs/axios';
import { MockPermissionObject } from './../interfaces/mock-permissions.interface';
import { SignService } from '../sign/Sign.service';
import { UserSessionService } from '../user-session/user-session.service';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { BypassService } from '../oidc/Bypass.service';
import { FacilityAccessWithCertStatementFlagDTO } from '../dtos/permissions.dto';
import { UserRole } from '@us-epa-camd/easey-common/enums';

let responseVals = {
  ['app.env']: 'production',
  ['app.contentUri']: 'contentUri',
  ['app.cdxSvcs']: '',
  ['app.mockPermissionsEnabled']: true,
  ['app.enableAllFacilities']: true,
};

jest.mock('soap', () => ({
  createClientAsync: jest.fn(() => Promise.resolve(client)),
}));

const client = {
  RetrieveRolesAsync: jest.fn(),
  RetrieveOrganizationsAsync: jest.fn().mockResolvedValue({
    email: 'user@example.com',
  }),
};

jest.mock('rxjs', () => {
  const originalModule = jest.requireActual('rxjs');
  return {
    ...originalModule,
    firstValueFrom: jest.fn().mockResolvedValue({
      data: {
        userId: 'user',
        isAdmin: true,
        plantList: [
          {
            id: 1,
            permissions: ['DSMP', 'DSEM', 'DSQA'],
          },
          {
            id: 2,
            permissions: ['DSMP', 'DSEM'],
          },
        ],
        missingCertificationStatements: true,
		roles: [UserRole.PREPARER],
      },
    }),
  };
});
describe('BypassService', () => {
  let service: BypassService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [
        BypassService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              return responseVals[key];
            }),
          },
        },
        {
          provide: HttpService,
          useFactory: () => ({
            get: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<BypassService>(BypassService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMockPermissions', () => {
    it('should error in production', async () => {
      await expect(service.getMockPermissions('')).rejects.toThrowError(
        EaseyException,
      );
    });
    it('should parse user env var and build the permissions properly given a found user', async () => {
      const p: MockPermissionObject = {
        userId: 'user',
        facilities: [{ orisCode: 1, roles: [], facId: 1 }],
        missingCertificationStatements: true,
		roles: [UserRole.PREPARER],
      };
      jest.spyOn(service, 'getMockPermissionObject').mockResolvedValue([p]);
      responseVals = {
        ...responseVals,
        ['app.env']: 'local-dev',
      };

      const permissions = await service.getMockPermissions('user');

      expect(permissions.plantList[0].facId).toEqual(1);
    });

    it('should parse user env var and build the permissions properly given a not found user', async () => {
      const p: MockPermissionObject = {
        userId: 'user',
        facilities: [{ orisCode: 1, roles: [], facId: 1 }],
        missingCertificationStatements: true,
		roles: [UserRole.PREPARER],
      };
      responseVals = {
        ...responseVals,
        ['app.env']: 'local-dev',
      };

      jest.spyOn(service, 'getMockPermissionObject').mockResolvedValue([p]);

      const permissions = await service.getMockPermissions('userNotFound');

      expect(permissions).toBe(null);
    });
  });
});
