import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Both fields are optional because the route accepts either one, but neither
 * may be an arbitrary blob: this endpoint is public and unauthenticated.
 *
 * 128 is far above anything the system issues — verification codes are `CV-`
 * plus 12 hex characters, ids are `crd_`/`vrf_` plus 18 hex.
 */
export const MAX_VERIFICATION_CODE_LENGTH = 128;

export class VerifyCredentialCodeDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_VERIFICATION_CODE_LENGTH)
  verificationCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_VERIFICATION_CODE_LENGTH)
  verificationId?: string;
}
