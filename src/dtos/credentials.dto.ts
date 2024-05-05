import { IsString } from 'class-validator';

export class CredentialsDTO {
  @IsString()
  userId: string;
}
