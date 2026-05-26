import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentProofVerificationSource,
  Prisma,
  type Issuer,
  type SecureDocumentProof,
} from '@prisma/client';

import { ADMIN_ROLE } from '../../common/auth/admin-role.constants';
import { hashBuffer } from '../../common/utils/hash.util';
import { PdfReferenceService } from '../../common/services/pdf-reference.service';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { AuditLogService } from '../audit/audit-log.service';
import { InstitutionService } from '../institution/institution.service';
import { DocumentProofAssetsService } from './document-proof-assets.service';
import { CreateDocumentProofDto } from './dto/create-document-proof.dto';
import {
  buildDocumentSignedToken,
  generateDocumentProofId,
  generateDocumentVerificationCode,
  generateDocumentVerificationId,
} from './document-proof.utils';

interface UploadedPdfFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
}

type DocumentProofRecord = Prisma.SecureDocumentProofGetPayload<{
  include: {
    issuer: true;
    verificationLogs: {
      orderBy: {
        createdAt: 'desc';
      };
      take: 8;
    };
  };
}>;

type DocumentProofWithIssuer = SecureDocumentProof & {
  issuer: Issuer;
};

@Injectable()
export class DocumentProofService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly institutionService: InstitutionService,
    private readonly assetsService: DocumentProofAssetsService,
    private readonly configService: AppConfigService,
    private readonly pdfReferenceService: PdfReferenceService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    admin: JwtPayload,
    dto: CreateDocumentProofDto,
    file: UploadedPdfFile,
  ) {
    const issuerId = await this.institutionService.resolveInstitutionId(admin);
    const issuer = await this.prisma.issuer.findUnique({
      where: { id: issuerId },
    });

    if (!issuer) {
      throw new NotFoundException('Institution configuration not found');
    }

    await this.pdfReferenceService.prepareUploadedPdf(file);

    const createdAt = new Date();
    const proofId = generateDocumentProofId();
    const verificationId = generateDocumentVerificationId();
    const verificationCode = generateDocumentVerificationCode();
    const sourceHash = hashBuffer(file.buffer);
    const signedVerificationToken = buildDocumentSignedToken({
      proofId,
      verificationId,
      verificationCode,
      issuerId,
      createdAt,
      secret: this.configService.jwtSecret,
    });
    const assetBundle = await this.assetsService.generateAndPersist({
      id: proofId,
      verificationId,
      verificationCode,
      signedVerificationToken,
      title: dto.title.trim(),
      documentType: dto.documentType.trim(),
      referenceNumber: dto.referenceNumber?.trim() || null,
      documentDate: dto.documentDate ? new Date(dto.documentDate) : null,
      sourceHash,
      issuer: {
        id: issuer.id,
        name: issuer.name,
        displayName: issuer.displayName,
        domain: issuer.domain,
        logoUrl: issuer.logoUrl,
        websiteUrl: issuer.websiteUrl,
        status: issuer.status,
      },
    });

    let created = await this.prisma.secureDocumentProof.create({
      data: {
        id: proofId,
        proofExternalId: proofId,
        verificationId,
        verificationCode,
        signedVerificationToken,
        qrPayload: assetBundle.metadata.qrPayload,
        proofUrl: assetBundle.proofUrl,
        metadataUri: assetBundle.metadataUri,
        qrCodeUri: assetBundle.qrCodeUri,
        title: dto.title.trim(),
        documentType: dto.documentType.trim(),
        referenceNumber: dto.referenceNumber?.trim() || null,
        documentDate: dto.documentDate ? new Date(dto.documentDate) : null,
        fileName: this.sanitizeFilename(file.originalname),
        mimeType: file.mimetype,
        fileSize: file.size,
        sourceHash,
        anchorStatus: 'HASH_ONLY',
        chainStatus: 'UNAVAILABLE',
        anchorVersion: 'HASH_ONLY',
        issuerWallet: null,
        createdBy: admin.email,
        issuerId,
      },
      include: {
        issuer: true,
        verificationLogs: {
          orderBy: { createdAt: 'desc' },
          take: 8,
        },
      },
    });

    await this.auditLogService.log({
      action: 'DOCUMENT_PROOF_CREATED',
      context: { actorAdminId: admin.sub, actorUsername: admin.username ?? undefined },
      targetType: 'SecureDocumentProof',
      targetId: proofId,
      metadata: {
        title: dto.title.trim(),
        documentType: dto.documentType.trim(),
        verificationId,
      },
    });

    return this.toResponse(created);
  }

  async list(admin: JwtPayload) {
    const issuerId = await this.resolveIssuerScope(admin);
    const items = await this.prisma.secureDocumentProof.findMany({
      where: issuerId ? { issuerId } : undefined,
      include: {
        issuer: true,
        verificationLogs: {
          orderBy: { createdAt: 'desc' },
          take: 8,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      total: items.length,
      items: items.map((item) => this.toResponse(item)),
    };
  }

  async findById(admin: JwtPayload, id: string) {
    const proof = await this.prisma.secureDocumentProof.findUnique({
      where: { id },
      include: {
        issuer: true,
        verificationLogs: {
          orderBy: { createdAt: 'desc' },
          take: 8,
        },
      },
    });

    if (!proof) {
      throw new NotFoundException('Secure document proof not found');
    }

    const issuerId = await this.resolveIssuerScope(admin);
    if (issuerId && proof.issuerId !== issuerId) {
      throw new NotFoundException('Secure document proof not found');
    }

    return this.toResponse(proof);
  }

  async remove(admin: JwtPayload, id: string) {
    const proof = await this.prisma.secureDocumentProof.findUnique({
      where: { id },
      select: {
        id: true,
        issuerId: true,
        title: true,
        documentType: true,
        verificationId: true,
      },
    });

    if (!proof) {
      throw new NotFoundException('Secure document proof not found');
    }

    const issuerId = await this.resolveIssuerScope(admin);
    if (issuerId && proof.issuerId !== issuerId) {
      throw new NotFoundException('Secure document proof not found');
    }

    await this.prisma.$transaction([
      this.prisma.secureDocumentProofVerificationLog.deleteMany({
        where: {
          documentProofId: id,
        },
      }),
      this.prisma.secureDocumentProof.delete({
        where: { id },
      }),
    ]);

    await this.auditLogService.log({
      action: 'DOCUMENT_PROOF_DELETED',
      context: { actorAdminId: admin.sub, actorUsername: admin.username ?? undefined },
      targetType: 'SecureDocumentProof',
      targetId: id,
      metadata: {
        title: proof.title,
        documentType: proof.documentType,
        verificationId: proof.verificationId,
      },
    });

    return {
      id,
      deleted: true,
    };
  }

  async bulkDelete(admin: JwtPayload, ids: string[]) {
    const issuerId = await this.resolveIssuerScope(admin);
    let deleted = 0;
    let skipped = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        const proof = await this.prisma.secureDocumentProof.findUnique({
          where: { id },
          select: { id: true, issuerId: true },
        });
        if (!proof) { skipped++; continue; }
        if (issuerId && proof.issuerId !== issuerId) { skipped++; continue; }

        await this.prisma.$transaction([
          this.prisma.secureDocumentProofVerificationLog.deleteMany({ where: { documentProofId: id } }),
          this.prisma.secureDocumentProof.delete({ where: { id } }),
        ]);

        await this.auditLogService.log({
          action: 'DOCUMENT_PROOF_DELETED',
          context: { actorAdminId: admin.sub, actorUsername: admin.username ?? undefined },
          targetType: 'SecureDocumentProof',
          targetId: id,
          metadata: { bulk: true },
        });

        deleted++;
      } catch {
        failed++;
      }
    }

    return { deleted, skipped, failed };
  }

  async readMetadata(proofId: string) {
    try {
      return await this.assetsService.readMetadata(proofId);
    } catch {
      await this.regenerateAssets(proofId);
      return this.assetsService.readMetadata(proofId);
    }
  }

  async readQrCode(proofId: string) {
    try {
      return await this.assetsService.readQrCode(proofId);
    } catch {
      await this.regenerateAssets(proofId);
      return this.assetsService.readQrCode(proofId);
    }
  }

  async regenerateAssets(proofId: string) {
    const proof = await this.prisma.secureDocumentProof.findUnique({
      where: { id: proofId },
      include: { issuer: true },
    });

    if (!proof) {
      throw new NotFoundException('Secure document proof not found');
    }

    const assetBundle = await this.assetsService.generateAndPersist({
      id: proof.id,
      verificationId: proof.verificationId,
      verificationCode: proof.verificationCode,
      signedVerificationToken: proof.signedVerificationToken,
      title: proof.title,
      documentType: proof.documentType,
      referenceNumber: proof.referenceNumber,
      documentDate: proof.documentDate,
      sourceHash: proof.sourceHash,
      issuer: {
        id: proof.issuer.id,
        name: proof.issuer.name,
        displayName: proof.issuer.displayName,
        domain: proof.issuer.domain,
        logoUrl: proof.issuer.logoUrl,
        websiteUrl: proof.issuer.websiteUrl,
        status: proof.issuer.status,
      },
    });

    await this.prisma.secureDocumentProof.update({
      where: { id: proof.id },
      data: {
        proofUrl: assetBundle.proofUrl,
        qrPayload: assetBundle.metadata.qrPayload,
        metadataUri: assetBundle.metadataUri,
        qrCodeUri: assetBundle.qrCodeUri,
      },
    });

    return assetBundle;
  }

  async verifyByReference(reference: string, ipAddress: string) {
    const createdAt = new Date();
    const proof = await this.findByReference(reference);
    if (!proof) {
      await this.recordVerification({
        documentProofId: null,
        sourceType: DocumentProofVerificationSource.CODE_LOOKUP,
        uploadedHash: null,
        matched: false,
        status: 'NOT_FOUND',
        ipAddress,
        createdAt,
      });

      return this.buildNotFoundResponse(createdAt);
    }

    return this.buildVerificationResponse(
      proof,
      ipAddress,
      createdAt,
      DocumentProofVerificationSource.CODE_LOOKUP,
      null,
      proof.sourceHash,
    );
  }

  async verifyUploadedDocument(file: UploadedPdfFile, ipAddress: string) {
    await this.pdfReferenceService.prepareUploadedPdf(file);
    const createdAt = new Date();
    const uploadedHash = hashBuffer(file.buffer);
    const reference =
      await this.pdfReferenceService.extractReferenceFromPdfBuffer(
        file.buffer,
        'document',
      );
    const proof =
      (reference ? await this.findByReference(reference) : null) ??
      (await this.findBySourceHash(uploadedHash));

    if (!proof) {
      await this.recordVerification({
        documentProofId: null,
        sourceType: DocumentProofVerificationSource.PDF_UPLOAD,
        uploadedHash,
        matched: false,
        status: 'NOT_FOUND',
        ipAddress,
        createdAt,
      });

      return {
        ...this.buildNotFoundResponse(createdAt),
        resolvedReference: reference,
        uploadedHash,
      };
    }

    return this.buildVerificationResponse(
      proof,
      ipAddress,
      createdAt,
      DocumentProofVerificationSource.PDF_UPLOAD,
      uploadedHash,
      uploadedHash,
      reference,
    );
  }

  private async buildVerificationResponse(
    proof: DocumentProofWithIssuer,
    ipAddress: string,
    createdAt: Date,
    sourceType: DocumentProofVerificationSource,
    uploadedHash: string | null,
    comparedHash: string,
    resolvedReference?: string | null,
  ) {
    const integrityMatched = proof.sourceHash === comparedHash;
    const status = proof.revoked
      ? 'REVOKED'
      : integrityMatched
        ? 'AUTHENTIC'
        : 'DOCUMENT_MODIFIED';

    const updated = await this.recordVerification({
      documentProofId: proof.id,
      sourceType,
      uploadedHash,
      matched: integrityMatched && !proof.revoked,
      status,
      ipAddress,
      createdAt,
    });

    const current = updated ?? proof;
    return {
      status,
      authentic: status === 'AUTHENTIC',
      verificationId: current.verificationId,
      verificationCode: current.verificationCode,
      proofUrl: this.assetsService.resolveProofUrl(
        current.verificationId,
        current.proofUrl,
      ),
      metadataUri: this.assetsService.resolveMetadataUri(
        current.id,
        current.metadataUri,
      ),
      qrCodeUri: this.assetsService.resolveQrCodeUri(
        current.id,
        current.qrCodeUri,
      ),
      title: current.title,
      documentType: current.documentType,
      referenceNumber: current.referenceNumber,
      documentDate: current.documentDate,
      issuedBy: current.issuer.displayName ?? current.issuer.name,
      verificationTimestamp: createdAt,
      proofTimestamp: current.createdAt,
      uploadedHash,
      registeredHash: current.sourceHash,
      integrityMatched,
      tamperDetected: !integrityMatched,
      revoked: current.revoked,
      revokedAt: current.revokedAt,
      revocationReason: current.revocationReason,
      verificationCount: current.verificationCount,
      blockchainVerified: false,
      blockchainStatus: 'UNAVAILABLE',
      txHash: null,
      blockNumber: null,
      anchoredAt: null,
      resolvedReference: resolvedReference ?? current.verificationId,
      trustChecks: [
        { key: 'integrity', label: 'Integrity Verified', ok: integrityMatched },
        {
          key: 'issuer',
          label: 'Proof Record Found',
          ok: true,
        },
        {
          key: 'active',
          label: current.revoked ? 'Proof Revoked' : 'Proof Active',
          ok: !current.revoked,
        },
      ],
      issuer: {
        id: current.issuer.id,
        name: current.issuer.name,
        displayName: current.issuer.displayName,
        domain: current.issuer.domain,
        logoUrl: current.issuer.logoUrl,
        websiteUrl: current.issuer.websiteUrl,
        status: current.issuer.status,
      },
    };
  }

  private buildNotFoundResponse(createdAt: Date) {
    return {
      status: 'NOT_FOUND' as const,
      authentic: false,
      verificationId: null,
      verificationCode: null,
      proofUrl: null,
      metadataUri: null,
      qrCodeUri: null,
      title: null,
      documentType: null,
      referenceNumber: null,
      documentDate: null,
      issuedBy: null,
      verificationTimestamp: createdAt,
      proofTimestamp: null,
      uploadedHash: null,
      registeredHash: null,
      integrityMatched: false,
      tamperDetected: false,
      revoked: false,
      revokedAt: null,
      revocationReason: null,
      verificationCount: 0,
      blockchainVerified: false,
      blockchainStatus: 'UNAVAILABLE',
      txHash: null,
      blockNumber: null,
      anchoredAt: null,
      resolvedReference: null,
      trustChecks: [
        { key: 'integrity', label: 'Integrity Verified', ok: false },
        { key: 'issuer', label: 'Proof Record Found', ok: false },
        { key: 'active', label: 'Proof Active', ok: false },
      ],
      issuer: null,
    };
  }

  private async findByReference(reference: string) {
    const normalized = reference.trim();
    if (!normalized) {
      return null;
    }

    return this.prisma.secureDocumentProof.findFirst({
      where: {
        OR: [
          { verificationId: normalized },
          { verificationCode: normalized.toUpperCase() },
          { signedVerificationToken: normalized.toLowerCase() },
        ],
      },
      include: {
        issuer: true,
      },
    });
  }

  private async findBySourceHash(sourceHash: string) {
    return this.prisma.secureDocumentProof.findUnique({
      where: {
        sourceHash,
      },
      include: {
        issuer: true,
      },
    });
  }

  private async recordVerification(input: {
    documentProofId: string | null;
    sourceType: DocumentProofVerificationSource;
    uploadedHash: string | null;
    matched: boolean;
    status: string;
    ipAddress: string;
    createdAt: Date;
  }) {
    if (!input.documentProofId) {
      await this.prisma.secureDocumentProofVerificationLog.create({
        data: {
          documentProofId: null,
          sourceType: input.sourceType,
          uploadedHash: input.uploadedHash,
          matched: input.matched,
          status: input.status,
          ipAddress: input.ipAddress,
          createdAt: input.createdAt,
        },
      });

      return null;
    }

    const [, updatedProof] = await this.prisma.$transaction([
      this.prisma.secureDocumentProofVerificationLog.create({
        data: {
          documentProofId: input.documentProofId,
          sourceType: input.sourceType,
          uploadedHash: input.uploadedHash,
          matched: input.matched,
          status: input.status,
          ipAddress: input.ipAddress,
          createdAt: input.createdAt,
        },
      }),
      this.prisma.secureDocumentProof.update({
        where: { id: input.documentProofId },
        data: {
          verificationCount: {
            increment: 1,
          },
          verifiedAt: input.createdAt,
        },
        include: {
          issuer: true,
        },
      }),
    ]);

    return updatedProof;
  }

  private sanitizeFilename(name?: string | null): string {
    if (!name) return 'document.pdf';
    // Strip path separators and null bytes, allow only safe filename characters
    const stripped = name
      .replace(/[/\\]/g, '')
      .replace(/\0/g, '')
      .trim();
    const safe = stripped.replace(/[^a-zA-Z0-9._\- ]/g, '_');
    return safe.slice(0, 200) || 'document.pdf';
  }

  private async resolveIssuerScope(admin: JwtPayload) {
    if (admin.role !== ADMIN_ROLE) {
      return null;
    }

    return this.institutionService.resolveInstitutionId(admin);
  }

  private toResponse(proof: DocumentProofRecord) {
    return {
      id: proof.id,
      proofExternalId: proof.proofExternalId,
      verificationId: proof.verificationId,
      verificationCode: proof.verificationCode,
      signedVerificationToken: proof.signedVerificationToken,
      qrPayload: proof.qrPayload,
      proofUrl: this.assetsService.resolveProofUrl(
        proof.verificationId,
        proof.proofUrl,
      ),
      metadataUri: this.assetsService.resolveMetadataUri(
        proof.id,
        proof.metadataUri,
      ),
      qrCodeUri: this.assetsService.resolveQrCodeUri(proof.id, proof.qrCodeUri),
      title: proof.title,
      documentType: proof.documentType,
      referenceNumber: proof.referenceNumber,
      documentDate: proof.documentDate,
      fileName: proof.fileName,
      mimeType: proof.mimeType,
      fileSize: proof.fileSize,
      sourceHash: proof.sourceHash,
      txHash: proof.txHash,
      chainId: proof.chainId,
      anchoredAt: proof.anchoredAt,
      blockNumber: proof.blockNumber,
      anchorStatus: proof.anchorStatus,
      chainStatus: proof.chainStatus,
      chainSyncedAt: proof.chainSyncedAt,
      anchorVersion: proof.anchorVersion,
      issuerWallet: proof.issuerWallet,
      chainVerificationMetadata: proof.chainVerificationMetadata,
      revoked: proof.revoked,
      revokedAt: proof.revokedAt,
      revokedBy: proof.revokedBy,
      revocationReason: proof.revocationReason,
      verificationCount: proof.verificationCount,
      verifiedAt: proof.verifiedAt,
      createdBy: proof.createdBy,
      createdAt: proof.createdAt,
      updatedAt: proof.updatedAt,
      issuer: {
        id: proof.issuer.id,
        name: proof.issuer.name,
        displayName: proof.issuer.displayName,
        domain: proof.issuer.domain,
        logoUrl: proof.issuer.logoUrl,
        websiteUrl: proof.issuer.websiteUrl,
        wallet: proof.issuer.wallet,
        status: proof.issuer.status,
      },
      verificationLogs: proof.verificationLogs,
    };
  }
}
