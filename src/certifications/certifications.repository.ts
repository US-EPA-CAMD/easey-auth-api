import { CertificationStatement } from '../entities/certification-statement.entity';
import { Repository, EntityRepository } from 'typeorm';

@EntityRepository(CertificationStatement)
export class CertificationStatementRepository extends Repository<
  CertificationStatement
> {}
