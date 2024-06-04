import { IsArray, IsBoolean, IsString } from 'class-validator';
import { FacilityAccessDTO } from './permissions.dto';

export class LoginStateDTO {
  @IsBoolean()   isDisabled: boolean;
}
