import { Module } from '@nestjs/common';
import { RouterModule } from 'nest-router';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import routes from './routes';
import dbConfig from './config/db.config';
import appConfig from './config/app.config';
import cdxBypass from './config/bypass.config';
import { TypeOrmConfigService } from './config/typeorm.config';

import { AuthenticationModule } from './authentication/authentication.module';
import { TokenModule } from './token/token.module';

import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { CorsOptionsModule } from '@us-epa-camd/easey-common/cors-options';

@Module({
  imports: [
    RouterModule.forRoutes(routes),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        dbConfig,
        appConfig,
        cdxBypass
      ],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    LoggerModule,
    CorsOptionsModule,
    AuthenticationModule,
    TokenModule,
  ],
})
export class AppModule {}
