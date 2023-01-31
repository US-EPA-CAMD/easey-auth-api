import { AppModule } from './app.module';
import {
  applyMiddleware,
  applySwagger,
} from '@us-epa-camd/easey-common/nestjs';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await applyMiddleware(AppModule, app, true);
  await applySwagger(app);

  const configService = app.get(ConfigService);
  const appPath = configService.get<string>('app.path');
  const appPort = configService.get<number>('app.port');
  const enableDebug = configService.get<boolean>('app.enableDebug');

  const server = await app.listen(appPort);
  server.setTimeout(1800000);

  //if (enableDebug) {
  console.log('app config: ', configService.get('app'));
  console.log('cdxBypass config: ', configService.get('cdxBypass'));
  console.log(
    `Application is running on: ${await app.getUrl()}/${appPath}/swagger`,
  );
  //}
}

bootstrap();
