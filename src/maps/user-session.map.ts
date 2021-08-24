import { Injectable } from '@nestjs/common';

import { BaseMap } from './base.map';
import { UserSession } from '../entities/user-session.entity';
import { UserSessionDTO } from '../dtos/user-session.dto';

@Injectable()
export class UserSessionMap extends BaseMap<UserSession, UserSessionDTO> {
  public async one(entity: UserSession): Promise<UserSessionDTO> {
    return {
      userId: entity.userId,
      sessionId: entity.sessionId,
      securityToken: entity.securityToken,
      tokenExpiration: entity.tokenExpiration,
      lastLoginDate: entity.lastLoginDate,
    };
  }
}
