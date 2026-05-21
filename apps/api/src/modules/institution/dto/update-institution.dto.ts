import { IsEnum, IsOptional, IsString, IsUrl } from "class-validator";
import { IssuerStatus } from "@prisma/client";

export class UpdateInstitutionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsUrl(
    {
      require_tld: false,
    },
  )
  logoUrl?: string;

  @IsOptional()
  @IsUrl(
    {
      require_tld: false,
    },
  )
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  wallet?: string;

  @IsOptional()
  @IsEnum(IssuerStatus)
  status?: IssuerStatus;
}
