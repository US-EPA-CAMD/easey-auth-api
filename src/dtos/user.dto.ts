import { IsArray, IsString, IsBoolean } from 'class-validator';
import { FacilityAccessWithCertStatementFlagDTO } from './permissions.dto';

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
  idToken: string;
  @IsString()
  refreshToken: string;
  @IsString()
  email: string;
  facilities: FacilityAccessWithCertStatementFlagDTO;
  @IsArray()
  roles: string[];
}
