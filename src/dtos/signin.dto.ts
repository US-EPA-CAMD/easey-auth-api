import { IsBoolean, IsString } from 'class-validator';

export class SignInDTO {
  @IsString()
  sessionId: string;
}
