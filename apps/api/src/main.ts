import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { AppExceptionFilter } from "./common/filters/app-exception.filter";
import { AppConfigService } from "./config/app-config.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(AppConfigService);

  app.enableCors({
    origin: configService.corsOrigins,
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
