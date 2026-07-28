import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/** Long enough for any reference this system mints, short enough that a body
 * cannot be used to push megabytes into a Prisma `where`. */
const MAX_REFERENCE_LENGTH = 256;

/**
 * Every reference this system issues is `dpf_<hex>`, `vrf_<hex>`, `DP-<HEX>`, a
 * 64-char hash, or a cuid — all of them inside this charset. The lookup does an
 * exact match and has never parsed URLs, so nothing legitimate is turned away.
 *
 * The charset is doing security work, not just tidiness: the global
 * ValidationPipe runs with `enableImplicitConversion`, which stringifies a JSON
 * object into `"[object Object]"` before `@IsString()` ever sees it. So
 * `{"verificationCode": {"$ne": null}}` passes a type check on its own and this
 * is what actually rejects it.
 */
const REFERENCE_PATTERN = /^[A-Za-z0-9_-]+$/;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class VerifyDocumentCodeDto {
  /**
   * `verificationId` is the legacy name for the same value, so either field
   * satisfies the request — but at least one has to be present. `ValidateIf`
   * expresses that without a custom class validator: when `verificationId` is
   * absent, `verificationCode` is mandatory.
   */
  @ValidateIf((dto: VerifyDocumentCodeDto) => dto.verificationId === undefined)
  @Transform(trim)
  @IsString()
  @MaxLength(MAX_REFERENCE_LENGTH)
  @Matches(REFERENCE_PATTERN)
  verificationCode?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(MAX_REFERENCE_LENGTH)
  @Matches(REFERENCE_PATTERN)
  verificationId?: string;
}
