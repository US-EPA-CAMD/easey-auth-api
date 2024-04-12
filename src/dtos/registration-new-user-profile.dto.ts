import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';
import { RegistrationRole } from './registration-role';


export class RegistrationNewUserProfile {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsNotEmpty()
  @IsString()
  role: RegistrationRole;
}
