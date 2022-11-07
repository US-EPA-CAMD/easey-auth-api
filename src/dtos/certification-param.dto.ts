import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CertificationParamDTO {
  @ApiProperty({
    isArray: true,
    description: 'Array of monitor plan ids',
  })
  @Transform(({ value }) => value.split('|').map((item: string) => item.trim()))
  monitorPlanIds: string[];
}
