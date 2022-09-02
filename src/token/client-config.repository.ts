import { ClientConfig } from '../entities/client-config.entity';
import { Repository, EntityRepository } from 'typeorm';

@EntityRepository(ClientConfig)
export class ClientConfigRepository extends Repository<ClientConfig> {}
