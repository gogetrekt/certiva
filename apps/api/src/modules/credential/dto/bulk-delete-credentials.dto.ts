import { IsArray, IsString, ArrayNotEmpty } from "class-validator";

export class BulkDeleteCredentialsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];
}
