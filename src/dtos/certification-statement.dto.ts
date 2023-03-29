import { IsNumber, IsString } from 'class-validator';

export class CertificationStatementDTO {
  @IsNumber()
  statementId: number;

  @IsString()
  statementText: string;

  @IsString()
  prgCode: string;

  @IsNumber()
  displayOrder: number;

  facData: any;
}
