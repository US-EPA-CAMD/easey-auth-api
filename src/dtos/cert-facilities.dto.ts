import { IsNumber, IsString } from 'class-validator';

export class CertificationFacilitiesDTO {
  @IsNumber()
  oris: number;

  @IsString()
  facName: string;

  @IsString()
  unitInfo: string;
}
