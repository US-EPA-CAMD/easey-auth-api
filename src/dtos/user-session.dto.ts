import { IsString } from 'class-validator';

export class UserSessionDTO {
  @IsString()
  userId: string;
  @IsString()
  sessionId: string;
  @IsString()
  securityToken: string;
  @IsString()
  tokenExpiration: string;
  @IsString()
  lastLoginDate: string;
}
