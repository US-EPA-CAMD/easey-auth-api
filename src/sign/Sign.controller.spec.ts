import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { CertificationVerifyParamDTO } from '../dtos/certification-verify-param.dto';
import { CredentialsSignDTO } from '../dtos/certification-sign-param.dto';

import { SignController } from './Sign.controller';
import { SignService } from './Sign.service';
import { SendPhonePinParamDTO } from '../dtos/send-phone-pin-param.dto';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';
import { SignValidateParamDTO } from '../dtos/sign-validate-param.dto';

const mockService = () => ({
  authenticate: jest.fn(),
  createCromerrActivity: jest.fn(),
  validate: jest.fn(),
  signAllFiles: jest.fn(),
});

jest.mock('./Sign.service');

describe('SignController', () => {
  let controller: SignController;
  let service: SignService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule, HttpModule],
      controllers: [SignController],
      providers: [
        {
          provide: SignService,
          useFactory: mockService,
        },
        ConfigService,
      ],
    }).compile();

    controller = module.get<SignController>(SignController);
    service = module.get<SignService>(SignService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call the createCromerrActivity service method', async () => {
    const mockFunction = jest.fn();
    service.createCromerrActivity = mockFunction;
    const credentialsSignDTO = new CredentialsSignDTO();
    await controller.createCromerrActivity(credentialsSignDTO, null, '');

    expect(mockFunction).toHaveBeenCalled();
  });

  it('should call the validate service method', async () => {
    const mockFunction = jest.fn();
    service.validate = mockFunction;
    const signValidateParamsDTO = new SignValidateParamDTO();
    await controller.validate(signValidateParamsDTO);

    expect(mockFunction).toHaveBeenCalled();
  });

  it('should call the signAllFiles service method', async () => {
    const mockFunction = jest.fn();
    service.signAllFiles = mockFunction;

    await controller.sign('', []);

    expect(mockFunction).toHaveBeenCalled();
  });
});
