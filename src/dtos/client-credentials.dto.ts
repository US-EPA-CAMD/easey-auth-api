import { IsString } from 'class-validator';

export class ClientCredentialsDTO {
  @IsString()
  clientId: string;

  @IsString()
  clientSecret: string;
}
