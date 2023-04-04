import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsArray } from 'class-validator';

export class FacilityAccessDTO {
  @ApiProperty({
    description: 'Facilitiy Id',
  })
  @IsNumber()
  facId: number;

  @ApiProperty({
    description: 'Oris Code',
  })
  @IsNumber()
  orisCode: number;

  @ApiProperty({
    description: 'List of associated permissions',
  })
  @IsArray()
  permissions: string[];
}
