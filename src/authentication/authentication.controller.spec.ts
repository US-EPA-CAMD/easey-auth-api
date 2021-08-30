import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { Test, TestingModule } from '@nestjs/testing';
import { UserDTO } from '../dtos/user.dto';
import { CredentialsDTO } from '../dtos/credentials.dto';

jest.mock('./authentication.service');

describe('Authentication Controller', () => {
  let controller: AuthenticationController;
  let service: AuthenticationService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [AuthenticationService],
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
});
