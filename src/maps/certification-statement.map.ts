import { Injectable } from '@nestjs/common';

import { BaseMap } from '@us-epa-camd/easey-common/maps';
import { CertificationStatement } from '../entities/certification-statement.entity';
import { CertificationStatementDTO } from '../dtos/certification-statement.dto';

@Injectable()
export class CertificationStatementMap extends BaseMap<
  CertificationStatement,
  CertificationStatementDTO
> {
  public async one(
    entity: CertificationStatement,
  ): Promise<CertificationStatementDTO> {
    return {
      statementId: entity.statementId,
      statementText: entity.statementText,
      displayOrder: entity.displayOrder,
      prgCode: entity.prgCode,
    };
  }
}
