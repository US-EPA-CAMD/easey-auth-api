import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { PermissionsService } from './Permissions.service';

let responseVals = {
  ['app.env']: 'production',
  ['app.mockPermissions']: 'pass',
};

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
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMockPermissions', () => {
    it('should error in production', () => {
      expect(() => {
        service.getMockPermissions('');
      }).toThrowError();
    });

    it('should parse user env var and build the permissions properly given a found user', () => {
      responseVals = {
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

      const permissions = service.getMockPermissions('user');

      expect(permissions.isAdmin).toEqual(true);
      expect(permissions.facilities[0].id).toEqual(1);
    });

    it('should parse user env var and build the permissions properly given a not found user', () => {
      responseVals = {
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

      const permissions = service.getMockPermissions('userNotFound');

      expect(permissions.isAdmin).toEqual(true);
      expect(permissions.facilities.length).toEqual(0);
    });
  });
});
