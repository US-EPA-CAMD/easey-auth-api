import { Module } from '@nestjs/common';
import { RouterModule } from 'nest-router';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import routes from './routes';
import dbConfig from './config/db.config';
import appConfig from './config/app.config';
import { TypeOrmConfigService } from './config/typeorm.config';

import { AuthenticationModule } from './authentication/authentication.module';
import { TokenModule } from './token/token.module';

import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
const ecsFormat = require('@elastic/ecs-winston-format');

@Module({
  imports: [
    RouterModule.forRoutes(routes),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [dbConfig, appConfig],
    }),

    WinstonModule.forRoot({
      level: 'info',
      format: ecsFormat(),
      transports: [new winston.transports.Console()],
    }),

    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    AuthenticationModule,
    TokenModule,
  ],
})
export class AppModule {}
