import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from '../token/token.service';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { UserSessionMap } from '../maps/user-session.map';
import { UserSession } from '../entities/user-session.entity';
import { UserSessionDTO } from '../dtos/user-session.dto';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';

const client = {
  CreateSecurityTokenAsync: jest.fn(() => Promise.resolve([{ return: '' }])),
  ValidateAsync: jest.fn(() => Promise.resolve([{ return: '' }])),
};

jest.mock('soap', () => ({
  createClientAsync: jest.fn(() => Promise.resolve(client)),
}));

jest.mock('@us-epa-camd/easey-common/utilities', () => ({
  parseToken: jest.fn().mockResolvedValue(''),
}));

const mockRepository = () => ({
  findOne: jest.fn().mockResolvedValue(''),
  save: jest.fn().mockResolvedValue(''),
  update: jest.fn().mockResolvedValue(''),
  remove: jest.fn().mockResolvedValue(''),
});

const mockMap = () => ({
  one: jest.fn().mockResolvedValue(''),
});

describe('Token Service', () => {
  let service: TokenService;
  let repo: UserSessionRepository;
  let map: UserSessionMap;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [
        TokenService,
        {
          provide: UserSessionRepository,
          useFactory: mockRepository,
        },
        {
          provide: UserSessionMap,
          useFactory: mockMap,
        },
        ConfigService,
      ],
    }).compile();

    service = module.get(TokenService);
    repo = module.get(UserSessionRepository);
    map = module.get(UserSessionMap);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSessionStatus()', () => {
    it('should return a new existing, unexpired userDTO given a non-existing session', async () => {
      const userSession = new UserSession();
      userSession.userId = '';
      userSession.securityToken = '';
      userSession.sessionId = '';
      userSession.tokenExpiration = new Date(
        Date.now() + 20 * 60000,
      ).toUTCString();

      const sessionDTO = new UserSessionDTO();
      sessionDTO.userId = '';
      sessionDTO.securityToken = '';
      sessionDTO.sessionId = '';
      sessionDTO.tokenExpiration = new Date(
        Date.now() + 20 * 60000,
      ).toUTCString();

      jest.spyOn(repo, 'findOne').mockResolvedValue(userSession);
      jest.spyOn(map, 'one').mockResolvedValue(sessionDTO);

      const sessionStatus = await service.getSessionStatus('');

      expect(sessionStatus.exists).toEqual(true);
      expect(sessionStatus.expired).toEqual(false);
      expect(sessionStatus.sessionEntity).toEqual(userSession);
      expect(sessionStatus.session).toEqual(sessionDTO);
    });

    it('should return a new existing, expired userDTO given an expired session', async () => {
      const userSession = new UserSession();
      userSession.userId = '';
      userSession.securityToken = '';
      userSession.sessionId = '';
      userSession.tokenExpiration = new Date(
        Date.now() - 20 * 60000,
      ).toUTCString();

      const sessionDTO = new UserSessionDTO();
      sessionDTO.userId = '';
      sessionDTO.securityToken = '';
      sessionDTO.sessionId = '';
      sessionDTO.tokenExpiration = new Date(
        Date.now() - 20 * 60000,
      ).toUTCString();

      jest.spyOn(repo, 'findOne').mockResolvedValue(userSession);
      jest.spyOn(map, 'one').mockResolvedValue(sessionDTO);

      const sessionStatus = await service.getSessionStatus('');

      expect(sessionStatus.exists).toEqual(true);
      expect(sessionStatus.expired).toEqual(true);
      expect(sessionStatus.sessionEntity).toEqual(userSession);
      expect(sessionStatus.session).toEqual(sessionDTO);
    });

    it('should return a non existing, expired userDTO given an non existing session', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(undefined);

      const sessionStatus = await service.getSessionStatus('');

      expect(sessionStatus.exists).toEqual(false);
      expect(sessionStatus.expired).toEqual(true);
      expect(sessionStatus.sessionEntity).toEqual(null);
      expect(sessionStatus.session).toEqual(null);
    });
  });

  describe('createUserSession()', () => {
    it('should return value of mocked session map', async () => {
      const result = await service.createUserSession('');
      expect(result).toEqual('');
    });
  });

  describe('removeUserSession()', () => {
    it('should execute', async () => {
      expect(
        service.removeUserSession(new UserSession()),
      ).resolves.not.toThrowError();
    });
  });

  describe('createToken()', () => {
    it('should return value of mocked session map', async () => {
      jest.spyOn(service, 'getSessionStatus').mockResolvedValue({
        exists: false,
        expired: true,
        session: null,
        sessionEntity: null,
      });

      expect(async () => {
        await service.createToken('', '');
      }).rejects.toThrowError();
    });

    it('should return a user token given a valid userid', async () => {
      jest.spyOn(service, 'getSessionStatus').mockResolvedValue({
        exists: true,
        expired: false,
        session: new UserSessionDTO(),
        sessionEntity: new UserSession(),
      });

      const token = await service.createToken('', '');
      expect(token).toEqual('');
    });
  });

  describe('unpackToken()', () => {
    it('should return an unencrypted token', async () => {
      const unpacked = await service.unpackToken('', '');
      expect(unpacked).toEqual('');
    });
  });

  describe('validateToken()', () => {
    it('should throw an error given an expired session', async () => {
      jest.spyOn(service, 'unpackToken').mockResolvedValue('');

      jest.spyOn(service, 'getSessionStatus').mockResolvedValue({
        exists: true,
        expired: true,
        session: new UserSessionDTO(),
        sessionEntity: new UserSession(),
      });

      expect(async () => {
        await service.validateToken('', '');
      }).rejects.toThrowError();
    });

    it('should return a unencrypted token given a valid session', async () => {
      jest.spyOn(service, 'unpackToken').mockResolvedValue('');

      jest.spyOn(service, 'getSessionStatus').mockResolvedValue({
        exists: true,
        expired: false,
        session: new UserSessionDTO(),
        sessionEntity: new UserSession(),
      });

      const uToken = await service.validateToken('', '');
      expect(uToken).toEqual('');
    });
  });
});
