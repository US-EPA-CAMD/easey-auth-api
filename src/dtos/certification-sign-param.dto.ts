import { IsString } from 'class-validator';
import { CredentialsDTO } from './credentials.dto';

export class CredentialsSignDTO extends CredentialsDTO {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;
}
