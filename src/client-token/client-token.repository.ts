import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { ClientConfig } from '../entities/client-config.entity';

@Injectable()
export class ClientTokenRepository extends Repository<ClientConfig> {
  constructor(private readonly dataSource: DataSource) {
    super(ClientConfig, dataSource.manager);
  }
}
