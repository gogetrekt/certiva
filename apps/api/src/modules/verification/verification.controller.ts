import {
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';

import { AppConfigService } from '../../config/app-config.service';
import { RateLimit, RATE_LIMIT_RULE } from '../../common/rate-limit';
import { CredentialAssetsService } from '../credential/credential-assets.service';
import { CredentialService } from '../credential/credential.service';
import { VerifyCredentialDto } from './dto/verify-credential.dto';
import { VerificationService } from './verification.service';

@Controller()
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly assetsService: CredentialAssetsService,
    private readonly credentialService: CredentialService,
    private readonly configService: AppConfigService,
  ) {}

  @Post('verifications')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION)
  verify(@Body() dto: VerifyCredentialDto, @Req() req: Request) {
    const ipAddress = this.resolveRequestIp(req);
    return this.verificationService.verify(dto, ipAddress);
  }

  @Post('verify/credential/code')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION)
  verifyCredentialCode(
    @Body('verificationCode') verificationCode: string | undefined,
    @Body('verificationId') verificationId: string | undefined,
    @Req() req: Request,
  ) {
    const ipAddress = this.resolveRequestIp(req);
    return this.verificationService.verifyCredentialCode(
      verificationCode ?? verificationId ?? '',
      ipAddress,
    );
  }

  @Post('verify/credential/pdf')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION_UPLOAD)
  @UseInterceptors(FileInterceptor('file'))
  verifyCredentialPdf(
    @UploadedFile() file: { buffer: Buffer; size: number; mimetype: string },
    @Req() req: Request,
  ) {
    const ipAddress = this.resolveRequestIp(req);
    return this.verificationService.verifyCredentialPdf(file, ipAddress);
  }

  @Post('verify/secure-pdf')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION_UPLOAD)
  @UseInterceptors(FileInterceptor('file'))
  verifySecurePdf(
    @UploadedFile() file: { buffer: Buffer; size: number; mimetype: string },
    @Req() req: Request,
  ) {
    const ipAddress = this.resolveRequestIp(req);
    return this.verificationService.verifySecurePdf(file, ipAddress);
  }

  @Get('verify/:verificationId')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION)
  verifyByVerificationId(
    @Param('verificationId') verificationId: string,
    @Req() req: Request,
  ) {
    const ipAddress = this.resolveRequestIp(req);
    return this.verificationService.verifyByVerificationId(
      verificationId,
      ipAddress,
    );
  }

  @Post('verification/upload')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION_UPLOAD)
  @UseInterceptors(FileInterceptor('file'))
  verifyUploadedPdf(
    @UploadedFile() file: { buffer: Buffer; size: number; mimetype: string },
    @Req() req: Request,
  ) {
    const ipAddress = this.resolveRequestIp(req);
    return this.verificationService.verifyUploadedPdf(file, ipAddress);
  }

  @Get('verify/:verificationId/certificate')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION)
  @Header('Content-Type', 'application/pdf')
  async certificate(
    @Param('verificationId') verificationId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (this.configService.appEnv === 'staging') {
      res.setHeader('X-Asset-Storage', 'r2');
    }

    const credential =
      await this.verificationService.getCertificateByVerificationId(
        verificationId,
      );

    try {
      const file = await this.assetsService.readCertificate(credential.id);
      return new StreamableFile(file, {
        disposition: `attachment; filename="credential-${verificationId}.pdf"`,
      });
    } catch {
      await this.credentialService.ensureAssets(credential.id);
      try {
        const file = await this.assetsService.readCertificate(credential.id);
        return new StreamableFile(file, {
          disposition: `attachment; filename="credential-${verificationId}.pdf"`,
        });
      } catch {
        throw new NotFoundException('Credential certificate not found');
      }
    }
  }

  private resolveRequestIp(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0]?.trim() || req.ip || 'unknown';
    }

    return req.ip ?? 'unknown';
  }
}
