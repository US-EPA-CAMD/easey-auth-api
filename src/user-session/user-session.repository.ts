import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';

import { UserSession } from '../entities/user-session.entity';

@Injectable()
export class UserSessionRepository extends Repository<UserSession> {
  constructor(entityManager: EntityManager) {
    super(UserSession, entityManager);
  }
}
