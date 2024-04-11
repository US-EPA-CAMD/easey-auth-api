import { Module } from '@nestjs/common';
import { RouterModule } from 'nest-router';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { dbConfig } from '@us-epa-camd/easey-common/config';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { CorsOptionsModule } from '@us-epa-camd/easey-common/cors-options';
import {
  IsValidCodeValidator,
  IsValidCodesValidator,
} from '@us-epa-camd/easey-common/validators';

import routes from './routes';
import appConfig from './config/app.config';
import cdxBypass from './config/bypass.config';
import { TypeOrmConfigService } from './config/typeorm.config';
import { AuthModule } from './auth/auth.module';
import { TokenModule } from './token/token.module';
import { CertificationsModule } from './certifications/certifications.module';
import { SignModule } from './sign/Sign.module';
import { PermissionsModule } from './permissions/Permissions.module';

@Module({
  imports: [
    RouterModule.forRoutes(routes),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [dbConfig, appConfig, cdxBypass],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    LoggerModule,
    CorsOptionsModule,
    AuthModule,
    TokenModule,
    CertificationsModule,
    SignModule,
    PermissionsModule,
  ],
  providers: [IsValidCodeValidator, IsValidCodesValidator],
})
export class AppModule {}
