import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ClientTokenController } from './client-token.controller';
import { ClientTokenRepository } from './client-token.repository';
import { ClientTokenService } from './client-token.service';
import { ValidateClientTokenParamsDTO } from '../dtos/validate-client-token.dto';
import { ValidateClientIdParamsDTO } from '../dtos/validate-client-id.dto';
import { TokenDTO } from '../dtos/token.dto';

describe('ClientTokenController', () => {
  let service: ClientTokenService;
  let controller: ClientTokenController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientTokenController],
      providers: [
        ConfigService,
        ClientTokenService,
        ClientTokenRepository,
      ],
    }).compile();

    service = module.get(ClientTokenService);
    controller = module.get(ClientTokenController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });

  describe('validateToken', () => {
    
    it('should call validateToken and return true', async () => {
      const expectedResult = true;
      const params: ValidateClientTokenParamsDTO = {
        clientId: '',
        clientToken: '',
      };

      jest.spyOn(
        service,
        'validateToken'
      ).mockResolvedValue(
        expectedResult
      );
      
      expect(
        await controller.validateToken(params)
      ).toBe(
        expectedResult
      );
    });

  });

  describe('generateToken', () => {
    
    it('should call generateToken and return a token', async () => {
      const expectedResult: TokenDTO = new TokenDTO;
      const params: ValidateClientIdParamsDTO = {
        clientId: '',
        clientSecret: '',
      };

      jest.spyOn(
        service,
        'generateToken'
      ).mockResolvedValue(
        expectedResult
      );
      
      expect(
        await controller.generateToken(params)
      ).toBe(
        expectedResult
      );
    });

  });
});