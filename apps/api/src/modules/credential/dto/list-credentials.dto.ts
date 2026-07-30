import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  MAX_STUDENT_ID_LENGTH,
  MAX_STUDENT_NAME_LENGTH,
} from './create-credential.dto';

export const DEFAULT_CREDENTIAL_PAGE_SIZE = 25;
export const MAX_CREDENTIAL_PAGE_SIZE = 100;

export class ListCredentialsDto {
  // Both feed a `contains` filter, so they are bounded to the length of the
  // column they search rather than left open.
  @IsOptional()
  @IsString()
  @MaxLength(MAX_STUDENT_ID_LENGTH)
  studentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_STUDENT_NAME_LENGTH)
  studentName?: string;

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
  revoked?: boolean;

  /**
   * Issuance year, not the `graduationYear` column — this filter exists to
   * replace a client-side `new Date(issuedAt).getFullYear()` filter that could
   * only ever see the rows already sent to the browser.
   */
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(9999)
  issuedYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_CREDENTIAL_PAGE_SIZE)
  pageSize?: number;
}
