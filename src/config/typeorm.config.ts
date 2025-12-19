require('dotenv').config();
import { TlsOptions } from 'tls';
import { readFileSync } from 'fs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  private tlsOptions: TlsOptions = { requestCert: true };

  constructor(private readonly configService: ConfigService) {
    const host = configService.get<string>('database.host');
    this.tlsOptions.rejectUnauthorized = host !== 'localhost';
    this.tlsOptions.ca =
      host !== 'localhost'
        ? readFileSync('./us-gov-west-1-bundle.pem').toString()
        : null;
    console.log('TLS/SSL Config:', {
      ...this.tlsOptions,
      ca:
        this.tlsOptions.ca !== null
          ? `${this.tlsOptions.ca.slice(0, 30)}...(truncated for display only)`
          : null,
    });
  }

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const replicaHost = this.configService.get<string>('database.replicaHost');
    const host = this.configService.get<string>('database.host');

    // If replica host is available and different from primary host, use replication configuration
    if (replicaHost && replicaHost !== host) {
      return {
        type: 'postgres',
        applicationName: this.configService.get<string>('app.name'),
        entities: [__dirname + '/../**/*.entity.{js,ts}'],
        synchronize: false,
        replication: {
          defaultMode: 'master',
          master: {
            host: this.configService.get<string>('database.host'),
            port: this.configService.get<number>('database.port'),
            username: this.configService.get<string>('database.user'),
            password: this.configService.get<string>('database.pwd'),
            database: this.configService.get<string>('database.name'),
            ssl: this.tlsOptions,
          },
          slaves: [
            {
              host: replicaHost,
              port: this.configService.get<number>('database.port'),
              username: this.configService.get<string>('database.user'),
              password: this.configService.get<string>('database.pwd'),
              database: this.configService.get<string>('database.name'),
              ssl: this.tlsOptions,
            },
          ],
        },
      };
    }

    // Fallback to original configuration if no replica host or same as master
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
      ssl: this.tlsOptions,
    };
  }
}
