import { Global, Module } from "@nestjs/common";

import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { PermissionGuard } from "./guards/permission.guard";
import { RolesGuard } from "./guards/roles.guard";
import { PdfReferenceService } from "./services/pdf-reference.service";
import { AuditLogService } from "../modules/audit/audit-log.service";

@Global()
@Module({
  providers: [JwtAuthGuard, PermissionGuard, RolesGuard, PdfReferenceService, AuditLogService],
  exports: [JwtAuthGuard, PermissionGuard, RolesGuard, PdfReferenceService, AuditLogService],
})
export class CommonModule {}
