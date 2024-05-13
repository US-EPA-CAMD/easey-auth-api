import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { ClientTokenService } from './client-token.service';
import { ClientTokenRepository } from './client-token.repository';
import { ClientConfig } from '../entities/client-config.entity';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockReturnValue({
    passCode: 'passcode',
  }),
  sign: jest.fn().mockReturnValue('token'),
}));

let responseVals = {
  ['app.clientTokenDurationMinutes']: 1,
};

const mockRepo = () => ({
  validateToken: jest.fn().mockResolvedValue(true),
  generateToken: jest.fn(),
});

describe('Token Service', () => {
  let service: ClientTokenService;
  let repo: ClientTokenRepository;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              return responseVals[key];
            }),
          },
        },
        {
          provide: ClientTokenRepository,
          useFactory: mockRepo,
        },
        ClientTokenService,
      ],
    }).compile();
    service = module.get(ClientTokenService);
    repo = module.get(ClientTokenRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateToken', () => {
    it('should fail when client Id and client Token is null', async () => {
      expect(async () => {
        await service.validateToken(null, null);
      }).rejects.toThrowError();
    });

    it('should fail when client id is invalid', async () => {
      repo.findOneBy = jest.fn().mockResolvedValue(null);

      expect(async () => {
        await service.validateToken('id', 'token');
      }).rejects.toThrowError();
    });

    it('should fail when encrypted passcode is different for client', async () => {
      const clientConfig = new ClientConfig();
      clientConfig.passCode = 'passcode_error';

      repo.findOneBy = jest.fn().mockResolvedValue(clientConfig);

      expect(async () => {
        await service.validateToken('id', 'token');
      }).rejects.toThrowError();
    });

    it('should pass when encrypted passcode is correct for client', async () => {
      const clientConfig = new ClientConfig();
      clientConfig.passCode = 'passcode';

      repo.findOneBy = jest.fn().mockResolvedValue(clientConfig);

      expect(await service.validateToken('id', 'token')).toBe(true);
    });
  });

  describe('generateToken', () => {
    it('should fail when client Id and client Secret is null', async () => {
      expect(async () => {
        await service.generateToken(null, null);
      }).rejects.toThrowError();
    });

    it('should fail when client id is invalid', async () => {
      repo.findOneBy = jest.fn().mockResolvedValue(null);

      expect(async () => {
        await service.generateToken('id', 'secret');
      }).rejects.toThrowError();
    });

    it('should pass and return a new token dto', async () => {
      const clientConfig = new ClientConfig();
      clientConfig.passCode = 'passcode_error';

      repo.findOneBy = jest.fn().mockResolvedValue(clientConfig);

      const tokenDto = await service.generateToken('id', 'secret');

      expect(tokenDto.token).toEqual('token');
    });
  });
});
