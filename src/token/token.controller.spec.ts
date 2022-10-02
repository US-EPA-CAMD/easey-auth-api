import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { TokenController } from './token.controller';
import { TokenService } from './token.service';

jest.mock('./token.service');
jest.mock('../guards/auth.guard');

let responseVals = {
  ['app.env']: 'development',
};

const mockService = () => ({
  validateToken: jest.fn(),
  refreshToken: jest.fn(),
});
describe('Token Controller', () => {
  let controller: TokenController;
  let service: TokenService;
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      controllers: [TokenController],
      providers: [
        { provide: TokenService, useFactory: mockService },
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
    controller = module.get(TokenController);
    service = module.get(TokenService);
  });
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('validateClientToken', async () => {
    await controller.validateToken('', '');
    expect(service.validateToken).toHaveBeenCalled();
  });

  it('refreshClientToken', async () => {
    await controller.createToken(
      {
        userId: '',
        sessionId: '',
        expiration: '',
        clientIp: '',
        isAdmin: false,
        roles: [],
      },
      '',
      '',
    );
    expect(service.refreshToken).toHaveBeenCalled();
  });
});
