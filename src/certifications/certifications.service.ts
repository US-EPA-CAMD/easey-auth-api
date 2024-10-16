import { Injectable, HttpStatus } from '@nestjs/common';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import { EntityManager, IsNull } from 'typeorm';

import { CertificationFacilitiesDTO } from '../dtos/cert-facilities.dto';
import { CertificationStatementRepository } from './certifications.repository';
import { CertificationStatementDTO } from '../dtos/certification-statement.dto';

@Injectable()
export class CertificationsService {
  constructor(
    private readonly repository: CertificationStatementRepository,
    private readonly entityManager: EntityManager,
  ) {}

  public returnManager() {
    return this.entityManager;
  }

  public async getStatements(
    monitorPlanIds: string[],
  ): Promise<CertificationStatementDTO[]> {
    let certList: CertificationStatementDTO[] = [];

    try {
      const manager = this.returnManager();

      const results = await manager.query(
        'SELECT * from camdecmpswks.get_certification_statements($1)',
        [monitorPlanIds],
      );

      const compiledKeys = {};

      results.forEach(element => {
        const keyName = element.prg_cd === null ? 'null' : element.prg_cd;

        if (!compiledKeys[keyName]) {
          compiledKeys[element.prg_cd] = [];
        }

        const newFacInfo = new CertificationFacilitiesDTO();
        newFacInfo.facName = element.facility_name;
        newFacInfo.oris = element.oris_code;
        newFacInfo.unitInfo = element.unit_info;
        compiledKeys[keyName].push(newFacInfo);
      });

      for (const [key, value] of Object.entries(compiledKeys)) {
        let statementData;

        if (key === 'null') {
          statementData = await this.repository.findOneBy({
            prgCode: IsNull(),
          });
        } else {
          statementData = await this.repository.findOneBy({ prgCode: key });
        }

        const certDto = new CertificationStatementDTO();
        certDto.displayOrder = statementData.displayOrder;
        certDto.prgCode = key;
        certDto.statementId = statementData.statementId;
        certDto.statementText = statementData.statementText;
        certDto.facData = value;

        certList.push(certDto);
      }
    } catch (e) {
      console.log(e);
      throw new EaseyException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return certList;
  }
}
