import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { IsArray, IsBoolean } from 'class-validator';

export class FacilityAccessDTO {
  @ApiProperty({
    description: 'Facilitiy oris code',
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'List of associated permissions',
  })
  @IsArray()
  permissions: string[];
}

export class PermissionsDTO {
  @ApiProperty({
    description:
      'Does the user have admin access to all facilities and permissions',
  })
  @IsBoolean()
  isAdmin: boolean;

  @ApiProperty({
    description: 'List of facilities and permissions',
  })
  @IsArray()
  facilities: FacilityAccessDTO[];
}
