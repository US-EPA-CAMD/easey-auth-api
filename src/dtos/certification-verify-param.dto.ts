import { IsOptional, IsString } from 'class-validator';

export class CertificationVerifyParamDTO {
  @IsString()
  activityId: string;

  @IsString()
  @IsOptional()
  answer: string;
  @IsString()
  questionId: string;
  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  pin: string;
}
