import { SetMetadata } from "@nestjs/common";
import type { Permission } from "../auth/permissions";

export const PERMISSION_KEY = "required_permission";

export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSION_KEY, permissions);
