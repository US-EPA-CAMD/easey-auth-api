import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule, Logger } from '@us-epa-camd/easey-common/logger';
import { UserSessionService } from '../user-session/user-session.service';
import { UserTokenDTO } from '../dtos/userToken.dto';
import { AuthenticationBypassService } from './authentication-bypass.service';

let responseVals = {
  ['cdxBypass.users']: '["kherceg-dp"]',
  ['cdxBypass.pass']: 'password',
};

const mockUserSession = () => ({
  createUserSession: jest.fn().mockResolvedValue(new UserTokenDTO()),
});

describe('Authentication Bypass Service', () => {
  let service: AuthenticationBypassService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [
        AuthenticationBypassService,
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

    service = module.get(AuthenticationBypassService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should pass given proper input', () => {
    expect(() => {
      service.bypassSignIn('kherceg-dp', 'password', '1');
    }).not.toThrowError();
  });

  it('should error given invalid userId', async () => {
    let errored = false;
    try {
      await service.bypassSignIn('kherceg-d', 'password', '1');
    } catch (e) {
      errored = true;
    }

    expect(errored).toBe(true);
  });

  it('should error given invalid password', async () => {
    let errored = false;
    try {
      await service.bypassSignIn('kherceg-dp', 'err', '1');
    } catch (e) {
      errored = true;
    }

    expect(errored).toBe(true);
  });
});
