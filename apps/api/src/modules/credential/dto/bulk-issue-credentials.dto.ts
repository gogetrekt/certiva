import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Two separate limits, because either one alone leaves a hole: a byte cap does
 * not stop a million single-character rows, and a row cap does not stop one
 * enormous line. `MAX_CSV_ROWS` is enforced in the parser, where the rows
 * actually exist.
 */
export const MAX_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_CSV_ROWS = 5000;

export class BulkIssueCredentialsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_CSV_BYTES)
  csv!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  commit?: boolean;
}
