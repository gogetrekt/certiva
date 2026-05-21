import { IsBoolean, IsIn, IsOptional } from "class-validator";
import type { AdminRole } from "@prisma/client";

import { ADMIN_ROLE_VALUES } from "../../../common/auth/admin-role.constants";

export class UpdateAdminDto {
  @IsOptional()
  @IsIn(ADMIN_ROLE_VALUES)
  role?: AdminRole;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
