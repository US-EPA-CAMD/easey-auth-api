import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { UserSessionService } from '../user-session/user-session.service';
import { TokenDTO } from '../dtos/token.dto';
import { TokenService } from './token.service';
import { FacilityAccessWithCertStatementFlagDTO } from '../dtos/permissions.dto';
import { PermissionsService } from '../permissions/Permissions.service';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';
import { BypassService } from '../oidc/Bypass.service';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { UserSession } from '../entities/user-session.entity';
import { ClientTokenService } from '../client-token/client-token.service';

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
  let bypassService: BypassService;
  let userSessionService: UserSessionService;
  let permissionService: PermissionsService;
  let oidcHelperService: OidcHelperService;

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
            findSessionByUserId: jest.fn().mockResolvedValue(new UserSession()),
            createUserSession: jest.fn().mockResolvedValue(new TokenDTO()),
            updateUserSessionToken: jest.fn(),
            updateClientIp: jest.fn().mockResolvedValue(undefined),
            isValidSessionForToken: jest.fn().mockResolvedValue(true),
            isSessionTokenExpired: jest.fn().mockReturnValue(false),
            getUserPermissions: jest
              .fn()
              .mockResolvedValue({
                plantList: [],
                missingCertificationStatements: true,
              } as FacilityAccessWithCertStatementFlagDTO),
          }),
        },
        {
          provide: BypassService,
          useValue: {
            bypassEnabled: jest.fn().mockReturnValue(false),
            getBypassUser: jest.fn(),
            extractUserFromValidatedBypassToken: jest.fn().mockResolvedValue({}),
            generateToken: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: OidcHelperService,
          useValue: {
            validateOidcPostRequest: jest.fn(),
            determinePolicy: jest.fn(),
            makeGetRequest: jest.fn().mockResolvedValue({
              email: 'user@example.com',
            }),
          },
        },
        {
          provide: PermissionsService,
          useFactory: () => ({
            retrieveAllUserRoles: jest.fn().mockResolvedValue(['Preparer']),
            retrieveAllUserFacilities: jest
              .fn()
              .mockResolvedValue({
                plantList: [],
                missingCertificationStatements: true,
              } as FacilityAccessWithCertStatementFlagDTO),
          }),
        },
        TokenService,
        {
          provide: ClientTokenService,
          useValue: {
            validateToken: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();
    service = module.get(TokenService);
    permissionService = module.get(PermissionsService);
    userSessionService = module.get(UserSessionService);
    oidcHelperService = module.get<OidcHelperService>(OidcHelperService);
    bypassService = module.get<BypassService>(BypassService);
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateToken', () => {
    it('should issue a new bypass token for the user', async () => {
      jest.spyOn(bypassService, 'bypassEnabled').mockReturnValue(true);
      //const cdxTokenSpy = jest.spyOn(service, 'getTokenFromCDX');
      //await service.generateToken('', '', '', []);
      //expect(cdxTokenSpy).not.toHaveBeenCalled();
    });

    it('should issue a new bypass token for the user', async () => {
      jest.spyOn(bypassService, 'bypassEnabled').mockReturnValue(false);
      //const cdxTokenSpy = jest.spyOn(service, 'getTokenFromCDX');
      //await service.generateToken('', '', '', []);
      //expect(cdxTokenSpy).toHaveBeenCalled();
    });
  });

  describe('unencryptToken', () => {
    it('should unencrypt a user token', async () => {
      jest.spyOn(bypassService, 'bypassEnabled').mockReturnValue(false);
      //const tok = await service.unencryptToken('', '');
      //expect(tok).toEqual('validated');
    });
  });

  describe('validateClientIp via validateToken', () => {
    beforeEach(() => {
      // Mock updateClientIp method for these tests
      jest.spyOn(userSessionService, 'updateClientIp').mockResolvedValue();
    });

    it('should handle IP validation through validateToken when IP changes', async () => {
      const mockUser = {
        userId: 'testuser',
        sessionId: 'testsession',
        clientIp: '192.168.1.100',
        expiration: '01-01-3000',
        facilities: [],
        roles: []
      };

      const userSession = new UserSession();
      userSession.userId = 'testuser';
      userSession.sessionId = 'testsession';
      userSession.clientIp = '192.168.1.100';
      userSession.tokenExpiration = '01-01-3000';
      userSession.facilities = '[]';
      userSession.roles = '[]';

      jest.spyOn(userSessionService, 'findSessionByUserIdAndToken').mockResolvedValue(userSession);
      jest.spyOn(userSessionService, 'isValidSessionForToken').mockResolvedValue(userSession);
      jest.spyOn(bypassService, 'bypassEnabled').mockReturnValue(true);
      jest.spyOn(bypassService, 'extractUserFromValidatedBypassToken').mockResolvedValue(mockUser);

      // Test that validateToken processes IP change without throwing
      const result = await service.validateToken('test-token', '192.168.1.101');
      expect(result).toBeTruthy();
      expect(userSessionService.updateClientIp).toHaveBeenCalledWith('testsession', '192.168.1.101');
    });

    it('should handle validateToken when IP matches', async () => {
      const mockUser = {
        userId: 'testuser',
        sessionId: 'testsession',
        clientIp: '192.168.1.100',
        expiration: '01-01-3000',
        facilities: [],
        roles: []
      };

      const userSession = new UserSession();
      userSession.userId = 'testuser';
      userSession.sessionId = 'testsession';
      userSession.clientIp = '192.168.1.100';
      userSession.tokenExpiration = '01-01-3000';
      userSession.facilities = '[]';
      userSession.roles = '[]';

      jest.spyOn(userSessionService, 'findSessionByUserIdAndToken').mockResolvedValue(userSession);
      jest.spyOn(userSessionService, 'isValidSessionForToken').mockResolvedValue(userSession);
      jest.spyOn(bypassService, 'bypassEnabled').mockReturnValue(true);
      jest.spyOn(bypassService, 'extractUserFromValidatedBypassToken').mockResolvedValue(mockUser);

      // Test that validateToken processes matching IP without issues
      const result = await service.validateToken('test-token', '192.168.1.100');
      expect(result).toBeTruthy();
      expect(userSessionService.updateClientIp).not.toHaveBeenCalled();
    });
  });

  describe('validateToken', () => {
    it('should throw UnauthorizedException when token is invalid or cannot be decoded', async () => {
      jest.spyOn(bypassService, 'bypassEnabled').mockReturnValue(false);
      const invalidToken = 'invalid-token';
      const clientIp = '127.0.0.1';

      // Mock jwt.decode to return null
      const jwtDecodeSpy = jest.spyOn(require('jsonwebtoken'), 'decode').mockReturnValue(null);

      await expect(service.validateToken(invalidToken, clientIp)).rejects.toThrow(UnauthorizedException);
      await expect(service.validateToken(invalidToken, clientIp)).rejects.toThrow('Invalid or expired token. Access denied.');

      jwtDecodeSpy.mockRestore();
    });

    it('should throw UnauthorizedException when token is a string instead of an object', async () => {
      jest.spyOn(bypassService, 'bypassEnabled').mockReturnValue(false);
      const invalidToken = 'invalid-token';
      const clientIp = '127.0.0.1';

      // Mock jwt.decode to return a string
      const jwtDecodeSpy = jest.spyOn(require('jsonwebtoken'), 'decode').mockReturnValue('string-token');

      await expect(service.validateToken(invalidToken, clientIp)).rejects.toThrow(UnauthorizedException);
      await expect(service.validateToken(invalidToken, clientIp)).rejects.toThrow('Invalid or expired token. Access denied.');

      jwtDecodeSpy.mockRestore();
      });
  });

  describe('IP validation integration tests', () => {
    beforeEach(() => {
      // Mock updateClientIp method for these tests
      jest.spyOn(userSessionService, 'updateClientIp').mockResolvedValue();
    });

    it('should process IP changes through full validateToken flow', async () => {
      const mockUser = {
        userId: 'testuser',
        sessionId: 'testsession',
        clientIp: '192.168.1.100',
        expiration: '01-01-3000',
        facilities: [],
        roles: []
      };

      const userSession = new UserSession();
      userSession.userId = 'testuser';
      userSession.sessionId = 'testsession';
      userSession.clientIp = '192.168.1.100';
      userSession.tokenExpiration = '01-01-3000';
      userSession.facilities = '[]';
      userSession.roles = '[]';

      jest.spyOn(userSessionService, 'findSessionByUserIdAndToken').mockResolvedValue(userSession);
      jest.spyOn(userSessionService, 'isValidSessionForToken').mockResolvedValue(userSession);
      jest.spyOn(bypassService, 'bypassEnabled').mockReturnValue(true);
      jest.spyOn(bypassService, 'extractUserFromValidatedBypassToken').mockResolvedValue(mockUser);

      // Test audit-only behavior - no exception thrown, session updated
      const result = await service.validateToken('test-token', '192.168.1.101');
      expect(result).toBeTruthy();
      expect(userSessionService.updateClientIp).toHaveBeenCalledWith('testsession', '192.168.1.101');
    });

    it('should handle database errors during IP update gracefully', async () => {
      const mockUser = {
        userId: 'testuser',
        sessionId: 'testsession',
        clientIp: '192.168.1.100',
        expiration: '01-01-3000',
        facilities: [],
        roles: []
      };

      const userSession = new UserSession();
      userSession.userId = 'testuser';
      userSession.sessionId = 'testsession';
      userSession.clientIp = '192.168.1.100';
      userSession.tokenExpiration = '01-01-3000';
      userSession.facilities = '[]';
      userSession.roles = '[]';

    jest.spyOn(userSessionService, 'findSessionByUserIdAndToken').mockResolvedValue(userSession);
      jest.spyOn(userSessionService, 'isValidSessionForToken').mockResolvedValue(userSession);
      jest.spyOn(userSessionService, 'updateClientIp').mockRejectedValue(new Error('Database error'));
      jest.spyOn(bypassService, 'bypassEnabled').mockReturnValue(true);
      jest.spyOn(bypassService, 'extractUserFromValidatedBypassToken').mockResolvedValue(mockUser);

      // Should not throw even when IP update fails - graceful error handling
      const result = await service.validateToken('test-token', '192.168.1.101');
      expect(result).toBeTruthy();
    });
  });
});
