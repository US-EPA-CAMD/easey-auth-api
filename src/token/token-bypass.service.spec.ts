import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule, Logger } from '@us-epa-camd/easey-common/logger';
import { UserSessionService } from '../user-session/user-session.service';
import { TokenBypassService } from './token-bypass.service';

let responseVals = {
  ['app.env']: '["dev"]',
  ['cdxBypass.enabled']: true,
};

const mockUserSession = () => ({
  updateUserSessionToken: jest.fn(),
});

describe('Token Bypass Service', () => {
  let service: TokenBypassService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [
        TokenBypassService,
        Logger,
        {
          provide: UserSessionService,
          useFactory: mockUserSession,
        },
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

    service = module.get(TokenBypassService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isBypassSet', () => {
    it('should return true given non prod environment and set bypass flag', async () => {
      expect(service.isBypassSet()).toBe(true);
    });

    it('should return false given prod environment', async () => {
      responseVals['app.env'] = 'production';
      expect(service.isBypassSet()).toBe(false);
    });
  });

  describe('generateBypassToken', () => {
    it('should return new generated token for user and not error out', async () => {
      expect(() => {
        service.generateBypassToken('', '', '');
      }).not.toThrowError();
    });
  });
});
