import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  StreamableFile,
} from "@nestjs/common";

import { CredentialAssetsService } from "./credential-assets.service";
import { CredentialService } from "./credential.service";

@Controller("credentials")
export class CredentialAssetsController {
  constructor(
    private readonly credentialService: CredentialService,
    private readonly assetsService: CredentialAssetsService,
  ) {}

  @Get(":id/metadata")
  @Header("Content-Type", "application/json; charset=utf-8")
  async metadata(@Param("id") id: string) {
    const credential = await this.credentialService.findOneOrThrow(id);

    try {
      return await this.assetsService.readMetadata(id);
    } catch {
      await this.credentialService.ensureAssets(credential.id);
      try {
        return await this.assetsService.readMetadata(id);
      } catch {
        throw new NotFoundException("Credential metadata not found");
      }
    }
  }

  @Get(":id/qr")
  @Header("Content-Type", "image/png")
  async qrCode(@Param("id") id: string) {
    const credential = await this.credentialService.findOneOrThrow(id);

    try {
      const file = await this.assetsService.readQrCode(id);
      return new StreamableFile(file);
    } catch {
      await this.credentialService.ensureAssets(credential.id);
      try {
        const file = await this.assetsService.readQrCode(id);
        return new StreamableFile(file);
      } catch {
        throw new NotFoundException("Credential QR code not found");
      }
    }
  }
}
