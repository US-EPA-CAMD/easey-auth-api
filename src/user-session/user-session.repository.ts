import { Repository, EntityRepository } from 'typeorm';
import { UserSession } from '../entities/user-session.entity';

@EntityRepository(UserSession)
export class UserSessionRepository extends Repository<UserSession> {}
