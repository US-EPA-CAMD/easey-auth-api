import { UserSessionDTO } from '../dtos/user-session.dto';
import { UserSession } from '../entities/user-session.entity';

export interface SessionStatus {
  active: boolean;
  allowed: boolean;
  session: UserSessionDTO;
  sessionEntity: UserSession;
}
