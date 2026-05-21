"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const app_exception_filter_1 = require("./common/filters/app-exception.filter");
const app_config_service_1 = require("./config/app-config.service");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(app_config_service_1.AppConfigService);
    app.enableCors({
        origin: configService.corsOrigins,
        credentials: true,
    });
    app.setGlobalPrefix("api");
    app.useGlobalFilters(new app_exception_filter_1.AppExceptionFilter());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.enableShutdownHooks();
    const port = configService.port;
    await app.listen(port);
}
bootstrap();
//# sourceMappingURL=main.js.map