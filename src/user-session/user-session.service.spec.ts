import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { UserSession } from '../entities/user-session.entity';
import { UserSessionRepository } from './user-session.repository';
import { UserSessionService } from './user-session.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

jest.mock('rxjs', () => ({
  firstValueFrom: jest.fn().mockResolvedValue({ data: 'MOCKED' }),
}));

describe('User Session Service', () => {
  let service: UserSessionService;
  let mockRepo: UserSessionRepository;
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
          provide: UserSessionRepository,
          useFactory: () => ({
            insert: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            update: jest.fn(),
          }),
        },
        ConfigService,
      ],
    }).compile();
    mockRepo = module.get(UserSessionRepository);
    service = module.get(UserSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUserSession', () => {
    it('should create a new user session', async () => {
      jest.spyOn(service, 'removeUserSessionByUserId').mockResolvedValue();
      await service.createUserSession('');
      expect(mockRepo.insert).toHaveBeenCalled();
    });
  });

  describe('isValidSessionForToken', () => {
    it('should return if a session is valid', async () => {
      const session = new UserSession();
      session.tokenExpiration = '01-01-3000';
      mockRepo.findOne = jest.fn().mockResolvedValue(session);
      const returned = await service.isValidSessionForToken('', '');
      expect(returned).toEqual(session);
    });

    it('should error if a session is invalid', async () => {
      const session = new UserSession();
      session.tokenExpiration = '01-01-1000';
      mockRepo.findOne = jest.fn().mockResolvedValue(session);

      expect(async () => {
        await service.isValidSessionForToken('', '');
      }).rejects.toThrow();
    });

    it('should error if a session is invalid', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null);

      expect(async () => {
        await service.isValidSessionForToken('', '');
      }).rejects.toThrow();
    });
  });

  describe('removeUserSessionByUserId', () => {
    it('should remove user session', async () => {
      const session = new UserSession();
      mockRepo.findOne = jest.fn().mockResolvedValue(session);
      await service.removeUserSessionByUserId('');
      expect(mockRepo.remove).toHaveBeenCalled();
    });
  });

  describe('findSessionByUserIdAndToken', () => {
    it('should find user session', async () => {
      const session = new UserSession();
      mockRepo.findOne = jest.fn().mockResolvedValue(session);
      const returned = await service.findSessionByUserIdAndToken('', '');
      expect(returned).toEqual(session);
    });

    it('should error if a session is missing', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null);

      expect(async () => {
        await service.findSessionByUserIdAndToken('', '');
      }).rejects.toThrow();
    });
  });

  describe('updateUserSessionToken', () => {
    it('should update user session', async () => {
      await service.updateUserSessionToken('', '', '');
      expect(mockRepo.update).toHaveBeenCalled();
    });
  });

  describe('insertNewUserSession', () => {
    it('should insert new user session', async () => {
      await service.insertNewUserSession(new UserSession());
      expect(mockRepo.insert).toHaveBeenCalled();
    });
  });

  describe('getUserPermissions', () => {
    it('should return mocked user permissions', async () => {
      const permissions = await service.getUserPermissions('', '', '');
      expect(permissions).toEqual('MOCKED');
    });
  });

  describe('refreshLastActivity', () => {
    it('should update user session last activity date', async () => {
      jest
        .spyOn(service, 'returnManager')
        .mockReturnValue({ findOne: jest.fn().mockResolvedValue(undefined) });

      const mock = jest.fn();
      mockRepo.findOne = jest.fn().mockResolvedValue(new UserSession());
      mockRepo.save = mock;

      await service.refreshLastActivity('');
      expect(mock).toHaveBeenCalled();
    });
  });
});
