import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { PermissionsService } from './Permissions.service';
import { HttpService } from '@nestjs/axios';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';
import { MockPermissionObject } from './../interfaces/mock-permissions.interface';
import { SignService } from '../sign/Sign.service';
import { UserSessionService } from '../user-session/user-session.service';

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
  RetrieveOrganizationsAsync: jest.fn(),
};

jest.mock('rxjs', () => ({
  firstValueFrom: jest.fn().mockResolvedValue({
    data: [
      {
        userId: 'user',
        isAdmin: true,
        facilities: [
          {
            id: 1,
            permissions: ['DSMP', 'DSEM', 'DSQA'],
          },
        ],
      },
    ],
  }),
}));
describe('PermissionsService', () => {
  let service: PermissionsService;

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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserPermissions', () => {
    it('should return mocked user permissions', async () => {
      const permissions = await service.getUserPermissions('', '', '');
      expect(permissions).toEqual([
        {
          userId: 'user',
          isAdmin: true,
          facilities: [
            {
              id: 1,
              permissions: ['DSMP', 'DSEM', 'DSQA'],
            },
          ],
        },
      ]);
    });
  });

  describe('getAllUserOrganizations', () => {
    it('should return organizations for the user', async () => {
      client.RetrieveOrganizationsAsync = jest
        .fn()
        .mockResolvedValue([{ Organization: [{ userOrganizationId: 1 }] }]);
      const orgs = await service.getAllUserOrganizations('', '');
      expect(orgs).toEqual([{ userOrganizationId: 1 }]);
    });
  });

  describe('getUserRoles', () => {
    it('should return roles for the user', async () => {
      client.RetrieveRolesAsync = jest
        .fn()
        .mockResolvedValue([{ Role: [{ type: { description: 'Mock' } }] }]);
      const roles = await service.getUserRoles('', 0, '');
      expect(roles).toEqual(['Mock']);
    });
  });

  describe('getAllUserOrganizations', () => {
    it('should return organizations for the user', async () => {
      client.RetrieveOrganizationsAsync = jest
        .fn()
        .mockResolvedValue([{ Organization: [{ userOrganizationId: 1 }] }]);
      const orgs = await service.getAllUserOrganizations('', '');
      expect(orgs).toEqual([{ userOrganizationId: 1 }]);
    });
  });

  describe('retrieveAllUserRoles', () => {
    it('should return all roles for the user', async () => {
      jest
        .spyOn(service, 'getAllUserOrganizations')
        .mockResolvedValue([{ userOrganizationId: 1 }]);
      jest.spyOn(service, 'getUserRoles').mockResolvedValue(['DPQA']);

      const roles = await service.retrieveAllUserRoles('');
      expect(roles).toEqual(['DPQA']);
    });
  });

  describe('retrieveAllUserFacilities', () => {
    it('should return all facilities for the user given mocked data', async () => {
      jest.spyOn(service, 'getUserPermissions').mockResolvedValue([]);

      const facilities = await service.retrieveAllUserFacilities(
        '',
        [],
        '',
        '',
      );
      expect(facilities).toEqual([]);
    });
  });

  describe('getMockPermissions', () => {
    it('should error in production', async () => {
      await expect(service.getMockPermissions('')).rejects.toThrowError(
        LoggingException,
      );
    });
    it('should parse user env var and build the permissions properly given a found user', async () => {
      const p: MockPermissionObject = {
        userId: 'user',
        facilities: [{ orisCode: 1, roles: [], facId: 1 }],
      };
      jest.spyOn(service, 'getMockPermissionObject').mockResolvedValue([p]);
      responseVals = {
        ...responseVals,
        ['app.env']: 'local-dev',
      };

      const permissions = await service.getMockPermissions('user');

      expect(permissions[0].facId).toEqual(1);
    });

    it('should parse user env var and build the permissions properly given a not found user', async () => {
      const p: MockPermissionObject = {
        userId: 'user',
        facilities: [{ orisCode: 1, roles: [], facId: 1 }],
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
