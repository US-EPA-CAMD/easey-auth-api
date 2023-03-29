import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray } from 'class-validator';

export class CertificationParamDTO {
  @ApiProperty({
    isArray: true,
    description: 'Array of monitor plan ids',
  })
  @Transform(({ value }) => value.split('|').map((item: string) => item.trim()))
  @IsArray()
  monitorPlanIds: string[];
}
