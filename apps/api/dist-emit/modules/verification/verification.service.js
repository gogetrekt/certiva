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
exports.VerificationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let VerificationService = class VerificationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async verify(dto, ip) {
        if (!dto.credentialId && !dto.hash) {
            throw new common_1.BadRequestException("Provide credentialId or hash for verification");
        }
        const credential = await this.prisma.credential.findFirst({
            where: {
                id: dto.credentialId ?? undefined,
                hash: dto.hash ?? undefined,
                issuer: dto.issuerDomain
                    ? {
                        domain: dto.issuerDomain,
                    }
                    : undefined,
            },
            include: { issuer: true },
        });
        let result;
        if (!credential) {
            result = client_1.VerificationResult.NOT_FOUND;
        }
        else if (credential.revoked) {
            result = client_1.VerificationResult.REVOKED;
        }
        else if (credential.issuer?.status !== client_1.IssuerStatus.ACTIVE) {
            result = client_1.VerificationResult.INVALID;
        }
        else {
            result = client_1.VerificationResult.VALID;
        }
        if (credential) {
            await this.prisma.verificationLog.create({
                data: {
                    credentialId: credential.id,
                    ip,
                    result,
                },
            });
        }
        return {
            result,
            credential: credential
                ? {
                    id: credential.id,
                    studentName: credential.studentName,
                    studentId: credential.studentId,
                    degree: credential.degree,
                    issuerId: credential.issuerId,
                    revoked: credential.revoked,
                }
                : null,
        };
    }
};
exports.VerificationService = VerificationService;
exports.VerificationService = VerificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VerificationService);
//# sourceMappingURL=verification.service.js.map