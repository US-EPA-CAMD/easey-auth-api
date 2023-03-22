import { IsString } from 'class-validator';

export class ClientIdDTO {
  @IsString()
  clientId: string;
}
