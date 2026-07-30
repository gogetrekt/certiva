import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const MAX_IDENTIFIER_LENGTH = 255;

/**
 * Generous on purpose. bcrypt only looks at the first 72 bytes, so an account
 * created with a longer password authenticates on its first 72 bytes either
 * way — rejecting the full string here would lock those accounts out. The
 * limit exists to bound the input, not to define the password policy; the
 * 72-byte truncation is enforced at registration instead.
 */
export const MAX_SUBMITTED_PASSWORD_LENGTH = 256;

export class LoginDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(MAX_IDENTIFIER_LENGTH)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(MAX_IDENTIFIER_LENGTH)
  email?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(MAX_SUBMITTED_PASSWORD_LENGTH)
  password!: string;
}
