import { IsOptional, IsString, MaxLength } from 'class-validator';

import { MAX_VERIFICATION_CODE_LENGTH } from './verify-credential-code.dto';

/** A SHA-256 hex digest is 64 characters; the rest is slack. */
const MAX_HASH_LENGTH = 128;
const MAX_DOMAIN_LENGTH = 253;

export class VerifyCredentialDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_VERIFICATION_CODE_LENGTH)
  credentialId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_HASH_LENGTH)
  hash?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_DOMAIN_LENGTH)
  issuerDomain?: string;
}
