import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ValidateClientTokenParamsDTO } from '../dtos/validate-client-token.dto';
import { ClientTokenRepository } from './client-token.repository';
import { ClientTokenService } from './client-token.service';
import { ClientConfig } from '../entities/client-config.entity';
import { ValidateClientIdParamsDTO } from '../dtos/validate-client-id.dto';

let responseVals = {
  ['app.env']: '["dev"]',
  ['cdxBypass.enabled']: true,
  ['app.clientTokenDurationMinutes']: 10,
};

const mockRepository = () => ({
  findOne: jest.fn(),
});

describe('ClientTokenService', () => {
  let service: ClientTokenService;
  let repository: ClientTokenRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientTokenService,
        {
          provide: ClientTokenRepository,
          useFactory: mockRepository,
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

    service = module.get(ClientTokenService);
    repository = module.get(ClientTokenRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
  });

  describe('generateToken', () => {
    it('should generate new token successfully', async () => {
      const validateClientTokenParams = new ValidateClientIdParamsDTO();
      validateClientTokenParams.clientId = 'test';
      validateClientTokenParams.clientSecret = 'test';
      const dbResult = new ClientConfig();
      dbResult.passCode = 'pass';
      dbResult.encryptionKey = 'phrase';
      repository.findOne = jest.fn().mockResolvedValue(dbResult);

      let errored = false;
      try {
        await service.generateToken(validateClientTokenParams);
      } catch (e) {
        errored = true;
      }

      expect(errored).toBe(false);
    });

    it('should error not given proper paramaters', async () => {
      const validateClientTokenParams = new ValidateClientIdParamsDTO();
      validateClientTokenParams.clientId = 'test';

      let errored = false;
      try {
        await service.generateToken(validateClientTokenParams);
      } catch (e) {
        errored = true;
      }

      expect(errored).toBe(true);
    });

    it('should error not finding a corresponding database record', async () => {
      const validateClientTokenParams = new ValidateClientIdParamsDTO();
      validateClientTokenParams.clientId = 'test';
      validateClientTokenParams.clientSecret = 'test';

      repository.findOne = jest.fn().mockResolvedValue(undefined);

      let errored = false;
      try {
        await service.generateToken(validateClientTokenParams);
      } catch (e) {
        errored = true;
      }

      expect(errored).toBe(true);
    });
  });

  describe('validateToken', () => {
    it('should return true given valid token', async () => {
      const validateClientTokenParams = new ValidateClientTokenParamsDTO();
      validateClientTokenParams.clientId = 'TEST';
      validateClientTokenParams.clientToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXNzQ29kZSI6InBhc3MiLCJpYXQiOjE2NTUzMTc4NzV9.B4pzbI8SBm5mExF3-zIzyXVzLONwIYPFwm3QhtdNiZ4';

      const dbResult = new ClientConfig();
      dbResult.passCode = 'pass';
      dbResult.encryptionKey = 'phrase';

      repository.findOne = jest.fn().mockResolvedValue(dbResult);

      expect(await service.validateToken(validateClientTokenParams)).toBe(
        true,
      );
    });

    it('should error given missing params', async () => {
      const validateClientTokenParams = new ValidateClientTokenParamsDTO();
      validateClientTokenParams.clientId = 'TEST';

      let errored = false;

      try {
        await service.validateToken(validateClientTokenParams);
      } catch (e) {
        errored = true;
      }

      expect(errored).toBe(true);
    });

    it('should fail given no matching database records', async () => {
      const validateClientTokenParams = new ValidateClientTokenParamsDTO();
      validateClientTokenParams.clientId = 'TEST';
      validateClientTokenParams.clientToken = 'TEST';

      repository.findOne = jest.fn().mockResolvedValue(undefined);

      let errored = false;

      try {
        await service.validateToken(validateClientTokenParams);
      } catch (e) {
        errored = true;
      }

      expect(errored).toBe(true);
    });

    it('should fail given invalid passcode', async () => {
      const validateClientTokenParams = new ValidateClientTokenParamsDTO();
      validateClientTokenParams.clientId = 'TEST';
      validateClientTokenParams.clientToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXNzQ29kZSI6InBhc3NlZCIsImlhdCI6MTY1NTM5MzM4OH0.J0qeCekHjBELCrDtpYJyd-VAAH9hreGp378CxUoRIo8';

      const dbResult = new ClientConfig();
      dbResult.passCode = 'pass';
      dbResult.encryptionKey = 'phrase';

      repository.findOne = jest.fn().mockResolvedValue(dbResult);

      let errored = false;

      try {
        await service.validateToken(validateClientTokenParams);
      } catch (e) {
        errored = true;
      }

      expect(errored).toBe(true);
    });
  });
});
