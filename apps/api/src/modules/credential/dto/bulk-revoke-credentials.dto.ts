import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ArrayMaxSize,
  ArrayNotEmpty,
} from 'class-validator';
import { RevocationReason } from '@prisma/client';

import { MAX_BULK_IDS, MAX_ID_LENGTH } from './bulk-limits';

export class BulkRevokeCredentialsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_BULK_IDS)
  @IsString({ each: true })
  @MaxLength(MAX_ID_LENGTH, { each: true })
  ids!: string[];

  @IsEnum(RevocationReason, {
    message: `reason must be one of: ${Object.values(RevocationReason).join(', ')}`,
  })
  reason!: RevocationReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
