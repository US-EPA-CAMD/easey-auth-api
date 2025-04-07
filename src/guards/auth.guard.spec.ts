//v1

import { TestingModule, Test } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { v4 as uuid } from 'uuid';
import { TokenService } from '../token/token.service';
import { ConfigService } from '@nestjs/config';

jest.mock('../token/token.service');
jest.mock('@us-epa-camd/easey-common/utilities');
const mockService = () => ({
  validateToken: jest.fn(),
});
let responseVals = {
  ['app.enableAuthToken']: true,
};

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let tokenService: TokenService;
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [
        AuthGuard,
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
    tokenService = module.get(TokenService);
    guard = module.get(AuthGuard);
  });
  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true given a valid execution context ', () => {
    const mockExecutionContext = createMock<ExecutionContext>();
    jest.spyOn(guard, 'validateRequest').mockResolvedValueOnce(true);
    const func = jest.spyOn(guard, 'canActivate');
    guard.canActivate(mockExecutionContext);
    expect(func).toHaveReturned();
  });

  it('should validate properly and return true given good input', async () => {
    const request = { headers: { authorization: 'Bearer 3' } };
    expect(await guard.validateRequest(request)).toEqual(true);
  });

  it('should throw UnauthorizedException when authorization header is missing', async () => {
    const request = { headers: {} };
    await expect(guard.validateRequest(request)).rejects.toThrow(UnauthorizedException);
    await expect(guard.validateRequest(request)).rejects.toThrow('Unauthorized access: Missing or invalid authorization token.');
  });

  it('should throw UnauthorizedException for invalid Bearer token format', async () => {
    const header = 'Beater' + uuid();
    const request = { headers: { authorization: header } };
    await expect(guard.validateRequest(request)).rejects.toThrow(UnauthorizedException);
    await expect(guard.validateRequest(request)).rejects.toThrow("Invalid authorization format. Expected 'Bearer <token>'.");
  });
});
