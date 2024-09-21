import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

export class FacilityAccessWithCertStatementFlagDTO {
  @ApiProperty({
    description: 'List of faclities with associated permissions',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacilityAccessDTO)
  plantList: FacilityAccessDTO[];

  @ApiProperty({
    description: 'missing unsigned certificate statements flag',
  })
  @IsBoolean()
  missingCertificationStatements: boolean;
}

