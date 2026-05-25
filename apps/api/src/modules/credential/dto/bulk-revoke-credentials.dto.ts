import { IsArray, IsEnum, IsOptional, IsString, MaxLength, ArrayNotEmpty } from "class-validator";
import { RevocationReason } from "@prisma/client";

export class BulkRevokeCredentialsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];

  @IsEnum(RevocationReason, {
    message: `reason must be one of: ${Object.values(RevocationReason).join(", ")}`,
  })
  reason!: RevocationReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
