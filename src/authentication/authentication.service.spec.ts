import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from '../token/token.service';
import { AuthenticationService } from './authentication.service';
import { UserDTO } from '../dtos/user.dto';
import { UserSessionDTO } from '../dtos/user-session.dto';

const client = {
  AuthenticateAsync: jest.fn(() =>
    Promise.resolve([{ User: { userId: '1' } }]),
  ),
};

jest.mock('soap', () => ({
  createClientAsync: jest.fn(() => Promise.resolve(client)),
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
});

describe('Authentication Service', () => {
  let service: AuthenticationService;
  let tokenService: TokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: TokenService,
          useFactory: mockTokenService,
        },
        ConfigService,
      ],
    }).compile();

    service = module.get(AuthenticationService);
    tokenService = module.get(TokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signIn()', () => {
    it('should return a new userDTO given a non-existing session', async () => {
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
      jest.spyOn(tokenService, 'getSessionStatus').mockResolvedValue({
        exists: true,
        expired: false,
        session: new UserSessionDTO(),
        sessionEntity: null,
      });

      const user = await service.signIn('', '', '');

      expect(user).toBeDefined();
    });

    it('should throw a BadRequestException given an existing, expired session', async () => {
      jest.spyOn(tokenService, 'getSessionStatus').mockResolvedValue({
        exists: true,
        expired: true,
        session: null,
        sessionEntity: null,
      });

      expect(async () => {
        await service.signIn('', '', '');
      }).rejects.toThrowError();
    });
  });

  describe('login()', () => {
    it('should return a userDTO given an existing session', async () => {
      const dto = await service.login('', '');
      expect(dto.userId).toEqual('1');
    });
  });
});
