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
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AppConfigService } from '../../config/app-config.service';
import { RateLimit, RATE_LIMIT_RULE } from '../../common/rate-limit';
import { CredentialAssetsService } from '../credential/credential-assets.service';
import { CredentialService } from '../credential/credential.service';
import { VerifyCredentialDto } from './dto/verify-credential.dto';
import { VerificationService } from './verification.service';
import { MAX_UPLOAD_SIZE_BYTES } from '../../common/services/pdf-reference.service';
import { resolveClientIp } from '../../common/http/resolve-client-ip';

@ApiTags('verification')
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
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_SIZE_BYTES } }),
  )
  verifyCredentialPdf(
    @UploadedFile() file: { buffer: Buffer; size: number; mimetype: string },
    @Req() req: Request,
  ) {
    const ipAddress = this.resolveRequestIp(req);
    return this.verificationService.verifyCredentialPdf(file, ipAddress);
  }

  @Post('verify/secure-pdf')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION_UPLOAD)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_SIZE_BYTES } }),
  )
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

  @Get('verification/:credentialId/proof')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION)
  getProof(@Param('credentialId') credentialId: string) {
    return this.verificationService.getCredentialProof(credentialId);
  }

  /**
   * W3C VC 2.0 / Open Badges 3.0 export, secured with a DataIntegrityProof.
   * Sits alongside /proof rather than replacing it.
   */
  @Get('verification/:credentialId/vc')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION)
  @Header('Content-Type', 'application/vc+ld+json')
  getVerifiableCredential(@Param('credentialId') credentialId: string) {
    return this.verificationService.getCredentialVc(credentialId);
  }

  @Post('verification/upload')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION_UPLOAD)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_SIZE_BYTES } }),
  )
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
    return resolveClientIp(req, this.configService.trustProxy);
  }
}
