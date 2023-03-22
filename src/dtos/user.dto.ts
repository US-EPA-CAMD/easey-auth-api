import { IsString } from 'class-validator';
import { PermissionsDTO } from './permissions.dto';

export class UserDTO {
  @IsString()
  userId: string;
  @IsString()
  firstName: string;
  @IsString()
  lastName: string;
  @IsString()
  token: string;
  @IsString()
  tokenExpiration: string;
  @IsString()
  email: string;
  permissions: PermissionsDTO;
}
