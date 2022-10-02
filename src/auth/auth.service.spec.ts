import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { UserSessionService } from '../user-session/user-session.service';
import { HttpService } from '@nestjs/axios';
import { UserDTO } from '../dtos/user.dto';
import { TokenDTO } from '../dtos/token.dto';
import { AuthService } from './auth.service';
import { TokenService } from '../token/token.service';
jest.mock('soap', () => ({
  createClientAsync: jest.fn(() => Promise.resolve(client)),
}));
jest.mock('rxjs', () => ({
  firstValueFrom: jest.fn().mockResolvedValue({
    data: [
      {
        userid: 'test',
        facilities: [
          {
            facilityId: 1,
            orisCode: 1,
            name: '',
            roles: [''],
          },
        ],
      },
    ],
  }),
}));
let responseVals = {
  ['app.env']: 'development',
  ['cdxBypass.pass']: 'pass',
  ['cdxBypass.users']: '["user"]',
  ['app.cdxSvcs']: '',
  ['cdxBypass.mockPermissionsEnabled']: false,
};
const client = {
  AuthenticateAsync: jest.fn(),
  RetrievePrimaryOrganizationAsync: jest.fn(),
};
jest.mock('@us-epa-camd/easey-common/utilities', () => ({
  parseToken: jest.fn().mockReturnValue({ clientIp: '1' }),
}));

describe('Authentication Service', () => {
  let service: AuthService;
  let tokenService: TokenService;
  let userSessionService: UserSessionService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              return responseVals[key];
            }),
          },
        },
        {
          provide: TokenService,
          useFactory: () => ({
            bypassEnabled: jest.fn().mockReturnValue(false),
            generateToken: jest.fn().mockResolvedValue(new TokenDTO()),
          }),
        },
        {
          provide: UserSessionService,
          useFactory: () => ({
            bypass: false,
            findSessionByUserIdAndToken: jest.fn(),
            removeUserSessionByUserId: jest.fn(),
            generateToken: jest.fn(),
            createUserSession: jest.fn().mockResolvedValue(new TokenDTO()),
          }),
        },
        {
          provide: HttpService,
          useFactory: () => ({
            get: jest.fn(),
          }),
        },
      ],
    }).compile();
    service = module.get(AuthService);
    tokenService = module.get(TokenService);
    userSessionService = module.get(UserSessionService);
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStreamlinedRegistrationToken', () => {
    it('should issue a token for the user', async () => {
      client.AuthenticateAsync = jest
        .fn()
        .mockResolvedValue([{ securityToken: '1' }]);
      const token = await service.getStreamlinedRegistrationToken('');
      expect(token).toEqual('1');
    });
  });

  describe('getUserEmail', () => {
    it('should return an email for the user', async () => {
      client.RetrievePrimaryOrganizationAsync = jest
        .fn()
        .mockResolvedValue([{ result: { email: 'email' } }]);
      const email = await service.getUserEmail('', '');
      expect(email).toEqual('email');
    });
  });

  describe('loginCdx', () => {
    it('should perform a login for a user', async () => {
      client.AuthenticateAsync = jest
        .fn()
        .mockResolvedValue([{ User: { firstName: 'k', lastName: 't' } }]);
      const user = await service.loginCdx('', '');
      expect(user.firstName).toEqual('k');
    });
  });

  describe('signOut', () => {
    it('should sign out a user with no error', async () => {
      await service.signOut('', '');
      expect(userSessionService.findSessionByUserIdAndToken).toHaveBeenCalled();
      expect(userSessionService.removeUserSessionByUserId).toHaveBeenCalled();
    });
  });

  describe('getMockPermissions', () => {
    it('should return mock permissions for the user', async () => {
      const permissions = await service.getMockPermissions('test');
      expect(permissions.length).toBe(1);
    });
  });

  describe('signIn', () => {
    it('should sign in a user with no error', async () => {
      const mockedUser = new UserDTO();
      mockedUser.firstName = 'test';
      jest.spyOn(tokenService, 'bypassEnabled').mockReturnValue(false);
      jest.spyOn(service, 'loginCdx').mockResolvedValue(mockedUser);
      jest
        .spyOn(service, 'getStreamlinedRegistrationToken')
        .mockResolvedValue('');
      jest.spyOn(service, 'getUserEmail').mockResolvedValue('');
      const user = await service.signIn('', '', '');
      expect(user.firstName).toEqual(mockedUser.firstName);
    });
  });

  describe('signIn bypassed', () => {
    it('should sign in a user with the bypass flag enabled with no error', async () => {
      jest.spyOn(tokenService, 'bypassEnabled').mockReturnValue(true);
      const user = await service.signIn('user', 'pass', '');
      expect(user.firstName).toEqual('user');
    });
  });

  describe('signIn bypassed error', () => {
    it('should sign in a user with the bypass flag enabled with an error from userId', async () => {
      jest.spyOn(tokenService, 'bypassEnabled').mockReturnValue(true);

      expect(async () => {
        await service.signIn('errors', 'pass', '');
      }).rejects.toThrowError();
    });

    it('should sign in a user with the bypass flag enabled with an error from password', async () => {
      jest.spyOn(tokenService, 'bypassEnabled').mockReturnValue(true);

      expect(async () => {
        await service.signIn('user', 'bad_pass', '');
      }).rejects.toThrowError();
    });
  });
});
