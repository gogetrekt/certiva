import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * These three land on the printed certificate and in the signed payload, so the
 * bound is about what a real record looks like, not about what Postgres would
 * accept — the columns are unbounded `String`.
 */
export const MAX_STUDENT_NAME_LENGTH = 200;
export const MAX_STUDENT_ID_LENGTH = 64;
export const MAX_DEGREE_LENGTH = 200;

export class CreateCredentialDto {
  @IsString()
  @MinLength(2)
  @MaxLength(MAX_STUDENT_NAME_LENGTH)
  studentName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(MAX_STUDENT_ID_LENGTH)
  studentId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(MAX_DEGREE_LENGTH)
  degree!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2200)
  graduationYear?: number;
}
