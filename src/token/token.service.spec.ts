import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

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

const refreshEntityManager = {} as any;

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
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
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
            findSessionByUserIdAndTokenOnMaster: jest
              .fn()
              .mockResolvedValue(null),
            findSessionBySessionId: jest.fn(),
            withRefreshLock: jest.fn(
              async (
                _sessionId: string,
                operation: (entityManager: any) => Promise<unknown>,
              ) =>
                operation(refreshEntityManager),
            ),
            replaceSessionTokens: jest.fn().mockResolvedValue(true),
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

  describe('refreshToken', () => {
    it('should return the token persisted by another instance after acquiring the lock', async () => {
      const initialSession = new UserSession();
      initialSession.sessionId = 'session-id';
      initialSession.userId = 'user';
      initialSession.securityToken = 'old-token';

      const refreshedSession = new UserSession();
      refreshedSession.sessionId = 'session-id';
      refreshedSession.securityToken = 'new-token';
      refreshedSession.tokenExpiration = new Date(
        '2026-10-20T15:42:42.000Z',
      );

      jest
        .spyOn(userSessionService, 'findSessionByUserIdAndTokenOnMaster')
        .mockResolvedValue(initialSession);
      jest
        .spyOn(userSessionService, 'findSessionBySessionId')
        .mockResolvedValue(refreshedSession);

      await expect(
        service.refreshToken('user', 'old-token', '127.0.0.1'),
      ).resolves.toEqual({
        token: 'new-token',
        expiration: '2026-10-20T15:42:42.000Z',
      });
      expect(bypassService.generateToken).not.toHaveBeenCalled();
      expect(
        userSessionService.replaceSessionTokens,
      ).not.toHaveBeenCalled();
    });

    it('should replace a bypass token with compare-and-swap', async () => {
      const initialSession = new UserSession();
      initialSession.sessionId = 'session-id';
      initialSession.userId = 'user';
      initialSession.securityToken = 'old-token';
      initialSession.roles = '[]';
      initialSession.tokenVersion = 2;

      const refreshedSession = new UserSession();
      refreshedSession.sessionId = 'session-id';
      refreshedSession.securityToken = 'new-token';
      refreshedSession.tokenExpiration = new Date(
        '2026-10-20T15:42:42.000Z',
      );

      jest.spyOn(bypassService, 'bypassEnabled').mockReturnValue(true);
      jest.spyOn(bypassService, 'generateToken').mockResolvedValue({
        token: 'new-token',
        expiration: '2026-10-20T15:42:42.000Z',
      });
      jest
        .spyOn(userSessionService, 'findSessionByUserIdAndTokenOnMaster')
        .mockResolvedValue(initialSession);
      jest
        .spyOn(userSessionService, 'findSessionBySessionId')
        .mockResolvedValueOnce(initialSession)
        .mockResolvedValueOnce(refreshedSession);

      await expect(
        service.refreshToken('user', 'old-token', '127.0.0.1'),
      ).resolves.toEqual({
        token: 'new-token',
        expiration: '2026-10-20T15:42:42.000Z',
      });
      expect(userSessionService.replaceSessionTokens).toHaveBeenCalledWith(
        initialSession,
        {
          securityToken: 'new-token',
          idToken: '',
          refreshToken: '',
          tokenExpiration: new Date('2026-10-20T15:42:42.000Z'),
        },
        refreshEntityManager,
      );
    });

    it('should calculate expiration as ISO UTC', () => {
      const dateNowSpy = jest
        .spyOn(Date, 'now')
        .mockReturnValue(Date.parse('2026-10-20T15:42:42.000Z'));

      expect(service.calculateTokenExpirationInMills(120)).toBe(
        '2026-10-20T15:44:42.000Z',
      );

      dateNowSpy.mockRestore();
    });

    it('should persist OIDC refresh tokens with compare-and-swap', async () => {
      const session = new UserSession();
      session.sessionId = 'session-id';
      session.securityToken = 'old-token';
      session.refreshToken = 'old-refresh-token';
      session.tokenVersion = 4;
      const accessTokenResponse = {
        access_token: 'new-token',
        refresh_token: 'new-refresh-token',
        id_token: 'new-id-token',
        expires_in: 120,
      };
      jest
        .spyOn(service as any, 'makeAccessTokenRequestRestCall')
        .mockResolvedValue(accessTokenResponse);
      jest.spyOn(service, 'isOidcTokenValid').mockResolvedValue(true);
      const dateNowSpy = jest
        .spyOn(Date, 'now')
        .mockReturnValue(Date.parse('2026-10-20T15:42:42.000Z'));

      await expect(
        service.updateUserSessionWithNewOidcTokens(session),
      ).resolves.toBe(accessTokenResponse);
      expect(userSessionService.replaceSessionTokens).toHaveBeenCalledWith(
        session,
        {
          securityToken: 'new-token',
          refreshToken: 'new-refresh-token',
          idToken: 'new-id-token',
          tokenExpiration: new Date('2026-10-20T15:44:42.000Z'),
        },
        undefined,
      );

      dateNowSpy.mockRestore();
    });
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
      userSession.tokenExpiration = new Date('3000-01-01T00:00:00.000Z');
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
      userSession.tokenExpiration = new Date('3000-01-01T00:00:00.000Z');
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
      await expect(
        service.validateToken(invalidToken, clientIp),
      ).rejects.toThrow(
        'Your session has expired. Please log out and log back in.',
      );

      jwtDecodeSpy.mockRestore();
    });

    it('should throw UnauthorizedException when token is a string instead of an object', async () => {
      jest.spyOn(bypassService, 'bypassEnabled').mockReturnValue(false);
      const invalidToken = 'invalid-token';
      const clientIp = '127.0.0.1';

      // Mock jwt.decode to return a string
      const jwtDecodeSpy = jest
        .spyOn(require('jsonwebtoken'), 'decode')
        .mockReturnValue('string-token');

      await expect(
        service.validateToken(invalidToken, clientIp),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateToken(invalidToken, clientIp),
      ).rejects.toThrow(
        'Your session has expired. Please log out and log back in.',
      );

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
      userSession.tokenExpiration = new Date('3000-01-01T00:00:00.000Z');
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
      userSession.tokenExpiration = new Date('3000-01-01T00:00:00.000Z');
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
