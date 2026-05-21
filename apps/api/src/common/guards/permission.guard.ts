import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { hasPermission, type Permission } from "../auth/permissions";
import { PERMISSION_KEY } from "../decorators/require-permission.decorator";
import type { JwtPayload } from "../../modules/auth/types/jwt-payload";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const admin = request.user;

    if (!admin) {
      return false;
    }

    const missing = requiredPermissions.filter(
      (perm) => !hasPermission(admin.role, perm),
    );

    if (missing.length > 0) {
      throw new ForbiddenException(
        "You do not have permission to perform this action",
      );
    }

    return true;
  }
}
