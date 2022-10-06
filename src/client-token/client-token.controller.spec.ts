import { Test, TestingModule } from '@nestjs/testing';
import { ClientCredentialsDTO } from '../dtos/client-credentials.dto';
import { TokenDTO } from '../dtos/token.dto';
import { ClientIdDTO } from '../dtos/client-id.dto';
import { ClientTokenController } from './client-token.controller';
import { ClientTokenService } from './client-token.service';

jest.mock('./client-token.service');
jest.mock('../guards/client-token.guard');

const mockService = () => ({
  validateToken: jest.fn().mockResolvedValue(true),
  generateToken: jest.fn(),
});

describe('Client Token Controller', () => {
  let controller: ClientTokenController;
  let service: ClientTokenService;
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      controllers: [ClientTokenController],
      providers: [{ provide: ClientTokenService, useFactory: mockService }],
    }).compile();
    controller = module.get(ClientTokenController);
    service = module.get(ClientTokenService);
  });
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('validateClientToken', async () => {
    expect(await controller.validateToken(new ClientIdDTO(), '')).toEqual(true);
  });

  it('generateClientToken', async () => {
    const tokenDto = new TokenDTO();
    service.generateToken = jest.fn().mockResolvedValue(tokenDto);
    expect(await controller.generateToken(new ClientCredentialsDTO())).toBe(
      tokenDto,
    );
  });
});
