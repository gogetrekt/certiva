import { Global, Module } from '@nestjs/common';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PdfReferenceService } from './services/pdf-reference.service';
import { AuditLogService } from '../modules/audit/audit-log.service';

@Global()
@Module({
  providers: [JwtAuthGuard, RolesGuard, PdfReferenceService, AuditLogService],
  exports: [JwtAuthGuard, RolesGuard, PdfReferenceService, AuditLogService],
})
export class CommonModule {}
