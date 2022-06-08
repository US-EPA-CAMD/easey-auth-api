import { Api } from '../entities/api.entity';
import { Repository, EntityRepository } from 'typeorm';

@EntityRepository(Api)
export class ApiRepository extends Repository<Api> {}
