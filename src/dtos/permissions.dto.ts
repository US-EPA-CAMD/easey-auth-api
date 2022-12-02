import { ApiProperty } from '@nestjs/swagger';

export class FacilityAccessDTO {
  @ApiProperty({
    description: 'Facilitiy oris code',
  })
  id: number;

  @ApiProperty({
    description: 'List of associated permissions',
  })
  permissions: string[];
}

export class PermissionsDTO {
  @ApiProperty({
    description:
      'Does the user have admin access to all facilities and permissions',
  })
  isAdmin: boolean;

  @ApiProperty({
    description: 'List of facilities and permissions',
  })
  facilities: FacilityAccessDTO[];
}
