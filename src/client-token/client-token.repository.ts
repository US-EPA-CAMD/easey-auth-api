import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';

import { ClientConfig } from '../entities/client-config.entity';

@Injectable()
export class ClientTokenRepository extends Repository<ClientConfig> {
  constructor(entityManager: EntityManager) {
    super(ClientConfig, entityManager);
  }
}
