import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { EntityManager } from 'typeorm';
import { CredentialsSignDTO } from '../dtos/certification-sign-param.dto';
import { FacilityAccessWithCertStatementFlagDTO } from '../dtos/permissions.dto';
import { SignAuthResponseDTO } from '../dtos/sign-auth-response.dto';
import { SignValidateParamDTO } from '../dtos/sign-validate-param.dto';
import { SignValidateResponseDTO } from '../dtos/sign-validate-response.dto';
import { UserSession } from '../entities/user-session.entity';
import { BypassService } from '../oidc/Bypass.service';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { PermissionsService } from '../permissions/Permissions.service';
import { TokenService } from '../token/token.service';
import { UserSessionService } from '../user-session/user-session.service';
import { SignService } from './Sign.service';

const mockUserSessionService = () => ({
  findSessionByUserId: jest.fn().mockResolvedValue(new UserSession()),
});

const mockOidcHelperService = () => ({
  makePostRequestForFile: jest
    .fn()
    .mockResolvedValue(new SignAuthResponseDTO()),
  makePostRequestJson: jest.fn().mockResolvedValue(new SignAuthResponseDTO()),
});

const mockTokenService = () => ({
  validateClientIp: jest.fn(),
});

const mockBypassService = () => ({
  bypassEnabled: jest.fn(),
});

const mockPermissionsService = () => ({
  retrieveAllUserFacilities: jest.fn().mockResolvedValue(new FacilityAccessWithCertStatementFlagDTO()),
});

describe('SignService', () => {
  let service: SignService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [
        SignService,
        ConfigService,
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
        {
          provide: BypassService,
          useValue: mockBypassService,
        },
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
        {
          provide: EntityManager,
          useValue: { query: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<SignService>(SignService);
  });

  it('should sign all files successfully', async () => {
    jest.spyOn(service, 'signAllFiles').mockResolvedValue();

    expect(async () => {
      await service.signAllFiles('', []);
    }).not.toThrow();
  });

  it('should validate successfully', async () => {
    jest.spyOn(service, 'validate').mockResolvedValue(new SignValidateResponseDTO());

    expect(async () => {
      await service.validate(new SignValidateParamDTO());
    }).not.toThrow();
  });

  it('should create cromerr activity successfully', async () => {
    jest.spyOn(service, 'createCromerrActivity').mockResolvedValue(new SignAuthResponseDTO());

    const currentUser = {
      userId: '',
      sessionId: '',
      expiration: '',
      clientIp: '',
      facilities: [],
      roles: [],
    };
    expect(async () => {
      await service.createCromerrActivity(currentUser, new CredentialsSignDTO(), '');
    }).not.toThrow();
  });

  it('should send to cromerr successfully', async () => {
    jest.spyOn(service, 'sendToCromerr').mockResolvedValue(new SignAuthResponseDTO());

    expect(async () => {
      await service.sendToCromerr('', new CredentialsSignDTO(), '');
    }).not.toThrow();
  });
});
