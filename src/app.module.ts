import { Logger, Module } from '@nestjs/common';
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

@Module({
  imports: [
    RouterModule.forRoutes(routes),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [dbConfig, appConfig],
    }),

    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    AuthenticationModule,
    TokenModule,
    WinstonModule,
  ],
  providers: [Logger],
})
export class AppModule {}
