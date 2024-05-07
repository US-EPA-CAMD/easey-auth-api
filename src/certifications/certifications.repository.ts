import { EntityManager, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

import { CertificationStatement } from '../entities/certification-statement.entity';

@Injectable()
export class CertificationStatementRepository extends Repository<
  CertificationStatement
> {
  constructor(entityManager: EntityManager) {
    super(CertificationStatement, entityManager);
  }
}
