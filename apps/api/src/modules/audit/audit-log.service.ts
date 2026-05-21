import { Injectable, Logger } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

export interface AuditContext {
  actorAdminId?: string;
  actorUsername?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditEventInput {
  action: AuditAction;
  context: AuditContext;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditEventInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: input.action,
          actorAdminId: input.context.actorAdminId ?? null,
          actorUsername: input.context.actorUsername ?? null,
          targetType: input.targetType ?? null,
          targetId: input.targetId ?? null,
          metadata: input.metadata
            ? (input.metadata as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
          ipAddress: input.context.ipAddress ?? null,
          userAgent: input.context.userAgent ?? null,
        },
      });
    } catch (error) {
      // Audit log failure must never break the primary operation
      this.logger.error(
        `Failed to write audit log for action ${input.action}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async listAuditLogs(options?: { limit?: number; offset?: number }) {
    const take = Math.min(options?.limit ?? 50, 200);
    const skip = options?.offset ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      this.prisma.auditLog.count(),
    ]);

    return { items, total };
  }
}
