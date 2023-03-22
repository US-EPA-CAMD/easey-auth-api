import { IsString } from 'class-validator';

export class SendPhonePinParamDTO {
  @IsString()
  activityId: string;
  @IsString()
  userId: string;
  @IsString()
  number: string;
}
