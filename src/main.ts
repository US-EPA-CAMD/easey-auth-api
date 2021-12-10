import * as helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { CorsOptionsService } from '@us-epa-camd/easey-common/cors-options';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const corsOptionsService = app.get(CorsOptionsService);

  const appName = configService.get<string>('app.name');
  const appTitle = configService.get<string>('app.title');
  const appPath = configService.get<string>('app.path');
  const appEnv = configService.get<string>('app.env');
  const appHost = configService.get<string>('app.host');
  const apiHost = configService.get<string>('app.apiHost');    
  const appVersion = configService.get<string>('app.version');
  const appPublished = configService.get<string>('app.published');

  let appDesc = null;
  let swaggerCustomOptions = null;

  if (appEnv != 'production') {
    appDesc = `EPA ${appEnv} Environment: The content on this page is not production data and used for <strong>development</strong> and/or <strong>testing</strong> purposes only.`;
    swaggerCustomOptions = {
      customCss:
        '.description .renderedMarkdown p { color: #FC0; padding: 10px; background: linear-gradient(to bottom,#520001 0%,#6c0810 100%); }',
    };
  }

  app.use(helmet());
  app.setGlobalPrefix(appPath);
  app.enableCors(async (req, callback) => {
    await corsOptionsService.configure(req, appName, callback);
  });

  const swaggerDocOptions = new DocumentBuilder()
    .setTitle(`${appTitle} OpenAPI Specification`)
    .setDescription(appDesc)
    .setVersion(`${appVersion} published: ${appPublished}`)
    .addBearerAuth(
      {
        in: 'header',
        type: 'http',
        scheme: 'bearer',
        name: 'Token',
        description: 'Authorization token required for operations with padlock!',
      },
      'Token',
    );

  if (appHost !== 'localhost') {
    swaggerDocOptions
      .addServer(`https://${apiHost}`)
      .addApiKey({
        in: 'header',
        type: 'apiKey',
        name: 'x-api-key',
        description: 'API Gateway requires x-api-key request header!',
      }, "API Key");
  }

  const document = SwaggerModule.createDocument(app, swaggerDocOptions.build());
  SwaggerModule.setup(
    `${appPath}/swagger`,
    app,
    document,
    swaggerCustomOptions,
  );

  await app.listen(configService.get<number>('app.port'));
  console.log(
    `Application is running on: ${await app.getUrl()}/${appPath}/swagger`,
  );
}

bootstrap();
