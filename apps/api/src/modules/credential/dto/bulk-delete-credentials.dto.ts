import {
  IsArray,
  IsString,
  ArrayNotEmpty,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';

import { MAX_BULK_IDS, MAX_ID_LENGTH } from './bulk-limits';

export class BulkDeleteCredentialsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_BULK_IDS)
  @IsString({ each: true })
  @MaxLength(MAX_ID_LENGTH, { each: true })
  ids!: string[];
}
