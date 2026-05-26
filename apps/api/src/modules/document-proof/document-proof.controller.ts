import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';

import {
  ADMIN_ROLE,
  AUDITOR_ROLE,
  OWNER_ROLE,
  SUPER_ADMIN_ROLE,
} from '../../common/auth/admin-role.constants';
import { GetAdmin } from '../../common/decorators/get-admin.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimit, RATE_LIMIT_RULE } from '../../common/rate-limit';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AppConfigService } from '../../config/app-config.service';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { BulkDeleteDocumentProofsDto } from './dto/bulk-delete-document-proofs.dto';
import { CreateDocumentProofDto } from './dto/create-document-proof.dto';
import { DocumentProofService } from './document-proof.service';

@Controller('document-proofs')
@RateLimit(RATE_LIMIT_RULE.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentProofController {
  constructor(private readonly documentProofService: DocumentProofService) {}

  @Post('bulk-delete')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE)
  bulkDelete(@GetAdmin() admin: JwtPayload, @Body() dto: BulkDeleteDocumentProofsDto) {
    return this.documentProofService.bulkDelete(admin, dto.ids);
  }

  @Get()
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE)
  list(@GetAdmin() admin: JwtPayload) {
    return this.documentProofService.list(admin);
  }

  @Get(':id')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE)
  findById(@GetAdmin() admin: JwtPayload, @Param('id') id: string) {
    return this.documentProofService.findById(admin, id);
  }

  @Delete(':id')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE)
  remove(@GetAdmin() admin: JwtPayload, @Param('id') id: string) {
    return this.documentProofService.remove(admin, id);
  }

  @Post()
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE)
  @UseInterceptors(FileInterceptor('file'))
  create(
    @GetAdmin() admin: JwtPayload,
    @Body() dto: CreateDocumentProofDto,
    @UploadedFile()
    file: {
      buffer: Buffer;
      size: number;
      mimetype: string;
      originalname?: string;
    },
  ) {
    return this.documentProofService.create(admin, dto, file);
  }
}

@Controller()
export class PublicDocumentProofController {
  constructor(
    private readonly documentProofService: DocumentProofService,
    private readonly configService: AppConfigService,
  ) {}

  @Post('verify/document/code')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION)
  verifyByCode(
    @Body('verificationCode') verificationCode: string | undefined,
    @Body('verificationId') verificationId: string | undefined,
    @Req() req: Request,
  ) {
    return this.documentProofService.verifyByReference(
      verificationCode ?? verificationId ?? '',
      this.resolveRequestIp(req),
    );
  }

  @Post('verify/document')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION_UPLOAD)
  @UseInterceptors(FileInterceptor('file'))
  verifyUploadedDocument(
    @UploadedFile() file: { buffer: Buffer; size: number; mimetype: string },
    @Req() req: Request,
  ) {
    return this.documentProofService.verifyUploadedDocument(
      file,
      this.resolveRequestIp(req),
    );
  }

  @Get('proof/:verificationId')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION)
  verifyByPublicId(
    @Param('verificationId') verificationId: string,
    @Req() req: Request,
  ) {
    return this.documentProofService.verifyByReference(
      verificationId,
      this.resolveRequestIp(req),
    );
  }

  @Get('document-proofs/:id/metadata')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION)
  @Header('Content-Type', 'application/json; charset=utf-8')
  async metadata(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    if (this.configService.appEnv === 'staging') {
      res.setHeader('X-Asset-Storage', 'r2');
    }
    try {
      return await this.documentProofService.readMetadata(id);
    } catch {
      throw new NotFoundException('Secure document proof metadata not found');
    }
  }

  @Get('document-proofs/:id/qr')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION)
  @Header('Content-Type', 'image/png')
  async qr(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    if (this.configService.appEnv === 'staging') {
      res.setHeader('X-Asset-Storage', 'r2');
    }
    try {
      const file = await this.documentProofService.readQrCode(id);
      return new StreamableFile(file);
    } catch {
      throw new NotFoundException('Secure document proof QR code not found');
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
