import { Test, TestingModule } from '@nestjs/testing';
import { UserIdDTO } from '../dtos/user-id.dto';
import { ValidateTokenDTO } from '../dtos/validate-token.dto';
import { TokenController } from './token.controller';
import { TokenService } from './token.service';

jest.mock('./token.service');

describe('Token Controller', () => {
  let controller: TokenController;
  let service: TokenService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TokenController],
      providers: [TokenService],
    }).compile();

    controller = module.get(TokenController);
    service = module.get(TokenService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Post Methods', () => {
    it('Should create a security token for a valid user', async () => {
      const data = 'csm:enneofnoe';

      jest.spyOn(service, 'createToken').mockResolvedValue(data);

      expect(await controller.createToken(new UserIdDTO(), '')).toBe(data);
    });

    it('Should return a validated token to the user', async () => {
      const data = 'csm:enneofnoe';

      jest.spyOn(service, 'validateToken').mockResolvedValue(data);

      expect(await controller.validateToken(new ValidateTokenDTO(), '')).toBe(
        data,
      );
    });
  });
});
