import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { CertificationVerifyParamDTO } from '../dtos/certification-verify-param.dto';
import { CredentialsSignDTO } from '../dtos/certification-sign-param.dto';

import { SignController } from './Sign.controller';
import { SignService } from './Sign.service';

const mockService = () => ({
  authenticate: jest.fn(),
});

describe('SignController', () => {
  let controller: SignController;
  let service: SignService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      controllers: [SignController],
      providers: [
        {
          provide: SignService,
          useFactory: mockService,
        },
      ],
    }).compile();

    controller = module.get<SignController>(SignController);
    service = module.get<SignService>(SignService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call the authenticate service method', async () => {
    const mockFunction = jest.fn();
    service.authenticate = mockFunction;

    await controller.authenticate(new CredentialsSignDTO());

    expect(mockFunction).toHaveBeenCalled();
  });

  it('should call the validate service method', async () => {
    const mockFunction = jest.fn();
    service.validate = mockFunction;

    await controller.validate(new CertificationVerifyParamDTO());

    expect(mockFunction).toHaveBeenCalled();
  });
});
