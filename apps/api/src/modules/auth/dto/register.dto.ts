import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import type { AdminRole } from '@prisma/client';

import { ADMIN_ROLE_VALUES } from '../../../common/auth/admin-role.constants';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'Username can only contain letters, numbers, dots, underscores, and hyphens',
  })
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsIn(ADMIN_ROLE_VALUES)
  role?: AdminRole;
}
