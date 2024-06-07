import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { TokenService } from '../token/token.service';
import { UserSessionService } from '../user-session/user-session.service';
import { PermissionsService } from '../permissions/Permissions.service';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { BypassService } from '../oidc/Bypass.service';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { ConfigService } from '@nestjs/config';
import { AccessTokenResponse } from '../dtos/oidc-auth-dtos';
import { OidcAuthValidationRequestDto } from '../dtos/oidc-auth-validation-request.dto';
import { UserSession } from '../entities/user-session.entity';

jest.mock('soap', () => ({
  createClientAsync: jest.fn(),
}));
jest.mock('@nestjs/axios', () => ({
  HttpService: jest.fn(),
}));
jest.mock('@us-epa-camd/easey-common/utilities', () => ({
  getConfigValue: jest.fn().mockReturnValue('http://api-url.com'),
}));
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual<typeof jwt>('jsonwebtoken'),
  decode: jest.fn().mockReturnValue({
    header: {},
    payload: {
      userId: 'user1',
      given_name: 'John',
      family_name: 'Doe',
    },
    signature: 'signature',
  }),
}));

describe('AuthService', () => {
  let service: AuthService;
  let tokenService: TokenService;
  let userSessionService: UserSessionService;
  let permissionsService: PermissionsService;
  let oidcHelperService: OidcHelperService;
  let bypassService: BypassService;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: TokenService,
          useValue: {
            getCdxApiToken: jest.fn().mockResolvedValue('api-token'),
            exchangeAuthCodeForToken: jest.fn(),
            signOut: jest.fn(),
            calculateTokenExpirationInMills: jest.fn(),
          },
        },
        {
          provide: UserSessionService,
          useValue: {
            findSessionByUserId: jest.fn(),
            createUserSession: jest.fn(),
            updateSession: jest.fn(),
            removeUserSessionByUserId: jest.fn(),
            refreshLastActivity: jest.fn(),
            findSessionBySessionId: jest.fn().mockResolvedValue({
              userId: 'user1',
              roles: JSON.stringify(['role1']),
              facilities: JSON.stringify(['facility1']),
            }),
            findSessionByUserIdAndToken: jest.fn().mockResolvedValue({
              userId: 'user1',
              token: 'token',
            }),
          },
        },
        {
          provide: PermissionsService,
          useValue: {
            retrieveAllUserRoles: jest.fn().mockResolvedValue(['role1']),
            retrieveAllUserFacilities: jest
              .fn()
              .mockResolvedValue(['facility1']),
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
          provide: BypassService,
          useValue: {
            bypassEnabled: jest.fn().mockReturnValue(false),
            getBypassUser: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            error: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
          },
        },
        ConfigService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    tokenService = module.get<TokenService>(TokenService);
    userSessionService = module.get<UserSessionService>(UserSessionService);
    permissionsService = module.get<PermissionsService>(PermissionsService);
    oidcHelperService = module.get<OidcHelperService>(OidcHelperService);
    bypassService = module.get<BypassService>(BypassService);
    logger = module.get<Logger>(Logger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('determinePolicy', () => {
    it('should return a PolicyResponse based on userId', async () => {
      const response = { policy: 'Standard' };
      jest
        .spyOn(oidcHelperService, 'determinePolicy')
        .mockResolvedValue(response);
      const result = await service.determinePolicy('user1');
      expect(result).toEqual(response);
    });
  });

  describe('validateAndCreateSession', () => {
    it('should create and return a session', async () => {
      const oidcResponse = {
        isValid: true,
        userId: 'user1',
        policy: 'policy1',
      };
      jest
        .spyOn(oidcHelperService, 'validateOidcPostRequest')
        .mockResolvedValue(oidcResponse);
      const userSession = new UserSession();
      userSession.sessionId = 'session123';
      userSession.tokenExpiration = 'expiration';
      jest
        .spyOn(userSessionService, 'createUserSession')
        .mockResolvedValue(userSession);

      const requestDto = new OidcAuthValidationRequestDto();
      const result = await service.validateAndCreateSession(
        requestDto,
        '127.0.0.1',
      );
      expect(result.userSession).toBeDefined();
    });
  });

  describe('signIn', () => {
    it('should sign in a user and return UserDTO', async () => {
      const token = jwt.sign(
        {
          userId: 'user1',
          given_name: 'John',
          family_name: 'Doe',
        },
        'your_secret_key',
      );
      const accessTokenResponse: AccessTokenResponse = {
        access_token: 'dummy_access_token',
        token_type: 'Bearer',
        expires_in: 3600,

        id_token: 'dummy_id_token',
        id_token_expires_in: '3600',
        profile_info: 'dummy_profile_info',
        scope: 'openid email profile',
        refresh_token: 'dummy_refresh_token',
        refresh_token_expires_in: '7200',
      };
      jest
        .spyOn(tokenService, 'exchangeAuthCodeForToken')
        .mockResolvedValue(accessTokenResponse);
      jest
        .spyOn(tokenService, 'calculateTokenExpirationInMills')
        .mockReturnValue('3600000');

      const result = await service.signIn(
        { sessionId: 'session123' },
        '127.0.0.1',
      );
      expect(result.token).toEqual('dummy_access_token');
      expect(result.tokenExpiration).toEqual('3600000');
    });
  });

  describe('updateLastActivity', () => {
    it('should update last activity without throwing an error', async () => {
      await expect(
        service.updateLastActivity('some-token'),
      ).resolves.not.toThrow();
    });
  });

  describe('signOut', () => {
    it('should remove user session successfully', async () => {
      await service.signOut('user1', 'some-token');
      expect(userSessionService.removeUserSessionByUserId).toHaveBeenCalledWith(
        'user1',
      );
    });
  });
});
