import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

import { CertificationStatement } from '../entities/certification-statement.entity';

@Injectable()
export class CertificationStatementRepository extends Repository<
  CertificationStatement
> {
  constructor(private readonly dataSource: DataSource) {
    super(CertificationStatement, dataSource.manager);
  }
}
