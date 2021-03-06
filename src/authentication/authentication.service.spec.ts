import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationService } from './authentication.service';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { AuthenticationBypassService } from './authentication-bypass.service';
import { TokenBypassService } from '../token/token-bypass.service';
import { UserSessionService } from '../user-session/user-session.service';
import { HttpService } from '@nestjs/axios';
import { UserDTO } from '../dtos/user.dto';
import { TokenDTO } from '../dtos/token.dto';

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
  ['app.cdxSvcs']: '',
  ['cdxBypass.mockPermissionsEnabled']: false,
};

const client = {
  AuthenticateAsync: jest.fn(() =>
    Promise.resolve([
      { User: { userId: '1', firstName: 'Jeff', lastName: 'Bob' } },
    ]),
  ),
  RetrievePrimaryOrganizationAsync: jest
    .fn()
    .mockResolvedValue([{ result: { email: 'email' } }]),
};

jest.mock('@us-epa-camd/easey-common/utilities', () => ({
  parseToken: jest.fn().mockReturnValue({ clientIp: '1' }),
}));

describe('Authentication Service', () => {
  let service: AuthenticationService;
  let tokenBypassService: TokenBypassService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        AuthenticationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              return responseVals[key];
            }),
          },
        },
        AuthenticationBypassService,
        TokenBypassService,
        {
          provide: UserSessionService,
          useFactory: () => ({
            findSessionByUserIdAndToken: jest.fn(),
            removeUserSessionByUserId: jest.fn(),
            createUserSession: jest.fn().mockResolvedValue(new TokenDTO()),
          }),
        },
        {
          provide: HttpService,
          useFactory: () => ({
            get: jest.fn(),
          }),
        },
        Logger,
      ],
    }).compile();

    tokenBypassService = module.get(TokenBypassService);
    service = module.get(AuthenticationService);
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
      expect(() => {
        service.signOut('', '');
      }).not.toThrowError();
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
      jest.spyOn(tokenBypassService, 'isBypassSet').mockReturnValue(false);
      jest.spyOn(service, 'loginCdx').mockResolvedValue(mockedUser);
      jest
        .spyOn(service, 'getStreamlinedRegistrationToken')
        .mockResolvedValue('');
      jest.spyOn(service, 'getUserEmail').mockResolvedValue('');

      const user = await service.signIn('', '', '');

      expect(user.firstName).toEqual(mockedUser.firstName);
    });
  });
});
