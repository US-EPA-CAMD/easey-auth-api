import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsString } from 'class-validator';

export class ValidationItem {
  @ApiProperty()
  @IsString()
  monPlanId: string;

  @ApiProperty()
  @IsBoolean()
  submitMonPlan: boolean;

  @ApiProperty()
  @IsArray()
  testSumIds: string[];

  @ApiProperty()
  @IsArray()
  qceIds: string[];

  @ApiProperty()
  @IsArray()
  teeIds: string[];

  @ApiProperty()
  @IsArray()
  emissionsReportingPeriods: string[];
}

export class SignValidateParamDTO {
  @ApiProperty()
  items: ValidationItem[];

  @ApiProperty()
  @IsString()
  userId: string;
}