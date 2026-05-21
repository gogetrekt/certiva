import { IsOptional, IsString } from "class-validator";

export class VerifyCredentialDto {
  @IsOptional()
  @IsString()
  credentialId?: string;

  @IsOptional()
  @IsString()
  hash?: string;

  @IsOptional()
  @IsString()
  issuerDomain?: string;
}
