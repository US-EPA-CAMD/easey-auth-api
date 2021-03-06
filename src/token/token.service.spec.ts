import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { TokenBypassService } from './token-bypass.service';
import { UserSessionService } from '../user-session/user-session.service';
import { TokenDTO } from '../dtos/token.dto';
import { TokenService } from './token.service';
import { UserSession } from '../entities/user-session.entity';

jest.mock('soap', () => ({
  createClientAsync: jest.fn(() => Promise.resolve(client)),
}));

let responseVals = {
  ['app.env']: 'development',
  ['app.cdxSvcs']: '',
  ['cdxBypass.mockPermissionsEnabled']: false,
};

const client = {
  CreateSecurityTokenAsync: jest.fn().mockResolvedValue([{ return: 'token' }]),
  ValidateAsync: jest.fn().mockResolvedValue([{ return: 'validated' }]),
};

jest.mock('@us-epa-camd/easey-common/utilities', () => ({
  parseToken: jest.fn().mockReturnValue({ clientIp: '1' }),
}));

describe('Token Service', () => {
  let service: TokenService;
  let tokenBypassService: TokenBypassService;
  let userSessionService: UserSessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
          }),
        },
        Logger,
        TokenBypassService,
        TokenService,
      ],
    }).compile();

    tokenBypassService = module.get(TokenBypassService);
    service = module.get(TokenService);
    userSessionService = module.get(UserSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('refreshToken', () => {
    it('should issue a token for the user', async () => {
      jest.spyOn(tokenBypassService, 'isBypassSet').mockReturnValue(false);
      jest.spyOn(service, 'generateToken').mockResolvedValue('');
      jest
        .spyOn(userSessionService, 'findSessionByUserIdAndToken')
        .mockResolvedValue(new UserSession());

      await service.refreshToken('', '', '');

      expect(service.generateToken).toHaveBeenCalled();
    });

    it('should issue a new bypass token for the user', async () => {
      jest.spyOn(tokenBypassService, 'isBypassSet').mockReturnValue(true);
      jest
        .spyOn(tokenBypassService, 'generateBypassToken')
        .mockResolvedValue(new TokenDTO());
      jest.spyOn(service, 'generateToken').mockResolvedValue('');
      jest
        .spyOn(userSessionService, 'findSessionByUserIdAndToken')
        .mockResolvedValue(new UserSession());

      await service.refreshToken('', '', '');

      expect(tokenBypassService.generateBypassToken).toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('should generate a token for user', async () => {
      const tok = await service.generateToken('', '', '');
      expect(tok.token).toEqual('token');
    });
  });

  describe('unencryptToken', () => {
    it('should unencrypt a user token', async () => {
      jest.spyOn(tokenBypassService, 'isBypassSet').mockReturnValue(false);
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

      expect(await service.validateToken('', '')).toEqual('token');
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
