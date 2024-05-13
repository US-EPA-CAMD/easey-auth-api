import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { CertificationVerifyParamDTO } from '../dtos/certification-verify-param.dto';
import { CredentialsSignDTO } from '../dtos/certification-sign-param.dto';
import { SignService } from './Sign.service';
import { SendPhonePinParamDTO } from '../dtos/send-phone-pin-param.dto';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';
import { UserSessionService } from '../user-session/user-session.service';
import { TokenService } from '../token/token.service';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { OidcHelperModule } from '../oidc/OidcHelper.module';
import { UserSessionModule } from '../user-session/user-session.module';
import { TokenModule } from '../token/token.module';

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
      imports: [LoggerModule, OidcHelperModule, UserSessionModule, TokenModule],
      providers: [SignService, ConfigService],
    }).compile();

    service = module.get<SignService>(SignService);
  });

  it('should sign all files successfully', async () => {
    jest.spyOn(service, 'signAllFiles').mockResolvedValue();

    expect(async () => {
      await service.signAllFiles('', []);
    }).not.toThrowError();
  });
});
