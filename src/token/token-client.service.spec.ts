import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { ValidateClientTokenParamsDTO } from '../dtos/validate-client-token.dto';
import { ApiRepository } from './api.repository';
import { TokenClientService } from './token-client.service';
import { sign } from 'jsonwebtoken';
import { Api } from '../entities/api.entity';

let responseVals = {
  ['app.env']: '["dev"]',
  ['cdxBypass.enabled']: true,
};

const mockRepo = () => ({
  findOne: jest.fn(),
});

describe('Token Client Service', () => {
  let service: TokenClientService;
  let repo: ApiRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        TokenClientService,
        Logger,
        {
          provide: ApiRepository,
          useFactory: mockRepo,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              return responseVals[key];
            }),
          },
        },
      ],
    }).compile();

    repo = module.get(ApiRepository);
    service = module.get(TokenClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateClientToken', () => {
    it('should return true given valid token', async () => {
      const validateClientTokenParams = new ValidateClientTokenParamsDTO();
      validateClientTokenParams.clientId = 'TEST';
      validateClientTokenParams.clientToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXNzQ29kZSI6InBhc3MiLCJpYXQiOjE2NTUzMTc4NzV9.B4pzbI8SBm5mExF3-zIzyXVzLONwIYPFwm3QhtdNiZ4';

      const dbResult = new Api();
      dbResult.passCode = 'pass';
      dbResult.encryptionKey = 'phrase';

      repo.findOne = jest.fn().mockResolvedValue(dbResult);

      expect(await service.validateClientToken(validateClientTokenParams)).toBe(
        true,
      );
    });

    it('should error given missing params', async () => {
      const validateClientTokenParams = new ValidateClientTokenParamsDTO();
      validateClientTokenParams.clientId = 'TEST';

      let errored = false;

      try {
        await service.validateClientToken(validateClientTokenParams);
      } catch (e) {
        errored = true;
      }

      expect(errored).toBe(true);
    });
  });
});
