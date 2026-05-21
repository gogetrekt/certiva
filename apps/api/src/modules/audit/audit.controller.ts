import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import {
  ADMIN_ROLE,
  AUDITOR_ROLE,
  OWNER_ROLE,
  SUPER_ADMIN_ROLE,
} from '../../common/auth/admin-role.constants';
import { GetAdmin } from '../../common/decorators/get-admin.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimit, RATE_LIMIT_RULE } from '../../common/rate-limit';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { AuditService } from './audit.service';

@Controller('audit')
@RateLimit(RATE_LIMIT_RULE.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE)
  listLogs(@GetAdmin() admin: JwtPayload, @Query('limit') limit?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.auditService.listLogs(admin, parsedLimit);
  }

  @Get('blockchain')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE)
  listBlockchainAudit(
    @GetAdmin() admin: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.auditService.listBlockchainAudit(admin, parsedLimit);
  }

  @Get('dashboard/metrics')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE)
  getDashboardMetrics(@GetAdmin() admin: JwtPayload) {
    return this.auditService.getDashboardMetrics(admin);
  }

  @Get('dashboard/activity')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE)
  getActivityFeed(
    @GetAdmin() admin: JwtPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.getActivityFeed(admin, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('dashboard/analytics')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE)
  getVerificationAnalytics(
    @GetAdmin() admin: JwtPayload,
    @Query('days') days?: string,
  ) {
    const parsedDays = Number(days ?? 7);
    const validDays = [7, 30, 90].includes(parsedDays)
      ? (parsedDays as 7 | 30 | 90)
      : 7;
    return this.auditService.getVerificationAnalytics(admin, validDays);
  }

  @Get('dashboard/issuances')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE)
  getLatestIssuances(
    @GetAdmin() admin: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getLatestIssuances(admin, limit ? Number(limit) : undefined);
  }

  @Get('dashboard/revocations')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE)
  getLatestRevocations(
    @GetAdmin() admin: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getLatestRevocations(admin, limit ? Number(limit) : undefined);
  }

  @Get('dashboard/queue')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE)
  getQueueHealth(@GetAdmin() admin: JwtPayload) {
    return this.auditService.getQueueHealth(admin);
  }

  @Get('dashboard/export')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE)
  async exportCsv(@GetAdmin() admin: JwtPayload, @Res() res: Response) {
    const rows = await this.auditService.getExportData(admin);

    const headers = [
      'Credential ID',
      'Institution',
      'Degree',
      'Student Name',
      'Student ID',
      'Issued Date',
      'Verification Count',
      'Status',
      'Blockchain State',
      'Tx Hash',
    ];

    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        [
          escape(r.credentialId),
          escape(r.institution),
          escape(r.degree),
          escape(r.studentName),
          escape(r.studentId),
          escape(r.issuedDate),
          escape(r.verificationCount),
          escape(r.status),
          escape(r.blockchainState),
          escape(r.txHash),
        ].join(','),
      ),
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certiva-credentials-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }
}
