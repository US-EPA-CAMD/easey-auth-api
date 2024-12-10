import {  IsString } from 'class-validator';

export class MaintenanceVerifyParamDTO {
  @IsString()
  authToken: string;

  @IsString()
  clientIp: string;

  @IsString()
  clientId: string;

  @IsString()
  clientToken: string;
}
