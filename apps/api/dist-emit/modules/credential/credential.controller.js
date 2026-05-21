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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const credential_service_1 = require("./credential.service");
const create_credential_dto_1 = require("./dto/create-credential.dto");
const revoke_credential_dto_1 = require("./dto/revoke-credential.dto");
let CredentialController = class CredentialController {
    credentialService;
    constructor(credentialService) {
        this.credentialService = credentialService;
    }
    create(dto) {
        return this.credentialService.create(dto);
    }
    findById(id) {
        return this.credentialService.findById(id);
    }
    revoke(id, _dto) {
        return this.credentialService.revoke(id);
    }
};
exports.CredentialController = CredentialController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.AdminRole.SUPER_ADMIN, client_1.AdminRole.ISSUER_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_credential_dto_1.CreateCredentialDto]),
    __metadata("design:returntype", void 0)
], CredentialController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, roles_decorator_1.Roles)(client_1.AdminRole.SUPER_ADMIN, client_1.AdminRole.ISSUER_ADMIN),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CredentialController.prototype, "findById", null);
__decorate([
    (0, common_1.Post)(":id/revoke"),
    (0, roles_decorator_1.Roles)(client_1.AdminRole.SUPER_ADMIN, client_1.AdminRole.ISSUER_ADMIN),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, revoke_credential_dto_1.RevokeCredentialDto]),
    __metadata("design:returntype", void 0)
], CredentialController.prototype, "revoke", null);
exports.CredentialController = CredentialController = __decorate([
    (0, common_1.Controller)("credentials"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [credential_service_1.CredentialService])
], CredentialController);
//# sourceMappingURL=credential.controller.js.map