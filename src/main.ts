import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerDocumentOptions,
  SwaggerModule,
  SwaggerCustomOptions,
} from '@nestjs/swagger';
import { AppModule } from './modules/app.module';
import { GlobalExceptionFilter } from './application/exceptions/global-exception.filter';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { MetricsInterceptor } from './shared/interceptors/metrics.interceptor';
import { environment } from './shared/config/env';
import { DatabaseService } from './domain/services/database/database.service';

const port = environment.APP_PORT;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new MetricsInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableVersioning({
    defaultVersion: '1',
    type: VersioningType.URI,
  });

  const config = new DocumentBuilder()
    .setTitle('Financial Wallet API')
    .setDescription('Complete financial wallet system API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const options: SwaggerDocumentOptions = {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  };

  const document = SwaggerModule.createDocument(app, config, options);

  const customOptions: SwaggerCustomOptions = {
    customSiteTitle: 'Financial Wallet API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  };

  SwaggerModule.setup('api', app, document, customOptions);

  app.enableCors();

  const databaseService = app.get(DatabaseService);
  await databaseService.enableShutdownHooks(app);

  await app.listen(port);
  console.info(`Application is running on: http://localhost:${port}`);
  console.info(`Swagger UI is running on: http://localhost:${port}/api`);
  console.info(
    `Swagger JSON is available at: http://localhost:${port}/api-json`,
  );
}

bootstrap();

