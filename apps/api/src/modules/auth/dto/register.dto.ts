import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { AdminRole } from '@prisma/client';

import { ADMIN_ROLE_VALUES } from '../../../common/auth/admin-role.constants';
import { MAX_IDENTIFIER_LENGTH } from './login.dto';

/**
 * bcrypt reads at most 72 bytes. Anything beyond that is silently discarded,
 * so an account could be created with a password whose tail never mattered.
 * Capping it here makes the boundary explicit at the point where the password
 * is chosen.
 */
export const MAX_PASSWORD_LENGTH = 72;

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(MAX_IDENTIFIER_LENGTH)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'Username can only contain letters, numbers, dots, underscores, and hyphens',
  })
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(MAX_PASSWORD_LENGTH)
  password!: string;

  @IsOptional()
  @IsIn(ADMIN_ROLE_VALUES)
  role?: AdminRole;
}
