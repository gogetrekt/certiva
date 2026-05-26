import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { AppExceptionFilter } from "./common/filters/app-exception.filter";
import { AppConfigService } from "./config/app-config.service";

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

  // Helmet: sets secure HTTP response headers.
  // No Swagger is present so no CSP relaxation is needed.
  app.use(helmet());

  // Body size limits: 1mb for JSON and URL-encoded payloads.
  // File upload endpoints (FileInterceptor/multer) are not affected by these limits;
  // multer handles its own streaming independently.
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb', extended: true });

  const corsOrigins = configService.corsOrigins;

  // Hard guard: never allow wildcard CORS in staging/production
  if (
    configService.isExposedEnv &&
    (corsOrigins === true || (Array.isArray(corsOrigins) && corsOrigins.includes('*')))
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

  app.setGlobalPrefix("api");
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

  app.enableShutdownHooks();

  const port = configService.port;
  await app.listen(port);
}
bootstrap();
