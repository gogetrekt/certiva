import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from "@nestjs/common";
import type { Response } from "express";

import { AppConfigService } from "../../config/app-config.service";
import { CredentialAssetsService } from "./credential-assets.service";
import { CredentialService } from "./credential.service";

@Controller("credentials")
export class CredentialAssetsController {
  constructor(
    private readonly credentialService: CredentialService,
    private readonly assetsService: CredentialAssetsService,
    private readonly configService: AppConfigService,
  ) {}

  @Get(":id/metadata")
  @Header("Content-Type", "application/json; charset=utf-8")
  async metadata(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    this.setAssetStorageHeader(res);
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
  async qrCode(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    this.setAssetStorageHeader(res);
    const credential = await this.credentialService.findOneOrThrow(id);

    // If the stored verificationUrl does not contain the correct crd_* identifier,
    // the cached QR PNG was generated from a stale/wrong URL. Delete it so
    // ensureAssets regenerates it with the current correct URL.
    if (
      credential.verificationUrl &&
      !credential.verificationUrl.includes(`/verify/${credential.credentialExternalId}`)
    ) {
      await this.assetsService.deleteQrCode(id);
    }

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

  private setAssetStorageHeader(res: Response) {
    if (this.configService.appEnv === "staging") {
      res.setHeader("X-Asset-Storage", "r2");
    }
  }
}
