"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const app_config_service_1 = require("../../config/app-config.service");
const prisma_service_1 = require("../../prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    jwtService;
    configService;
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async register(dto) {
        const existing = await this.prisma.admin.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.ConflictException("Admin with this email already exists");
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const admin = await this.prisma.admin.create({
            data: {
                email: dto.email,
                password: passwordHash,
                role: dto.role ?? client_1.AdminRole.ISSUER_ADMIN,
                issuerId: dto.issuerId ?? null,
            },
        });
        return this.buildAuthResponse(admin);
    }
    async login(dto) {
        const admin = await this.prisma.admin.findUnique({
            where: { email: dto.email },
        });
        if (!admin) {
            throw new common_1.UnauthorizedException("Invalid credentials");
        }
        const passwordValid = await bcrypt.compare(dto.password, admin.password);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException("Invalid credentials");
        }
        return this.buildAuthResponse(admin);
    }
    async getProfile(adminId) {
        const admin = await this.prisma.admin.findUnique({
            where: { id: adminId },
            include: {
                issuer: true,
            },
        });
        if (!admin) {
            throw new common_1.UnauthorizedException("Admin account no longer exists");
        }
        return {
            id: admin.id,
            email: admin.email,
            role: admin.role,
            issuerId: admin.issuerId,
            createdAt: admin.createdAt,
            updatedAt: admin.updatedAt,
            issuer: admin.issuer
                ? {
                    id: admin.issuer.id,
                    name: admin.issuer.name,
                    domain: admin.issuer.domain,
                    status: admin.issuer.status,
                }
                : null,
        };
    }
    buildAuthResponse(admin) {
        const payload = {
            sub: admin.id,
            email: admin.email,
            role: admin.role,
            issuerId: admin.issuerId,
        };
        return {
            accessToken: this.jwtService.sign(payload, {
                expiresIn: this.configService.jwtExpiresIn,
            }),
            admin: {
                id: admin.id,
                email: admin.email,
                role: admin.role,
                issuerId: admin.issuerId,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        app_config_service_1.AppConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map