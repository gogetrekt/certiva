import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateDocumentProofDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsString()
  @MaxLength(80)
  documentType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  referenceNumber?: string;

  @IsOptional()
  @IsDateString()
  documentDate?: string;
}
