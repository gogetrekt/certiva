import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditAction } from '@prisma/client';
import type { Request } from 'express';

import type { JwtPayload } from '../../modules/auth/types/jwt-payload';
import { AuditLogService } from '../../modules/audit/audit-log.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const admin = request.user;

    if (!admin) {
      return false;
    }

    if (!requiredRoles.includes(admin.role)) {
      // A privilege escalation attempt is the single event an auditor most
      // wants to see, and the enum value for it existed with no writer: the
      // guard threw and recorded nothing. Fire-and-forget on purpose — this
      // runs on the rejection path, and an audit outage must not turn a 403
      // into a 500.
      void this.auditLogService.log({
        action: AuditAction.FORBIDDEN_ATTEMPT,
        context: {
          actorAdminId: admin.sub,
          actorUsername: admin.username ?? admin.email,
          ipAddress: request.ip,
          userAgent: request.get?.('user-agent'),
        },
        targetType: 'route',
        targetId: `${request.method} ${request.originalUrl ?? request.url}`,
        metadata: { requiredRoles, actualRole: admin.role },
      });

      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
