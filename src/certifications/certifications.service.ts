import { Injectable, HttpStatus } from '@nestjs/common';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import { EntityManager, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

import { CertificationFacilitiesDTO } from '../dtos/cert-facilities.dto';
import { CertificationStatementRepository } from './certifications.repository';
import { CertificationStatementDTO } from '../dtos/certification-statement.dto';
import { CertificationStatement } from '../entities/certification-statement.entity'
@Injectable()
export class CertificationsService {
  constructor(
    private readonly repository: CertificationStatementRepository,
    private readonly entityManager: EntityManager,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  public returnManager() {
    return this.entityManager;
  }

  public async getStatements(
    monitorPlanIds: string[],
  ): Promise<CertificationStatementDTO[]> {
    let certList: CertificationStatementDTO[] = [];
    let templateString;
    const contentUri = this.configService.get<string>('app.contentUri');
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
        let statementData:CertificationStatement;

        if (key === 'null') {
          statementData = await this.repository.findOneBy({
            prgCode: IsNull(),
          });
        } else {
          statementData = await this.repository.findOneBy({ prgCode: key });
        }

        const url = `${contentUri}/${statementData?.statementLocation}`;
        const template = await firstValueFrom(this.httpService.get(url));
        templateString = template.data;

        const certDto = new CertificationStatementDTO();
        certDto.displayOrder = statementData.displayOrder;
        certDto.prgCode = key;
        certDto.statementId = statementData.statementId;
        certDto.statementText = templateString;
        certDto.facData = value;

        certList.push(certDto);
      }
    } catch (e) {
      throw new EaseyException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return certList;
  }
}
