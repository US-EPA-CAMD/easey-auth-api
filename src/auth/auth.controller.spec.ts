import { Test, TestingModule } from '@nestjs/testing';
import { UserDTO } from '../dtos/user.dto';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { CredentialsDTO } from '../dtos/credentials.dto';

jest.mock('./auth.service');
jest.mock('../guards/auth.guard');
const mockService = () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
});
describe('Authentication Controller', () => {
  let controller: AuthController;
  let service: AuthService;
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useFactory: mockService },
        ConfigService,
      ],
    }).compile();
    controller = module.get(AuthController);
    service = module.get(AuthService);
  });
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    it('should return a new or existing UserDTO', async () => {
      const data = new UserDTO();
      jest.spyOn(service, 'signIn').mockResolvedValue(data);
      const cred = new CredentialsDTO();
      expect(await controller.signIn(cred, '')).toBe(data);
    });
  });

  describe('signOut', () => {
    it('should call the service sign out given a valid request', async () => {
      const signOut = jest.spyOn(service, 'signOut').mockResolvedValue();
      const user = {
        userId: '',
        sessionId: '',
        expiration: '',
        clientIp: '',
        isAdmin: false,
        roles: [],
      };
      controller.signOut(user, '');
      expect(signOut).toHaveBeenCalled();
    });
  });
});
