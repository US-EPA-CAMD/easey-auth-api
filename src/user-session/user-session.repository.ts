import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { UserSession } from '../entities/user-session.entity';

@Injectable()
export class UserSessionRepository extends Repository<UserSession> {
  constructor(private readonly dataSource: DataSource) {
    super(UserSession, dataSource.manager);
  }
}
