import { IsBoolean, IsString } from 'class-validator';
import { CredentialsOidcDTO } from './credentialsOidc.dto';

export class SignInDTO {
  @IsString()
  sessionId: string;
}
