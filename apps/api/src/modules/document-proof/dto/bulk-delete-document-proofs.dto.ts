import { IsArray, IsString, ArrayNotEmpty } from "class-validator";

export class BulkDeleteDocumentProofsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];
}
