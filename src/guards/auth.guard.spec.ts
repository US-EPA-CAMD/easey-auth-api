import { TestingModule, Test } from '@nestjs/testing';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { AuthGuard } from './auth.guard';
import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext } from '@nestjs/common';
import { LogModule } from '../Logger/Logger.module';

const mockRepository = () => ({
  findOne: jest.fn().mockResolvedValue(''),
  save: jest.fn().mockResolvedValue(''),
  update: jest.fn().mockResolvedValue(''),
  remove: jest.fn().mockResolvedValue(''),
});

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LogModule],
      providers: [
        AuthGuard,
        { provide: UserSessionRepository, useFactory: mockRepository },
      ],
    }).compile();

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

  it('should error given no auth header', async () => {
    const request = { headers: {} };
    expect(async () => {
      await guard.validateRequest(request);
    }).rejects.toThrowError();
  });

  it('should error given invalid bearer format', async () => {
    const request = { headers: { authorization: 'Beater 3' } };
    expect(async () => {
      await guard.validateRequest(request);
    }).rejects.toThrowError();
  });
});
