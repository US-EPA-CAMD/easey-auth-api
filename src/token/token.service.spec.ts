import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { UserSessionService } from '../user-session/user-session.service';
import { TokenDTO } from '../dtos/token.dto';
import { TokenService } from './token.service';
import { FacilityAccessDTO } from '../dtos/permissions.dto';
import { PermissionsService } from '../permissions/Permissions.service';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';
jest.mock('soap', () => ({
  createClientAsync: jest.fn(() => Promise.resolve(client)),
}));
let responseVals = {
  ['app.env']: 'development',
};
const client = {
  CreateSecurityTokenAsync: jest.fn().mockResolvedValue([{ return: 'token' }]),
  ValidateAsync: jest.fn().mockResolvedValue([{ return: 'validated' }]),
};

jest.mock('@us-epa-camd/easey-common/utilities', () => ({
  dateToEstString: jest.fn().mockReturnValue(new Date().toLocaleString()),
}));

describe('Token Service', () => {
  let service: TokenService;
  let userSessionService: UserSessionService;
  let permissionService: PermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              return responseVals[key];
            }),
          },
        },
        {
          provide: UserSessionService,
          useFactory: () => ({
            findSessionByUserIdAndToken: jest
              .fn()
              .mockResolvedValue(JSON.stringify({ facilities: [] })),
            removeUserSessionByUserId: jest.fn(),
            createUserSession: jest.fn().mockResolvedValue(new TokenDTO()),
            updateUserSessionToken: jest.fn(),
            isValidSessionForToken: jest.fn().mockResolvedValue(true),
            isSessionTokenExpired: jest.fn().mockReturnValue(false),
            getUserPermissions: jest
              .fn()
              .mockResolvedValue([new FacilityAccessDTO()]),
          }),
        },
        {
          provide: PermissionsService,
          useFactory: () => ({
            retrieveAllUserRoles: jest.fn().mockResolvedValue(['Preparer']),
            retrieveAllUserFacilities: jest.fn().mockResolvedValue([]),
          }),
        },
        TokenService,
      ],
    }).compile();
    service = module.get(TokenService);
    permissionService = module.get(PermissionsService);
    userSessionService = module.get(UserSessionService);
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('refreshToken', () => {
    it('should issue a token for the user given a non-expired session', async () => {
      userSessionService.isSessionTokenExpired = jest
        .fn()
        .mockReturnValue(false);

      const token = new TokenDTO();
      token.token = 'mockToken';
      jest.spyOn(service, 'generateToken').mockResolvedValue(token);
      const refreshedToken = await service.refreshToken('', '', '');
      expect(refreshedToken.token).toEqual('mockToken');
    });
  });

  describe('generateToken', () => {
    it('should issue a new bypass token for the user', async () => {
      jest.spyOn(service, 'bypassEnabled').mockReturnValue(true);
      const cdxTokenSpy = jest.spyOn(service, 'getTokenFromCDX');
      await service.generateToken('', '', '', []);
      expect(cdxTokenSpy).not.toHaveBeenCalled();
    });

    it('should issue a new bypass token for the user', async () => {
      jest.spyOn(service, 'bypassEnabled').mockReturnValue(false);
      const cdxTokenSpy = jest.spyOn(service, 'getTokenFromCDX');
      await service.generateToken('', '', '', []);
      expect(cdxTokenSpy).toHaveBeenCalled();
    });
  });

  describe('unencryptToken', () => {
    it('should unencrypt a user token', async () => {
      jest.spyOn(service, 'bypassEnabled').mockReturnValue(false);
      const tok = await service.unencryptToken('', '');
      expect(tok).toEqual('validated');
    });
  });

  describe('validateClientIp', () => {
    it('should fail when client Ip does not match', async () => {
      const testIp = { clientIp: '1' } as CurrentUser;
      let errored = false;
      try {
        await service.validateClientIp(testIp, '2');
      } catch (error) {
        errored = true;
      }
      expect(errored).toBe(true);
    });
    it('should fail when client Ip does not match', async () => {
      const testIp = { clientIp: '1' } as CurrentUser;
      expect(async () => {
        service.validateClientIp(testIp, '1');
      }).not.toThrowError();
    });
  });
});
