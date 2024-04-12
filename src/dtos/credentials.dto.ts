import { IsBoolean, IsString } from 'class-validator';
import { CredentialsOidcDTO } from './credentialsOidc.dto';

export class CredentialsDTO extends CredentialsOidcDTO {

  @IsString()
  password: string;
}
