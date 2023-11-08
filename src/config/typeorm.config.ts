import { TlsOptions } from 'tls';
import { readFileSync } from 'fs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';

import { getConfigValue } from '@us-epa-camd/easey-common/utilities';

require('dotenv').config();
const host = getConfigValue('EASEY_AUTH_API_HOST', 'localhost');

let ssl: TlsOptions = {
  requestCert: true,
  rejectUnauthorized: (host !== 'localhost'),
};

if (host !== 'localhost') {
  ssl.ca = readFileSync("./us-gov-west-1-bundle.pem").toString();
}

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      applicationName: this.configService.get<string>('app.name'),
      host: this.configService.get<string>('database.host'),
      port: this.configService.get<number>('database.port'),
      username: this.configService.get<string>('database.user'),
      password: this.configService.get<string>('database.pwd'),
      database: this.configService.get<string>('database.name'),
      entities: [__dirname + '/../**/*.entity.{js,ts}'],
      synchronize: false,
      ssl,
    };
  }
}
