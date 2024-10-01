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

jest.mock('rxjs', () => ({
  firstValueFrom: jest.fn().mockResolvedValue({
    data: 
      {
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
      },
  }),
}));
describe('PermissionsService', () => {
  let service: PermissionsService;
  let oidcHelperService: OidcHelperService;
  let bypassService: BypassService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [
        PermissionsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              return responseVals[key];
            }),
          },
        },
        {
          provide: OidcHelperService,
          useValue: {
            validateOidcPostRequest: jest.fn(),
            encodeRecordParams: jest.fn(),
            encodeSearchParams: jest.fn(),
            safeEncodeURIComponent: jest.fn(),
            determinePolicy: jest.fn(),
            makeGetRequest: jest.fn().mockResolvedValue({
              email: 'user@example.com',
            }),
          },
        },
        {
          provide: BypassService,
          useValue: {
            bypassEnabled: jest.fn().mockReturnValue(false),
            getBypassUser: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useFactory: () => ({
            get: jest.fn(),
          }),
        },
        {
          provide: SignService,
          useFactory: () => ({
            getRegisterServiceToken: jest.fn().mockResolvedValue(''),
          }),
        },
        {
          provide: UserSessionService,
          useFactory: () => ({
            getUserPermissions: jest.fn().mockResolvedValue([]),
          }),
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    oidcHelperService = module.get<OidcHelperService>(OidcHelperService);
    bypassService = module.get<BypassService>(BypassService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserPermissions', () => {
    it('should return mocked user permissions', async () => {
      const permissions = await service.getUserPermissions('', '', '');
      expect(permissions).toEqual(
        {
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
        },
      );
    });
  });

  describe('getAllUserOrganizations', () => {
    it('should return organizations for the user', async () => {
      client.RetrieveOrganizationsAsync = jest
        .fn()
        .mockResolvedValue({ email: 'user@example.com' });
      const orgs = await service.getAllUserOrganizations('', '');
      expect(orgs).toEqual({ email: 'user@example.com' }); //OidcHelper is mocked to return this at the top
    });
  });

  describe('getUserRoles', () => {
    it('should return roles for the user', async () => {
      client.RetrieveRolesAsync = jest.fn().mockResolvedValue([
        {
          Role: [{ status: { code: 'Active' }, type: { description: 'Mock' } }],
        },
      ]);
      const roles = await service.getUserRoles('', 0, '');
      expect(roles).toEqual([]);
    });
  });

  describe('getAllUserOrganizations', () => {
    it('should return organizations for the user', async () => {
      client.RetrieveOrganizationsAsync = jest
        .fn()
        .mockResolvedValue({ email: 'user@example.com' });
      const orgs = await service.getAllUserOrganizations('', '');
      expect(orgs).toEqual({ email: 'user@example.com' }); //OidcHelper is mocked to return this value
    });
  });

  describe('retrieveAllUserRoles', () => {
    it('should return all roles for the user', async () => {
      jest
        .spyOn(service, 'getAllUserOrganizations')
        .mockResolvedValue([{ userOrganizationId: 1, email: '' }]);
      jest.spyOn(service, 'getUserRoles').mockResolvedValue(['DPQA']);

      const roles = await service.retrieveAllUserRoles('', '');
      expect(roles).toEqual(['DPQA']);
    });
  });

  describe('retrieveAllUserFacilities', () => {
    it('should return all facilities for the user given mocked data', async () => {
      const p: FacilityAccessWithCertStatementFlagDTO = {
        plantList: [],
        missingCertificationStatements: true,
      };
      jest.spyOn(service, 'getUserPermissions').mockResolvedValue(p);

      const facilities = await service.retrieveAllUserFacilities(
        '',
        [],
        '',
        '',
      );
      expect(facilities?.plantList).toEqual([]);
      expect(facilities?.missingCertificationStatements).toEqual(true);
    });
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
