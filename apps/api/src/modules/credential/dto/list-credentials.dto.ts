import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class ListCredentialsDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  studentName?: string;

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
  revoked?: boolean;
}
