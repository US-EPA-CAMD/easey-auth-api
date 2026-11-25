import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { DataSource, EntityManager } from 'typeorm';

import { UserSession } from '../entities/user-session.entity';
import { UserSessionRepository } from './user-session.repository';
import { UserSessionService } from './user-session.service';

let responseVals = {
  ['app.refreshTokenThresholdSeconds']: 60,
};

describe('User Session Service', () => {
  let service: UserSessionService;
  let mockRepo: UserSessionRepository;
  let mockDataSource: DataSource;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [
        UserSessionService,
        {
          provide: HttpService,
          useFactory: () => ({
            get: jest.fn(),
          }),
        },
        {
          provide: EntityManager,
          useValue: { query: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
          },
        },
        {
          provide: UserSessionRepository,
          useFactory: () => ({
            insert: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            remove: jest.fn(),
            update: jest.fn(),
          }),
        },
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
    mockRepo = module.get(UserSessionRepository);
    mockDataSource = module.get(DataSource);
    service = module.get(UserSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUserSession', () => {
    it('should create a new user session', async () => {
      jest.spyOn(service, 'removeUserSessionByUserId').mockResolvedValue();
      await service.createUserSession('', '', '', '');
      expect(mockRepo.insert).toHaveBeenCalled();
    });
  });

  describe('isValidSessionForToken', () => {
    it('should return if a session is valid', async () => {
      const session = new UserSession();
      session.tokenExpiration = new Date('3000-01-01T00:00:00.000Z');
      mockRepo.findOneBy = jest.fn().mockResolvedValue(session);
      const returned = await service.isValidSessionForToken('', '');
      expect(returned).toEqual(session);
    });

    it('should error if a session is invalid', async () => {
      const session = new UserSession();
      session.tokenExpiration = new Date('1000-01-01T00:00:00.000Z');
      mockRepo.findOneBy = jest.fn().mockResolvedValue(session);

      expect(async () => {
        await service.isValidSessionForToken('', '');
      }).rejects.toThrow();
    });

    it('should error if a session is invalid', async () => {
      mockRepo.findOneBy = jest.fn().mockResolvedValue(null);

      expect(async () => {
        await service.isValidSessionForToken('', '');
      }).rejects.toThrow();
    });
  });

  describe('removeUserSessionByUserId', () => {
    it('should remove user session', async () => {
      const session = new UserSession();
      mockRepo.findOneBy = jest.fn().mockResolvedValue(session);
      await service.removeUserSessionByUserId('');
      expect(mockRepo.remove).toHaveBeenCalled();
    });
  });

  describe('findSessionByUserIdAndToken', () => {
    it('should find user session', async () => {
      const session = new UserSession();
      mockRepo.findOneBy = jest.fn().mockResolvedValue(session);
      const returned = await service.findSessionByUserIdAndToken('', '');
      expect(returned).toEqual(session);
    });

    it('should return null if a session is missing', async () => {
      mockRepo.findOneBy = jest.fn().mockResolvedValue(null);

      await expect(
        service.findSessionByUserIdAndToken('', ''),
      ).resolves.toBeNull();
    });
  });

  describe('insertNewUserSession', () => {
    it('should insert new user session', async () => {
      await service.insertNewUserSession(new UserSession());
      expect(mockRepo.insert).toHaveBeenCalled();
    });
  });

  describe('refreshLastActivity', () => {
    it('should update only last activity when the token is still current', async () => {
      jest.spyOn(service, 'returnManager').mockReturnValue({
        findOne: jest.fn().mockResolvedValue(undefined),
      } as any);

      const session = new UserSession();
      session.sessionId = 'session-id';
      session.securityToken = 'token';
      session.tokenVersion = 2;
      mockRepo.findOne = jest.fn().mockResolvedValue(session);
      mockRepo.update = jest.fn().mockResolvedValue({ affected: 1 });

      await service.refreshLastActivity('token');

      expect(mockRepo.update).toHaveBeenCalledWith(
        {
          sessionId: 'session-id',
          securityToken: 'token',
          tokenVersion: 2,
        },
        {
          lastActivity: expect.any(String),
        },
      );
    });

    it('should ignore a heartbeat when the token changes before the update', async () => {
      const session = new UserSession();
      session.sessionId = 'session-id';
      session.securityToken = 'old-token';
      mockRepo.findOne = jest.fn().mockResolvedValue(session);
      mockRepo.update = jest.fn().mockResolvedValue({ affected: 0 });
      const findCheckOut = jest.fn();
      jest.spyOn(service, 'returnManager').mockReturnValue({
        findOne: findCheckOut,
      } as any);

      await expect(service.refreshLastActivity('old-token')).resolves.toBeUndefined();
      expect(findCheckOut).not.toHaveBeenCalled();
    });
  });

  describe('replaceSessionTokens', () => {
    it('should compare and increment the token version', async () => {
      const session = new UserSession();
      session.sessionId = 'session-id';
      session.securityToken = 'old-token';
      session.tokenVersion = 3;
      mockRepo.update = jest.fn().mockResolvedValue({ affected: 1 });

      const updated = await service.replaceSessionTokens(session, {
        securityToken: 'new-token',
        refreshToken: 'new-refresh-token',
        idToken: 'new-id-token',
        tokenExpiration: new Date('2026-10-20T15:42:42.000Z'),
      });

      expect(updated).toBe(true);
      expect(mockRepo.update).toHaveBeenCalledWith(
        {
          sessionId: 'session-id',
          securityToken: 'old-token',
          tokenVersion: 3,
        },
        expect.objectContaining({
          securityToken: 'new-token',
          tokenVersion: expect.any(Function),
        }),
      );
    });
  });

  describe('withRefreshLock', () => {
    it('should hold the advisory lock for the refresh transaction', async () => {
      const query = jest.fn().mockResolvedValue(undefined);
      const transactionalManager = { query };
      const queryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        manager: {
          transaction: jest.fn(async operation => {
            await queryRunner.startTransaction();
            try {
              const result = await operation(transactionalManager);
              await queryRunner.commitTransaction();
              return result;
            } catch (error) {
              await queryRunner.rollbackTransaction();
              throw error;
            }
          }),
        },
      };
      (mockDataSource.createQueryRunner as jest.Mock).mockReturnValue(
        queryRunner,
      );
      const operation = jest.fn().mockResolvedValue('result');

      await expect(
        service.withRefreshLock('session-id', operation),
      ).resolves.toBe('result');

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('pg_advisory_xact_lock'),
        ['session-id'],
      );
      expect(operation).toHaveBeenCalledWith(transactionalManager);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should roll back and release the connection when refresh fails', async () => {
      const query = jest.fn().mockResolvedValue(undefined);
      const transactionalManager = { query };
      const queryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        manager: {
          transaction: jest.fn(async operation => {
            await queryRunner.startTransaction();
            try {
              const result = await operation(transactionalManager);
              await queryRunner.commitTransaction();
              return result;
            } catch (error) {
              await queryRunner.rollbackTransaction();
              throw error;
            }
          }),
        },
      };
      (mockDataSource.createQueryRunner as jest.Mock).mockReturnValue(
        queryRunner,
      );
      const refreshError = new Error('OIDC refresh failed');
      const operation = jest.fn().mockRejectedValue(refreshError);

      await expect(
        service.withRefreshLock('session-id', operation),
      ).rejects.toBe(refreshError);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findSessionByUserIdAndTokenOnMaster', () => {
    it('should verify the refresh token on a master connection', async () => {
      const session = new UserSession();
      const queryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager: {
          findOneBy: jest.fn().mockResolvedValue(session),
        },
      };
      (mockDataSource.createQueryRunner as jest.Mock).mockReturnValue(
        queryRunner,
      );

      await expect(
        service.findSessionByUserIdAndTokenOnMaster('user', 'token'),
      ).resolves.toBe(session);

      expect(mockDataSource.createQueryRunner).toHaveBeenCalledWith('master');
      expect(queryRunner.manager.findOneBy).toHaveBeenCalledWith(
        UserSession,
        {
          userId: expect.anything(),
          securityToken: 'token',
        },
      );
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('updateClientIp', () => {
    it('should update client IP for existing session', async () => {
      const sessionId = 'test-session-id';
      const newClientIp = '192.168.1.100';

      await service.updateClientIp(sessionId, newClientIp);

      expect(mockRepo.update).toHaveBeenCalledWith(
        { sessionId: sessionId },
        { clientIp: newClientIp }
      );
    });

    it('should throw error when sessionId is missing', async () => {
      const newClientIp = '192.168.1.100';

      await expect(service.updateClientIp('', newClientIp))
        .rejects.toThrow('SessionId and newClientIp are required for IP update');
    });

    it('should throw error when newClientIp is missing', async () => {
      const sessionId = 'test-session-id';

      await expect(service.updateClientIp(sessionId, ''))
        .rejects.toThrow('SessionId and newClientIp are required for IP update');
    });

    it('should throw error when both parameters are missing', async () => {
      await expect(service.updateClientIp('', ''))
        .rejects.toThrow('SessionId and newClientIp are required for IP update');
    });
  });
});
