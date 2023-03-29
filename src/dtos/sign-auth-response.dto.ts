import { IsString } from 'class-validator';

export class SignAuthResponseDTO {
  @IsString()
  activityId: string;
  @IsString()
  question: string;
  @IsString()
  questionId: string;
  @IsString()
  mobileNumbers: string[];
}
