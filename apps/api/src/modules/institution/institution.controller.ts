import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import {
  ADMIN_ROLE,
  AUDITOR_ROLE,
  OWNER_ROLE,
  SUPER_ADMIN_ROLE,
} from '../../common/auth/admin-role.constants';
import { AuditLogService } from '../audit/audit-log.service';
import { GetAdmin } from '../../common/decorators/get-admin.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimit, RATE_LIMIT_RULE } from '../../common/rate-limit';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { InstitutionService } from './institution.service';

@Controller('institution')
@RateLimit(RATE_LIMIT_RULE.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstitutionController {
  constructor(
    private readonly institutionService: InstitutionService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE)
  getInstitution(@GetAdmin() admin: JwtPayload) {
    return this.institutionService.resolveInstitutionForAdmin(admin);
  }

  @Patch()
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE)
  async updateInstitution(
    @GetAdmin() admin: JwtPayload,
    @Body() dto: UpdateInstitutionDto,
  ) {
    const result = await this.institutionService.updateInstitution(dto, admin.sub);
    await this.auditLogService.log({
      action: 'SETTINGS_UPDATED',
      context: { actorAdminId: admin.sub, actorUsername: admin.username ?? undefined },
      targetType: 'Institution',
      targetId: result.id,
      metadata: { updatedFields: Object.keys(dto).filter((k) => dto[k as keyof typeof dto] !== undefined) },
    });
    return result;
  }
}
