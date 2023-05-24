import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';
//
@Entity({ name: 'camdecmpswks.user_session' })
export class UserSession extends BaseEntity {
  @PrimaryColumn({ name: 'userid' })
  userId: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @Column({ name: 'security_token' })
  securityToken: string;

  @Column({ name: 'facilities' })
  facilities: string;

  @Column({ name: 'token_expiration' })
  tokenExpiration: string;

  @Column({ name: 'last_login_date', type: 'timestamptz' })
  lastLoginDate: string;

  @Column({ name: 'last_activity', type: 'timestamptz' })
  lastActivity: string;
}
