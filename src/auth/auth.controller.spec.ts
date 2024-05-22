import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { SignInDTO } from '../dtos/signin.dto';
import { CredentialsDTO } from '../dtos/credentials.dto';
import { UserIdDTO } from '../dtos/user-id.dto';
import { OidcAuthValidationRequestDto } from '../dtos/oidc-auth-validation-request.dto';
import { UserDTO } from '../dtos/user.dto';
import { OidcAuthValidationResponseDto } from '../dtos/oidc-auth-validation-response.dto';
import { UserSession } from '../entities/user-session.entity';
import { Logger } from '@us-epa-camd/easey-common/logger';

// This is for getConfig value calls to get env variables
jest.mock('@us-epa-camd/easey-common/utilities', () => ({
  getConfigValue: jest.fn().mockReturnValue('http://redirect-url.com'),
}));

jest.mock('./auth.service');
jest.mock('../guards/auth.guard');
jest.mock('express', () => ({
  Response: jest.fn(() => ({
    redirect: jest.fn(),
  })),
}));

const mockService = () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  updateLastActivity: jest.fn(),
  determinePolicy: jest.fn(),
  validateAndCreateSession: jest.fn(),
});

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;
  let logger: Logger;
  let configService: ConfigService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useFactory: mockService },
        {
          provide: Logger,
          useValue: {
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
        ConfigService,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
    logger = module.get<Logger>(Logger);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('determinePolicy', () => {
    it('should return a PolicyResponse based on given CredentialsDTO', async () => {
      const policyResponse = { policy: 'Standard' };
      const credentials = new CredentialsDTO();
      credentials.userId = '123';
      jest.spyOn(service, 'determinePolicy').mockResolvedValue(policyResponse);
      expect(await controller.determinePolicy(credentials)).toEqual(
        policyResponse,
      );
    });
  });

  describe('processOidcRedirect', () => {
    it('should handle OIDC redirect correctly given a equest', async () => {
      const oidcPostRequest = new OidcAuthValidationRequestDto();
      const mockResponse = {
        redirect: jest.fn(),
      };
      jest
        .spyOn(configService, 'get')
        .mockReturnValue('http://redirect-url.com');
      const validationResponse: OidcAuthValidationResponseDto = new OidcAuthValidationResponseDto();
      validationResponse.isValid = true;
      validationResponse.userSession = new UserSession();
      validationResponse.userSession.sessionId = 'abc123';
      validationResponse.userSession.userId = 'user001';

      jest
        .spyOn(service, 'validateAndCreateSession')
        .mockResolvedValue(validationResponse);
      await controller.processOidcRedirect(
        oidcPostRequest,
        '192.168.1.1',
        mockResponse as any,
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://redirect-url.com?sessionId=abc123',
      );
    });
  });

  describe('signIn', () => {
    it('should return a new or existing UserDTO', async () => {
      const userDto = new UserDTO();
      const signInDto = new SignInDTO();

      jest.spyOn(service, 'signIn').mockResolvedValue(userDto);

      expect(await controller.signIn(signInDto, '127.0.0.1')).toEqual(userDto);
    });
  });

  describe('lastActivity', () => {
    it('should call the lastActivity method and handle the result', async () => {
      const authToken = 'valid-token';
      jest.spyOn(service, 'updateLastActivity').mockResolvedValue();

      await expect(controller.lastActivity(authToken)).resolves.not.toThrow();
    });
  });

  describe('signOut', () => {
    it('should call the service sign out given a valid request', async () => {
      const user = new UserIdDTO();
      user.userId = 'user1';
      const authToken = 'valid-token';
      jest.spyOn(service, 'signOut').mockResolvedValue();

      await controller.signOut(user, authToken);
      expect(service.signOut).toHaveBeenCalledWith(user.userId, authToken);
    });
  });
});
