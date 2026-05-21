import { Module } from "@nestjs/common";

import { InstitutionModule } from "../institution/institution.module";
import { AuditController } from "./audit.controller";
import { AuditLogController } from "./audit-log.controller";
import { AuditService } from "./audit.service";

@Module({
  imports: [InstitutionModule],
  controllers: [AuditController, AuditLogController],
  providers: [AuditService],
})
export class AuditModule {}
