import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { PermissionsService } from './Permissions.service';
import { HttpService } from '@nestjs/axios';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';

let responseVals = {
  ['app.env']: 'production',
  ['app.mockPermissions']: 'pass',
  ['app.contentUri']: 'contentUri',
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
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMockPermissions', () => {
    it('should error in production', async () => {
      await expect(service.getMockPermissions('')).rejects.toThrowError(
        LoggingException,
      );
    });
    it('should parse user env var and build the permissions properly given a found user', async () => {
      responseVals = {
        ...responseVals,
        ['app.env']: 'local-dev',
        ['app.mockPermissions']: `[
          {
            "userId":"user",
            "isAdmin":true,
            "facilities":[
              {
                "id":1,
                "permissions":["DSMP","DSEM","DSQA"]
              }
            ]
          }
        ]`,
      };

      const permissions = await service.getMockPermissions('user');

      expect(permissions.isAdmin).toEqual(true);
      expect(permissions.facilities[0].id).toEqual(1);
    });

    it('should parse user env var and build the permissions properly given a not found user', async () => {
      responseVals = {
        ...responseVals,
        ['app.env']: 'local-dev',
        ['app.mockPermissions']: `[
          {
            "userId":"user",
            "isAdmin":true,
            "facilities":[
              {
                "id":1,
                "permissions":["DSMP","DSEM","DSQA"]
              }
            ]
          }
        ]`,
      };

      const permissions = await service.getMockPermissions('userNotFound');

      expect(permissions.isAdmin).toEqual(true);
      expect(permissions.facilities).toBe(null);
    });
  });
});
