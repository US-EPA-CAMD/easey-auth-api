import { IsString } from 'class-validator';

export class AnswerVerificationDTO {
  @IsString()
  userId: string;

  @IsString()
  questionId: string;

  @IsString()
  answer: string;

  @IsString()
  activityId: string;
}
