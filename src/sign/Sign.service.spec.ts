import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { CertificationVerifyParamDTO } from '../dtos/certification-verify-param.dto';
import { CredentialsSignDTO } from '../dtos/certification-sign-param.dto';
import { SignService } from './Sign.service';
import { SendPhonePinParamDTO } from '../dtos/send-phone-pin-param.dto';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';
import { TokenService } from '../token/token.service';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { OidcHelperModule } from '../oidc/OidcHelper.module';
import { UserSessionModule } from '../user-session/user-session.module';
import { TokenModule } from '../token/token.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { UserSession } from '../entities/user-session.entity';
import { ClientTokenRepository } from '../client-token/client-token.repository';
import { UserSessionService } from '../user-session/user-session.service';
import { SignAuthResponseDTO } from '../dtos/sign-auth-response.dto';

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

const mockUserSessionService = () => ({
  findSessionByUserId: jest.fn().mockResolvedValue(new UserSession() ),
});

const mockOidcHelperService = () => ({
  makePostRequestForFile: jest.fn().mockResolvedValue(new SignAuthResponseDTO() ),
  makePostRequestJson: jest.fn().mockResolvedValue(new SignAuthResponseDTO() ),
});

const mockTokenService = () => ({
  validateClientIp: jest.fn(),
});

describe('SignService', () => {
  let service: SignService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [SignService, ConfigService,
        {
          provide: UserSessionService,
          useValue: mockUserSessionService,
        },
        {
          provide: OidcHelperService,
          useValue: mockOidcHelperService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
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
