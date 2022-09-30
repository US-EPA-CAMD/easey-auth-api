import { ClientConfig } from '../entities/client-config.entity';
import { Repository, EntityRepository } from 'typeorm';

@EntityRepository(ClientConfig)
export class ClientTokenRepository extends Repository<ClientConfig> {}