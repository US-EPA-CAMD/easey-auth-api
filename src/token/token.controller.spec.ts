import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { TokenController } from './token.controller';
import { TokenService } from './token.service';
import { TokenClientService } from './token-client.service';
import { ValidateClientTokenParamsDTO } from '../dtos/validate-client-token.dto';
import { ValidateClientIdParamsDTO } from '../dtos/validate-client-id.dto';
import { UserTokenDTO } from '../dtos/userToken.dto';

const mockTokenService = () => ({
  refreshToken: jest.fn(),
  validateToken: jest.fn(),
});

const mockClientTokenService = () => ({
  validateClientToken: jest.fn(),
  generateClientToken: jest.fn(),
});

describe('Authentication Controller', () => {
  let controller: TokenController;
  let service: TokenService;
  let clientService: TokenClientService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      controllers: [TokenController],
      providers: [
        { provide: TokenService, useFactory: mockTokenService },
        { provide: TokenClientService, useFactory: mockClientTokenService },
      ],
    }).compile();

    controller = module.get(TokenController);
    service = module.get(TokenService);
    clientService = module.get(TokenClientService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('validateClientToken', async () => {
    await controller.validateClientToken(new ValidateClientTokenParamsDTO());
    expect(clientService.validateClientToken).toHaveBeenCalled();
  });

  it('genClientToken', async () => {
    await controller.genClientToken(new ValidateClientIdParamsDTO());
    expect(clientService.generateClientToken).toHaveBeenCalled();
  });

  it('createToken', async () => {
    await controller.createToken(new UserTokenDTO(), '');
    expect(service.refreshToken).toHaveBeenCalled();
  });

  it('validateToken', async () => {
    await controller.validateToken(new UserTokenDTO(), '');
    expect(service.validateToken).toHaveBeenCalled();
  });
});
