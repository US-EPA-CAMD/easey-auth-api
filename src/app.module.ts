import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RouterModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { dbConfig } from '@us-epa-camd/easey-common/config';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { CorsOptionsModule } from '@us-epa-camd/easey-common/cors-options';
import {
  DbLookupValidator,
  IsValidCodesValidator,
} from '@us-epa-camd/easey-common/validators';
import { MaintenanceMiddleware } from '@us-epa-camd/easey-common/middleware/maintenance.middleware';
import { HttpModule } from '@nestjs/axios';

import routes from './routes';
import appConfig from './config/app.config';
import cdxBypass from './config/bypass.config';
import { TypeOrmConfigService } from './config/typeorm.config';
import { AuthModule } from './auth/auth.module';
import { TokenModule } from './token/token.module';
import { CertificationsModule } from './certifications/certifications.module';
import { SignModule } from './sign/Sign.module';
import { PermissionsModule } from './permissions/Permissions.module';
import { OidcHelperModule } from './oidc/OidcHelper.module';
import { HealthModule } from '@us-epa-camd/easey-common/health/health.module';

@Module({
  imports: [
    RouterModule.register(routes),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [dbConfig, appConfig, cdxBypass],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    HealthModule,
    LoggerModule,
    CorsOptionsModule,
    AuthModule,
    TokenModule,
    CertificationsModule,
    SignModule,
    PermissionsModule,
    OidcHelperModule,
    HttpModule,
  ],
  providers: [DbLookupValidator, IsValidCodesValidator],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MaintenanceMiddleware)
      .exclude(
        {
          path: '/authentication/login-state',
          method: RequestMethod.GET,
        },
        { path: '/permissions', method: RequestMethod.GET },
        { path: '/tokens/validate', method: RequestMethod.POST },
        { path: '/tokens/client', method: RequestMethod.POST },
        { path: '/tokens', method: RequestMethod.POST },
        {
          path: '/tokens/client/validate',
          method: RequestMethod.POST,
        },
        {
          path: '/tokens/maintenance-validate',
          method: RequestMethod.POST,
        },
        {
          path: '/authentication/oauth2/code',
          method: RequestMethod.POST,
        },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
