import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/filters/app-exception.filter';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Disable NestJS default body parser so we control size limits explicitly below
    bodyParser: false,
  });
  const configService = app.get(AppConfigService);

  // Trust Cloudflare/proxy forwarded headers (X-Forwarded-For, X-Forwarded-Proto)
  // Required for correct IP/protocol detection behind Cloudflare tunnel
  if (configService.trustProxy) {
    app.set('trust proxy', 1);
  }

  // Swagger docs are enabled only outside production (dev/staging), never in prod.
  const enableDocs =
    configService.nodeEnv !== 'production' &&
    configService.appEnv !== 'production';

  // Helmet: sets secure HTTP response headers.
  // Disable CSP only when Swagger UI is mounted, since its inline assets are
  // otherwise blocked. Production keeps the strict default CSP.
  app.use(helmet(enableDocs ? { contentSecurityPolicy: false } : undefined));

  // Body size limits: 1mb for JSON and URL-encoded payloads.
  // File upload endpoints (FileInterceptor/multer) are not affected by these limits;
  // multer handles its own streaming independently.
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb', extended: true });

  const corsOrigins = configService.corsOrigins;

  // Hard guard: never allow wildcard CORS in staging/production
  if (
    configService.isExposedEnv &&
    (corsOrigins === true ||
      (Array.isArray(corsOrigins) && corsOrigins.includes('*')))
  ) {
    throw new Error(
      'CORS is configured to allow all origins (*) but the environment is staging/production. ' +
        'Set CORS_ORIGINS to an explicit comma-separated list of allowed origins.',
    );
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AppExceptionFilter(configService));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (enableDocs) {
    const docsConfig = new DocumentBuilder()
      .setTitle('Certiva API')
      .setDescription('Certiva credential issuance & verification API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, docsConfig);
    // Mounted at /api/docs (setGlobalPrefix does not cover Swagger's own route).
    SwaggerModule.setup('api/docs', app, document);
  }

  app.enableShutdownHooks();

  const port = configService.port;
  await app.listen(port);
}
void bootstrap();
