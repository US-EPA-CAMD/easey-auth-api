import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from '../token/token.service';
import { AuthenticationService } from './authentication.service';
import { UserDTO } from '../dtos/user.dto';
import { UserSessionDTO } from '../dtos/user-session.dto';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { Logger } from '@us-epa-camd/easey-common/logger';

const client = {
  AuthenticateAsync: jest.fn(() =>
    Promise.resolve([
      { User: { userId: '1', firstName: 'Jeff', lastName: 'Bob' } },
    ]),
  ),
};

let responseVals = {
  ['app.env']: 'development',
  ['cdxBypass.enabled']: true,
  ['cdxBypass.users']: '["kherceg-dp"]',
  ['cdxBypass.pass']: 'password',
};

jest.mock('soap', () => ({
  createClientAsync: jest.fn(() => Promise.resolve(client)),
}));

jest.mock('@us-epa-camd/easey-common/utilities', () => ({
  parseToken: jest.fn().mockReturnValue({ clientIp: '1' }),
}));

const mockTokenService = () => ({
  getSessionStatus: jest.fn().mockResolvedValue({
    exists: false,
    expired: false,
    session: null,
    sessionEntity: null,
  }),

  createUserSession: jest.fn().mockResolvedValue(new UserSessionDTO()),
  removeUserSession: jest.fn(),
  createToken: jest.fn().mockResolvedValue(''),
  unpackToken: jest.fn().mockResolvedValue(''),
  validateToken: jest.fn().mockResolvedValue(''),
  getStringifiedToken: jest.fn().mockResolvedValue(''),
  isBypassSet: jest.fn().mockReturnValue(false),
});

describe('Authentication Service', () => {
  let service: AuthenticationService;
  let tokenService: TokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [
        AuthenticationService,
        {
          provide: TokenService,
          useFactory: mockTokenService,
        },
        Logger,
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

    service = module.get(AuthenticationService);
    tokenService = module.get(TokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('bypassUser()', () => {
    it('should return a new userDTO given a non-existing session and bypass flag set to true', async () => {
      responseVals = {
        ['app.env']: 'development',
        ['cdxBypass.enabled']: true,
        ['cdxBypass.users']: '["kherceg-dp"]',
        ['cdxBypass.pass']: 'IC@nn0tL0g1nIn',
      };
      jest.spyOn(tokenService, 'isBypassSet').mockReturnValue(true);
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleString('default', {
        month: 'long',
      });
      const currentYear = currentDate.getFullYear();
      const currentPass =
        currentMonth + currentYear + responseVals['cdxBypass.pass'];

      const user = await service.bypassUser('kherceg-dp', currentPass);
      expect(user).toEqual(true);
    });

    it('should throw an error given an invalid userId', async () => {
      responseVals = {
        ['app.env']: 'development',
        ['cdxBypass.enabled']: true,
        ['cdxBypass.users']: '["k"]',
        ['cdxBypass.pass']: 'IC@nn0tL0g1nIn',
      };
      jest.spyOn(tokenService, 'isBypassSet').mockReturnValue(true);
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleString('default', {
        month: 'long',
      });
      const currentYear = currentDate.getFullYear();
      const currentPass =
        currentMonth + currentYear + responseVals['cdxBypass.pass'];

      expect(() => {
        service.bypassUser('kherceg-d', currentPass);
      }).toThrowError();
    });

    it('should throw an error given an invalid password', async () => {
      responseVals = {
        ['app.env']: 'development',
        ['cdxBypass.enabled']: true,
        ['cdxBypass.users']: '["kherceg-dp"]',
        ['cdxBypass.pass']: 'password',
      };
      jest.spyOn(tokenService, 'isBypassSet').mockReturnValue(true);

      expect(() => {
        service.bypassUser('kherceg-dp', 'pass');
      }).toThrowError();
    });
  });

  describe('signIn()', () => {
    it('should return a new userDTO given a non-existing session', async () => {
      responseVals = {
        ['app.env']: 'development',
        ['cdxBypass.enabled']: false,
        ['cdxBypass.users']: '["kherceg-dp"]',
        ['cdxBypass.pass']: 'password',
      };
      jest.spyOn(tokenService, 'getSessionStatus').mockResolvedValue({
        exists: false,
        expired: false,
        session: null,
        sessionEntity: null,
      });
      jest.spyOn(service, 'login').mockResolvedValue(new UserDTO());

      const user = await service.signIn('', '', '');

      expect(user).toBeDefined();
    });

    it('should return a existing userDTO given an existing session', async () => {
      responseVals = {
        ['app.env']: 'development',
        ['cdxBypass.enabled']: false,
        ['cdxBypass.users']: '["kherceg-dp"]',
        ['cdxBypass.pass']: 'password',
      };
      jest.spyOn(tokenService, 'getSessionStatus').mockResolvedValue({
        exists: true,
        expired: false,
        session: new UserSessionDTO(),
        sessionEntity: null,
      });

      const user = await service.signIn('', '', '');

      expect(user).toBeDefined();
    });

    it('should return a bypassed userDTO given a bypass flag and valid userId', async () => {
      jest.spyOn(service, 'bypassUser').mockReturnValue(true);

      jest.spyOn(tokenService, 'getSessionStatus').mockResolvedValue({
        exists: false,
        expired: false,
        session: new UserSessionDTO(),
        sessionEntity: null,
      });

      const user = await service.signIn('k', '', '');

      expect(user.userId).toEqual('k');
    });

    describe('login()', () => {
      it('should return a userDTO given an existing session', async () => {
        const dto = await service.login('', '');
        expect(dto.firstName).toEqual('Jeff');
      });
    });

    describe('signOut()', () => {
      it('should return a userDTO given an existing session', async () => {
        jest.spyOn(tokenService, 'unpackToken').mockResolvedValue('');
        jest.spyOn(tokenService, 'getSessionStatus').mockResolvedValue({
          exists: true,
          expired: false,
          session: null,
          sessionEntity: null,
        });
        jest.spyOn(tokenService, 'removeUserSession').mockResolvedValue();

        expect(service.signOut('', '1')).resolves.not.toThrowError();
      });

      it('should throw an error when provided a different Ip', () => {
        jest.spyOn(tokenService, 'unpackToken').mockResolvedValue('');
        jest.spyOn(tokenService, 'getSessionStatus').mockResolvedValue({
          exists: true,
          expired: false,
          session: null,
          sessionEntity: null,
        });
        jest.spyOn(tokenService, 'removeUserSession').mockResolvedValue();

        expect(async () => {
          await service.signOut('', '2');
        }).rejects.toThrowError();
      });

      it('should throw an error when provided a non existing session', () => {
        jest.spyOn(tokenService, 'unpackToken').mockResolvedValue('');
        jest.spyOn(tokenService, 'getSessionStatus').mockResolvedValue({
          exists: false,
          expired: false,
          session: null,
          sessionEntity: null,
        });
        jest.spyOn(tokenService, 'removeUserSession').mockResolvedValue();

        expect(async () => {
          await service.signOut('', '1');
        }).rejects.toThrowError();
      });
    });
  });
});
