import { UserSessionDTO } from '../dtos/user-session.dto';
import { UserSession } from '../entities/user-session.entity';

export interface SessionStatus {
  exists: boolean;
  expired: boolean;
  session: UserSessionDTO;
  sessionEntity: UserSession;
}
