import { IsString, IsIn, IsOptional } from 'class-validator';

export class MaintenanceVerifyParamDTO {
  @IsString()
  @IsOptional()
  authToken?: string;

  @IsString()
  clientIp: string;

  @IsString()
  appIdentifier: string;
}
