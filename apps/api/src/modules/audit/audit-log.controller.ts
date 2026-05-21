import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import {
  AUDITOR_ROLE,
  OWNER_ROLE,
  SUPER_ADMIN_ROLE,
} from "../../common/auth/admin-role.constants";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RateLimit, RATE_LIMIT_RULE } from "../../common/rate-limit";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuditLogService } from "./audit-log.service";

@Controller("audit/action-logs")
@RateLimit(RATE_LIMIT_RULE.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, AUDITOR_ROLE)
  list(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.auditLogService.listAuditLogs({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }
}
