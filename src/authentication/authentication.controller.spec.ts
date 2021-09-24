import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { Test, TestingModule } from '@nestjs/testing';
import { UserDTO } from '../dtos/user.dto';
import { CredentialsDTO } from '../dtos/credentials.dto';
import { AuthGuard } from '../guards/auth.guard';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { createMock } from '@golevelup/ts-jest';

jest.mock('./authentication.service');

const mockRepo = () => ({
  findOne: jest.fn().mockResolvedValue(''),
});

const mockService = () => ({
  signIn: jest.fn().mockResolvedValue(new UserDTO()),
  signOut: jest.fn().mockResolvedValue(true),
});

describe('Authentication Controller', () => {
  let controller: AuthenticationController;
  let service: AuthenticationService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        { provide: AuthenticationService, useFactory: mockService },
        AuthGuard,
        { provide: UserSessionRepository, useFactory: mockRepo },
      ],
    }).compile();

    controller = module.get(AuthenticationController);
    service = module.get(AuthenticationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Post Methods', () => {
    it('should return a new or existing UserDTO', async () => {
      const data = new UserDTO();

      jest.spyOn(service, 'signIn').mockResolvedValue(data);

      const cred = new CredentialsDTO();

      expect(await controller.signIn(cred, '')).toBe(data);
    });
  });

  describe('Sign-Out Controller', () => {
    it('Should call the service sign out given a valid request', async () => {
      const signOut = jest.spyOn(service, 'signOut').mockResolvedValue();
      const mockRequest = createMock<Request>();

      mockRequest.headers['authorization'] = 'Bearer 1';

      controller.signOut(mockRequest, '0');

      expect(signOut).toHaveBeenCalled();
    });
  });
});
