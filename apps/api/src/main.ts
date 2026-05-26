import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { AppExceptionFilter } from "./common/filters/app-exception.filter";
import { AppConfigService } from "./config/app-config.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(AppConfigService);

  // Trust Cloudflare/proxy forwarded headers (X-Forwarded-For, X-Forwarded-Proto)
  // Required for correct IP/protocol detection behind Cloudflare tunnel
  if (configService.trustProxy) {
    const httpAdapter = app.getHttpAdapter();
    const expressApp = httpAdapter.getInstance() as {
      set: (key: string, value: unknown) => void;
    };
    expressApp.set('trust proxy', 1);
  }

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
  app.useGlobalFilters(new AppExceptionFilter());

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
