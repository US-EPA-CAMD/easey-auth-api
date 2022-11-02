import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { CertificationStatementDTO } from '../dtos/certification-statement.dto';
import { CertificationStatementMap } from '../maps/certification-statement.map';
import { CertificationStatementRepository } from './certifications.repository';

@Injectable()
export class CertificationsService {
  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly repository: CertificationStatementRepository,
    private readonly map: CertificationStatementMap,
  ) {}

  public verifyCredentials() {}

  public verifyChallenge() {}

  public async getStatements(): Promise<CertificationStatementDTO[]> {
    return this.map.many(await this.repository.find());
  }
}
