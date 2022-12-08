import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { CertificationVerifyParamDTO } from '../dtos/certification-verify-param.dto';
import { CredentialsSignDTO } from '../dtos/certification-sign-param.dto';
import { SignService } from './Sign.service';

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
    const dto = await service.authenticate(new CredentialsSignDTO());
    expect(dto.activityId).toEqual('mockId');
    expect(dto.question).toEqual('mockQuestion');
    expect(dto.questionId).toEqual('mockId');
  });

  it('validate should be called properly and return true', async () => {
    const result = await service.validate(new CertificationVerifyParamDTO());
    expect(result).toBe(true);
  });
});
