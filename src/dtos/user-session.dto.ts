export class UserSessionDTO {
  userId: string;

  sessionId: string;

  securityToken: string;

  tokenExpiration: Date;

  lastLoginDate: Date;
}
