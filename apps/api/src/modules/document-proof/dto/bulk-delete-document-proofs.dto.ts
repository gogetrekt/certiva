import {
  IsArray,
  IsString,
  ArrayNotEmpty,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';

import { MAX_BULK_IDS, MAX_ID_LENGTH } from '../../credential/dto/bulk-limits';

export class BulkDeleteDocumentProofsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_BULK_IDS)
  @IsString({ each: true })
  @MaxLength(MAX_ID_LENGTH, { each: true })
  ids!: string[];
}
