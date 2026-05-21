import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class CreateCredentialDto {
  @IsString()
  @MinLength(2)
  studentName!: string;

  @IsString()
  @MinLength(2)
  studentId!: string;

  @IsString()
  @MinLength(2)
  degree!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2200)
  graduationYear?: number;
}
