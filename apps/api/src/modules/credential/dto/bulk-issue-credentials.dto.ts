import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class BulkIssueCredentialsDto {
  @IsString()
  @MinLength(1)
  csv!: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    return value;
  })
  @IsBoolean()
  commit?: boolean;
}
