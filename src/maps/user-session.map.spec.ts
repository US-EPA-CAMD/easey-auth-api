import { Test, TestingModule } from '@nestjs/testing';

import { UserSession } from '../entities/user-session.entity';
import { UserSessionMap } from './user-session.map';

const userId = '';
const sessionId = '';
const securityToken = '';
const tokenExpiration = '';
const lastLoginDate = '';

const entity = new UserSession();
entity.userId = userId;
entity.sessionId = sessionId;
entity.securityToken = securityToken;
entity.tokenExpiration = tokenExpiration;
entity.lastLoginDate = lastLoginDate;

describe('UserSessionMap', () => {
  let map: UserSessionMap;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [UserSessionMap],
    }).compile();

    map = module.get(UserSessionMap);
  });

  it('maps an entity to a dto', async () => {
    const result = await map.one(entity);
    expect(result.userId).toEqual(userId);
    expect(result.sessionId).toEqual(sessionId);
    expect(result.securityToken).toEqual(securityToken);
    expect(result.tokenExpiration).toEqual(tokenExpiration);
    expect(result.lastLoginDate).toEqual(lastLoginDate);
  });
});
