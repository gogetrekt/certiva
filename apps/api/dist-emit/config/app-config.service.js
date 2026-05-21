"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfigService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let AppConfigService = class AppConfigService {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    get port() {
        return this.configService.get("app.port", 4000);
    }
    get databaseUrl() {
        return this.configService.getOrThrow("database.url");
    }
    get jwtSecret() {
        return this.configService.getOrThrow("auth.jwtSecret");
    }
    get jwtExpiresIn() {
        return this.configService.get("auth.jwtExpiresIn", "12h");
    }
    get corsOrigins() {
        const rawOrigins = this.configService.get("app.corsOrigin", "");
        if (!rawOrigins) {
            return true;
        }
        return rawOrigins
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean);
    }
};
exports.AppConfigService = AppConfigService;
exports.AppConfigService = AppConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AppConfigService);
//# sourceMappingURL=app-config.service.js.map