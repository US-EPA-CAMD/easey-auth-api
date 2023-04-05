import { IsArray, IsString } from 'class-validator';
import { FacilityAccessDTO } from './permissions.dto';

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
  facilities: FacilityAccessDTO[];
  @IsArray()
  roles: string[];
}
