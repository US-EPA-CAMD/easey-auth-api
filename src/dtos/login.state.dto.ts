import {  IsString } from 'class-validator';

export class LoginStateDTO {
  @IsString()   status: string;
}
