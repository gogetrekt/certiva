import {
  IsEnum,
  IsFQDN,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import { IssuerStatus } from '@prisma/client';

/** Longest legal domain name; also the column's practical ceiling. */
const DOMAIN_MAX_LENGTH = 253;
const NAME_MAX_LENGTH = 200;

export class UpdateInstitutionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  displayName?: string;

  /**
   * This value becomes `did:web:<domain>` and the `id` IRI of every VC signed
   * afterwards, so a malformed one is baked permanently into signed documents
   * that cannot be corrected without re-signing. `IsFQDN` is what rules out the
   * cases that actually reach us: an empty string, a scheme (`https://x.ac.id`),
   * an embedded path (`x.ac.id/verify` — `did:web` separates path segments with
   * `:`, not `/`, so it would never resolve), and whitespace.
   */
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(DOMAIN_MAX_LENGTH)
  @IsFQDN()
  domain?: string;

  @IsOptional()
  @IsUrl({
    require_tld: false,
  })
  logoUrl?: string;

  @IsOptional()
  @IsUrl({
    require_tld: false,
  })
  websiteUrl?: string;

  // Optional, but a stored non-address would fail on chain at anchor time rather
  // than here. Case is left alone: EIP-55 checksum casing is not enforced, so
  // both all-lowercase and checksummed addresses are accepted.
  @IsOptional()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'wallet must be a 0x-prefixed 20-byte hex address',
  })
  wallet?: string;

  @IsOptional()
  @IsEnum(IssuerStatus)
  status?: IssuerStatus;
}
