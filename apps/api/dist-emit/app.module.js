"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_path_1 = require("node:path");
const common_module_1 = require("./common/common.module");
const app_config_module_1 = require("./config/app-config.module");
const configuration_1 = require("./config/configuration");
const env_schema_1 = require("./config/env.schema");
const audit_module_1 = require("./modules/audit/audit.module");
const auth_module_1 = require("./modules/auth/auth.module");
const credential_module_1 = require("./modules/credential/credential.module");
const health_module_1 = require("./modules/health/health.module");
const issuer_module_1 = require("./modules/issuer/issuer.module");
const verification_module_1 = require("./modules/verification/verification.module");
const prisma_module_1 = require("./prisma/prisma.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: [(0, node_path_1.join)(process.cwd(), ".env"), (0, node_path_1.join)(process.cwd(), "../../.env")],
                load: [configuration_1.configuration],
                validate: env_schema_1.validateEnv,
            }),
            app_config_module_1.AppConfigModule,
            common_module_1.CommonModule,
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            health_module_1.HealthModule,
            issuer_module_1.IssuerModule,
            credential_module_1.CredentialModule,
            verification_module_1.VerificationModule,
            audit_module_1.AuditModule,
        ],
        controllers: [],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map