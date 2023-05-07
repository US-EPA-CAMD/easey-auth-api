import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { UserSessionService } from '../user-session/user-session.service';
import { TokenDTO } from '../dtos/token.dto';
import { TokenService } from './token.service';
import { UserSession } from '../entities/user-session.entity';
import { FacilityAccessDTO } from '../dtos/permissions.dto';
import { PermissionsService } from '../permissions/Permissions.service';
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
  parseToken: jest
    .fn()
    .mockReturnValue({ clientIp: '1', facilities: [], roles: ['Submitter'] }),
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
            findSessionByUserIdAndToken: jest.fn(),
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
      userSessionService.findSessionByUserIdAndToken = jest
        .fn()
        .mockResolvedValue(new UserSession());

      userSessionService.isSessionTokenExpired = jest
        .fn()
        .mockReturnValue(false);

      const token = new TokenDTO();
      token.token = 'mockToken';
      jest.spyOn(service, 'generateToken').mockResolvedValue(token);
      const refreshedToken = await service.refreshToken('', '', '');
      expect(refreshedToken.token).toEqual('mockToken');
    });

    it('should issue a token for the user given an expired session', async () => {
      userSessionService.findSessionByUserIdAndToken = jest
        .fn()
        .mockResolvedValue(new UserSession());

      userSessionService.isSessionTokenExpired = jest
        .fn()
        .mockReturnValue(true);

      const mockRetrieveAllFacilities = jest.fn().mockResolvedValue([]);
      permissionService.retrieveAllUserFacilities = mockRetrieveAllFacilities;

      const token = new TokenDTO();
      token.token = 'mockToken';
      jest.spyOn(service, 'generateToken').mockResolvedValue(token);
      await service.refreshToken('', '', '');
      expect(mockRetrieveAllFacilities).toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('should issue a new bypass token for the user', async () => {
      jest.spyOn(service, 'bypassEnabled').mockReturnValue(true);
      const cdxTokenSpy = jest.spyOn(service, 'getTokenFromCDX');
      await service.generateToken('', '', '', [new FacilityAccessDTO()], []);
      expect(cdxTokenSpy).not.toHaveBeenCalled();
    });

    it('should issue a new bypass token for the user', async () => {
      jest.spyOn(service, 'bypassEnabled').mockReturnValue(false);
      const cdxTokenSpy = jest.spyOn(service, 'getTokenFromCDX');
      await service.generateToken('', '', '', [new FacilityAccessDTO()], []);
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
      const testIp = { clientIp: '1' };
      let errored = false;
      try {
        await service.validateClientIp(testIp, '2');
      } catch (error) {
        errored = true;
      }
      expect(errored).toBe(true);
    });
    it('should fail when client Ip does not match', async () => {
      const testIp = { clientIp: '1' };
      expect(async () => {
        service.validateClientIp(testIp, '1');
      }).not.toThrowError();
    });
  });

  describe('validateToken', () => {
    it('should validate and return unecnrypted token', async () => {
      jest.spyOn(service, 'unencryptToken').mockResolvedValue('token');
      jest.spyOn(service, 'validateClientIp').mockImplementation(jest.fn());
      expect(await service.validateToken('', '')).toEqual({
        clientIp: '1',
        facilities: [],
        roles: ['Submitter'],
      });
    });
    it('should validate and return false given invalid token', async () => {
      jest.spyOn(service, 'unencryptToken').mockResolvedValue('token');
      jest.spyOn(service, 'validateClientIp').mockImplementation(jest.fn());
      userSessionService.isValidSessionForToken = jest
        .fn()
        .mockResolvedValue(false);
      expect(await service.validateToken('', '')).toEqual(false);
    });
  });
});
