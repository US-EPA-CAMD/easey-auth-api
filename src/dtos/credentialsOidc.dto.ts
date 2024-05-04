import { IsBoolean, IsString } from 'class-validator';

export class CredentialsOidcDTO {
  @IsString()
  userId: string;
}
