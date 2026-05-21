import { Injectable } from "@nestjs/common";

import { ADMIN_ROLE } from "../../common/auth/admin-role.constants";
import { PrismaService } from "../../prisma/prisma.service";
import type { JwtPayload } from "../auth/types/jwt-payload";
import { InstitutionService } from "../institution/institution.service";

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly institutionService: InstitutionService,
  ) {}

  private async resolveIssuerId(admin: JwtPayload): Promise<string | null> {
    return admin.role === ADMIN_ROLE
      ? this.institutionService.resolveInstitutionId(admin)
      : null;
  }

  async listLogs(admin: JwtPayload, limit = 50) {
    const take = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50;
    const issuerId = await this.resolveIssuerId(admin);

    return this.prisma.verificationLog.findMany({
      where: {
        credentialId: { not: null },
        ...(issuerId ? { credential: { issuerId } } : {}),
      },
      include: {
        credential: {
          include: { issuer: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async listBlockchainAudit(admin: JwtPayload, limit = 100) {
    const take = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 100;
    const issuerId = await this.resolveIssuerId(admin);

    return this.prisma.blockchainAnchorLog.findMany({
      where: issuerId ? { credential: { issuerId } } : undefined,
      include: {
        credential: {
          include: { issuer: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take,
    });
  }

  // ─── Dashboard metrics ────────────────────────────────────────────────────

  async getDashboardMetrics(admin: JwtPayload) {
    const issuerId = await this.resolveIssuerId(admin);
    const where = issuerId ? { issuerId } : {};

    const [
      totalIssued,
      revokedCount,
      pendingAnchor,
      totalVerifications,
      successfulVerifications,
    ] = await Promise.all([
      this.prisma.credential.count({ where }),
      this.prisma.credential.count({ where: { ...where, revoked: true } }),
      this.prisma.credential.count({ where: { ...where, anchorStatus: "PENDING" } }),
      this.prisma.verificationLog.count({
        where: {
          credentialId: { not: null },
          ...(issuerId ? { credential: { issuerId } } : {}),
        },
      }),
      this.prisma.verificationLog.count({
        where: {
          status: "VALID",
          credentialId: { not: null },
          ...(issuerId ? { credential: { issuerId } } : {}),
        },
      }),
    ]);

    const activeCount = totalIssued - revokedCount;
    const successRate =
      totalVerifications > 0
        ? Math.round((successfulVerifications / totalVerifications) * 1000) / 10
        : 0;

    return {
      totalIssued,
      totalVerified: totalVerifications,
      revokedCount,
      pendingAnchor,
      successRate,
      activeCredentials: activeCount,
    };
  }

  // ─── Activity feed ────────────────────────────────────────────────────────

  async getActivityFeed(
    admin: JwtPayload,
    options: { limit?: number; offset?: number } = {},
  ) {
    const take = Math.min(options.limit ?? 25, 100);
    const skip = options.offset ?? 0;
    const issuerId = await this.resolveIssuerId(admin);
    const credWhere = issuerId ? { issuerId } : {};

    // Fetch verification logs as activity
    const [logs, total] = await Promise.all([
      this.prisma.verificationLog.findMany({
        where: {
          credentialId: { not: null },
          ...(issuerId ? { credential: { issuerId } } : {}),
        },
        include: {
          credential: {
            select: {
              id: true,
              verificationId: true,
              credentialExternalId: true,
              degree: true,
              studentName: true,
              revoked: true,
              issuer: { select: { id: true, name: true, displayName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      this.prisma.verificationLog.count({
        where: {
          credentialId: { not: null },
          ...(issuerId ? { credential: { issuerId } } : {}),
        },
      }),
    ]);

    // Map logs to activity entries
    const items = logs.map((log) => ({
      id: log.id,
      action: this.mapEventTypeToAction(log.eventType, log.status),
      status: log.status,
      credentialId: log.credential?.credentialExternalId ?? log.credentialId ?? "—",
      credentialDbId: log.credential?.id ?? log.credentialId,
      degree: log.credential?.degree ?? null,
      studentName: log.credential?.studentName ?? null,
      institution: log.credential?.issuer?.displayName ?? log.credential?.issuer?.name ?? null,
      occurredAt: log.createdAt.toISOString(),
      ipAddress: log.ipAddress ?? null,
      matched: log.matched,
    }));

    return { items, total };
  }

  private mapEventTypeToAction(eventType: string, status: string): string {
    if (status === "REVOKED") return "Credential Revoked";
    switch (eventType) {
      case "QR_LOOKUP": return "QR Verification";
      case "PDF_INTEGRITY_CHECK": return "PDF Integrity Check";
      default: return "Verification Completed";
    }
  }

  // ─── Verification analytics ───────────────────────────────────────────────

  async getVerificationAnalytics(
    admin: JwtPayload,
    days: 7 | 30 | 90 = 7,
  ) {
    const issuerId = await this.resolveIssuerId(admin);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.prisma.verificationLog.findMany({
      where: {
        credentialId: { not: null },
        createdAt: { gte: since },
        ...(issuerId ? { credential: { issuerId } } : {}),
      },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    });

    // Aggregate by day
    const buckets = new Map<string, { date: string; total: number; valid: number; invalid: number }>();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, total: 0, valid: 0, invalid: 0 });
    }

    for (const log of logs) {
      const key = log.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.total++;
      if (log.status === "VALID") bucket.valid++;
      else bucket.invalid++;
    }

    return { days, buckets: Array.from(buckets.values()) };
  }

  // ─── Latest issuances ─────────────────────────────────────────────────────

  async getLatestIssuances(admin: JwtPayload, limit = 10) {
    const take = Math.min(limit, 50);
    const issuerId = await this.resolveIssuerId(admin);

    return this.prisma.credential.findMany({
      where: issuerId ? { issuerId } : {},
      select: {
        id: true,
        credentialExternalId: true,
        degree: true,
        studentName: true,
        issuedAt: true,
        txHash: true,
        anchorStatus: true,
        anchorVersion: true,
        issuer: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { issuedAt: "desc" },
      take,
    });
  }

  // ─── Latest revocations ───────────────────────────────────────────────────

  async getLatestRevocations(admin: JwtPayload, limit = 10) {
    const take = Math.min(limit, 50);
    const issuerId = await this.resolveIssuerId(admin);

    return this.prisma.credential.findMany({
      where: { ...(issuerId ? { issuerId } : {}), revoked: true },
      select: {
        id: true,
        credentialExternalId: true,
        degree: true,
        studentName: true,
        revokedAt: true,
        revocationReason: true,
        revocationTxHash: true,
        revokedBy: true,
        issuer: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { revokedAt: "desc" },
      take,
    });
  }

  // ─── Queue health ─────────────────────────────────────────────────────────

  async getQueueHealth(admin: JwtPayload) {
    const issuerId = await this.resolveIssuerId(admin);
    const where = issuerId ? { credential: { issuerId } } : {};

    const [pending, processing, failed, completed] = await Promise.all([
      this.prisma.blockchainAnchorLog.count({ where: { ...where, status: "PENDING" } }),
      this.prisma.blockchainAnchorLog.count({ where: { ...where, status: "RETRYING" } }),
      this.prisma.blockchainAnchorLog.count({ where: { ...where, status: "FAILED" } }),
      this.prisma.blockchainAnchorLog.count({ where: { ...where, status: "ANCHORED" } }),
    ]);

    const health: "healthy" | "warning" | "critical" =
      failed === 0 ? "healthy" : failed > 5 ? "critical" : "warning";

    return { pending, processing, failed, completed, health };
  }

  // ─── CSV export ───────────────────────────────────────────────────────────

  async getExportData(admin: JwtPayload) {
    const issuerId = await this.resolveIssuerId(admin);
    const where = issuerId ? { issuerId } : {};

    const credentials = await this.prisma.credential.findMany({
      where,
      select: {
        credentialExternalId: true,
        degree: true,
        studentName: true,
        studentId: true,
        issuedAt: true,
        verificationCount: true,
        revoked: true,
        anchorStatus: true,
        chainStatus: true,
        txHash: true,
        issuer: { select: { name: true, displayName: true } },
      },
      orderBy: { issuedAt: "desc" },
    });

    return credentials.map((c) => ({
      credentialId: c.credentialExternalId,
      institution: c.issuer.displayName ?? c.issuer.name,
      degree: c.degree,
      studentName: c.studentName,
      studentId: c.studentId,
      issuedDate: c.issuedAt.toISOString().slice(0, 10),
      verificationCount: c.verificationCount,
      status: c.revoked ? "REVOKED" : "ACTIVE",
      blockchainState: c.anchorStatus,
      txHash: c.txHash ?? "",
    }));
  }
}
