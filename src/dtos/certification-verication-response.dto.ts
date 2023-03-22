import { IsString } from 'class-validator';

export class CertificationVerificationResponseDTO {
  @IsString()
  questionId: string;

  @IsString()
  question: string;

  @IsString()
  activityId: string;
}
