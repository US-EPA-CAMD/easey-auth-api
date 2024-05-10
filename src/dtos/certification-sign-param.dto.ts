import { IsString, ValidateNested, IsArray} from 'class-validator';
import { Type } from 'class-transformer';
import { CredentialsDTO } from './credentials.dto';

export class CredentialsSignDTO extends CredentialsDTO {
  @IsString()
  userId: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  middleInitial: string;

  @IsString()
  activityDescription: string;
}

export class SignatureDocument {
  @IsString()
  name: string;

  @IsString()
  format: string;
}

export class SignatureRequest {
  @IsString()
  activityId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignatureDocument)
  documents: SignatureDocument[];
}
