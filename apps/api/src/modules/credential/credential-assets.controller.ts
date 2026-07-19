import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';

import { RateLimit, RATE_LIMIT_RULE } from '../../common/rate-limit';
import { AppConfigService } from '../../config/app-config.service';
import { CredentialAssetsService } from './credential-assets.service';
import { CredentialService } from './credential.service';

@Controller('credentials')
export class CredentialAssetsController {
  constructor(
    private readonly credentialService: CredentialService,
    private readonly assetsService: CredentialAssetsService,
    private readonly configService: AppConfigService,
  ) {}

  @Get(':id/metadata')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION)
  @Header('Content-Type', 'application/json; charset=utf-8')
  async metadata(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setAssetStorageHeader(res);
    const credential = await this.credentialService.findOneOrThrow(id);

    let raw: string;
    try {
      raw = await this.assetsService.readMetadata(id);
    } catch {
      await this.credentialService.ensureAssets(credential.id);
      try {
        raw = await this.assetsService.readMetadata(id);
      } catch {
        throw new NotFoundException('Credential metadata not found');
      }
    }

    return this.stripPublicMetadata(raw);
  }

  @Get(':id/qr')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION)
  @Header('Content-Type', 'image/png')
  async qrCode(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setAssetStorageHeader(res);
    const credential = await this.credentialService.findOneOrThrow(id);

    // If the stored verificationUrl does not contain the correct crd_* identifier,
    // the cached QR PNG was generated from a stale/wrong URL. Delete it so
    // ensureAssets regenerates it with the current correct URL.
    if (
      credential.verificationUrl &&
      !credential.verificationUrl.includes(
        `/verify/${credential.credentialExternalId}`,
      )
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
        throw new NotFoundException('Credential QR code not found');
      }
    }
  }

  // Strip PII (studentId) and secrets (verificationCode, signedVerificationToken)
  // from the public metadata JSON before returning it.
  private stripPublicMetadata(raw: string) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      delete parsed.studentId;
      delete parsed.verificationCode;
      delete parsed.signedVerificationToken;
      return parsed;
    } catch {
      return raw;
    }
  }

  private setAssetStorageHeader(res: Response) {
    if (this.configService.appEnv === 'staging') {
      res.setHeader('X-Asset-Storage', 'r2');
    }
  }
}
