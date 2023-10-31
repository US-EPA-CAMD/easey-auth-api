import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { CertificationVerifyParamDTO } from '../dtos/certification-verify-param.dto';
import { CredentialsSignDTO } from '../dtos/certification-sign-param.dto';
import { SignService } from './Sign.service';
import { SendPhonePinParamDTO } from '../dtos/send-phone-pin-param.dto';

const client = {
  AuthenticateAsync: jest.fn().mockResolvedValue([{ securityToken: '' }]),
  CreateActivityAsync: jest.fn().mockResolvedValue([{ activityId: 'mockId' }]),
  AuthenticateUserAsync: jest.fn(),
  GetQuestionAsync: jest
    .fn()
    .mockResolvedValue([
      { question: { questionId: 'mockId', text: 'mockQuestion' } },
    ]),
  ValidateAnswerAsync: jest.fn().mockResolvedValue(true),
  RetrieveUserMobileAsync: jest.fn().mockResolvedValue([{ return: [] }]),
  GenerateAndSendSecretCodeAsync: jest.fn(),
  ValidateSecretCodeAsync: jest.fn(),
  SignAsync: jest.fn(),
};

jest.mock('soap', () => ({
  createClientAsync: jest.fn(() => Promise.resolve(client)),
}));

describe('SignService', () => {
  let service: SignService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [SignService, ConfigService],
    }).compile();

    service = module.get<SignService>(SignService);
  });

  it('authenticate should be called properly and return the mocked services dto structure', async () => {
    const creds = new CredentialsSignDTO();
    creds.userId = 'mock';

    const dto = await service.authenticate(creds, {
      userId: 'mock',
      roles: ['Submitter'],
    } as any);
    expect(dto.activityId).toEqual('mockId');
    expect(dto.question).toEqual('mockQuestion');
    expect(dto.questionId).toEqual('mockId');
  });

  it('validate should be called properly and return true', async () => {
    const result = await service.validate(new CertificationVerifyParamDTO());
    expect(result).toBe(true);
  });

  it('should call the send phone verification method', async () => {
    expect(async () => {
      await service.sendPhoneVerificationCode(new SendPhonePinParamDTO());
    }).not.toThrowError();
  });

  it('should verify with a pin present', async () => {
    const mockFunc = jest.fn();
    client.ValidateSecretCodeAsync = mockFunc;

    const payload = new CertificationVerifyParamDTO();
    payload.pin = 'mock';
    await service.validate(payload);
    expect(mockFunc).toHaveBeenCalled();
  });

  it('should sign all files successfully', async () => {
    jest.spyOn(service, 'signFile').mockResolvedValue();

    expect(async () => {
      await service.signAllFiles('', []);
    }).not.toThrowError();
  });
});
