import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { RevocationReason } from "@prisma/client";

export class RevokeCredentialDto {
  @IsEnum(RevocationReason, {
    message: `reason must be one of: ${Object.values(RevocationReason).join(", ")}`,
  })
  reason!: RevocationReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
