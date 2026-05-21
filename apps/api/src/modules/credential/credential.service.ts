import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CredentialDocumentProofSourceType, Prisma, type Issuer } from '@prisma/client';

import { ADMIN_ROLE } from '../../common/auth/admin-role.constants';
import { PdfReferenceService } from '../../common/services/pdf-reference.service';
import { hashBuffer } from '../../common/utils/hash.util';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { AuditLogService } from '../audit/audit-log.service';
import { BlockchainQueueService } from '../blockchain/blockchain-queue.service';
import { BLOCKCHAIN_OPERATION } from '../blockchain/blockchain.constants';
import { InstitutionService } from '../institution/institution.service';
import { parseCredentialCsv } from './credential.bulk.utils';
import {
  type CredentialAssetBundle,
  type CredentialAssetRecord,
  type CredentialMetadataDocument,
  CredentialAssetsService,
} from './credential-assets.service';
import { BulkIssueCredentialsDto } from './dto/bulk-issue-credentials.dto';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { ListCredentialsDto } from './dto/list-credentials.dto';
import { RevokeCredentialDto } from './dto/revoke-credential.dto';
import {
  buildCredentialHash,
  buildRegistryProofHash,
  buildSignedVerificationToken,
  generateCredentialId,
  generateVerificationCode,
  generateVerificationId,
} from './credential.utils';

type BulkIssueMode = 'preview' | 'issue';

type BulkIssueRowStatus =
  | 'VALID'
  | 'INVALID'
  | 'DUPLICATE'
  | 'EXISTS'
  | 'ISSUED'
  | 'FAILED';

interface BulkIssueRowResult {
  rowNumber: number;
  studentName: string;
  studentId: string;
  degree: string;
  metadataUri?: string;
  documentHash?: string;
  status: BulkIssueRowStatus;
  message?: string;
  verificationId?: string;
  verificationCode?: string;
}

interface UploadedCredentialFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
}

type CredentialWithIssuer = Prisma.CredentialGetPayload<{
  include: {
    issuer: true;
  };
}>;

type CredentialWithIssuerAndLogs = Prisma.CredentialGetPayload<{
  include: {
    issuer: true;
    verificationLogs: true;
    blockchainLogs: true;
    documentProofs: true;
  };
}>;

function hasCredentialLogs(
  credential: CredentialWithIssuerAndLogs | CredentialWithIssuer,
): credential is CredentialWithIssuerAndLogs {
  return 'verificationLogs' in credential && 'blockchainLogs' in credential;
}

@Injectable()
export class CredentialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetsService: CredentialAssetsService,
    private readonly blockchainQueueService: BlockchainQueueService,
    private readonly institutionService: InstitutionService,
    private readonly configService: AppConfigService,
    private readonly pdfReferenceService: PdfReferenceService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(admin: JwtPayload, dto: CreateCredentialDto) {
    const issuerId = await this.institutionService.resolveInstitutionId(admin);
    const credential = await this.issueCredentialRecord(issuerId, {
      studentName: dto.studentName,
      studentId: dto.studentId,
      degree: dto.degree,
      graduationYear: dto.graduationYear,
    });

    await this.auditLogService.log({
      action: 'CREDENTIAL_ISSUED',
      context: { actorAdminId: admin.sub, actorUsername: admin.username ?? undefined },
      targetType: 'Credential',
      targetId: credential.id,
      metadata: {
        studentName: dto.studentName,
        degree: dto.degree,
        verificationId: credential.verificationId,
      },
    });

    return this.toCredentialResponse(credential);
  }

  async bulkIssue(admin: JwtPayload, dto: BulkIssueCredentialsDto) {
    const issuerId = await this.institutionService.resolveInstitutionId(admin);
    const csvText = dto.csv?.trim() ?? '';

    if (!csvText) {
      throw new BadRequestException('CSV content is required.');
    }

    const parseResult = parseCredentialCsv(dto.csv);
    if (parseResult.rows.length === 0 && parseResult.errors.length === 0) {
      throw new BadRequestException(
        'No credential rows found in the CSV file.',
      );
    }

    const duplicateRowNumbers = this.findDuplicateRowNumbers(parseResult.rows);
    const existingKeys = await this.lookupExistingCredentialKeys(
      issuerId,
      parseResult.rows,
    );

    const rowResults: BulkIssueRowResult[] = parseResult.errors.map(
      (error) => ({
        rowNumber: error.rowNumber,
        studentName: '',
        studentId: '',
        degree: '',
        status: 'INVALID',
        message: error.message,
      }),
    );

    for (const row of parseResult.rows) {
      const studentName = row.studentName.trim();
      const studentId = row.studentId.trim();
      const degree = row.degree.trim();

      const result: BulkIssueRowResult = {
        rowNumber: row.rowNumber,
        studentName,
        studentId,
        degree,
        documentHash: row.documentHash,
        status: 'VALID',
        message: 'Registry record, QR code, metadata, and mapping reference will be generated.',
      };

      const missingFields = [] as string[];
      if (!studentName) {
        missingFields.push('studentName');
      }
      if (!studentId) {
        missingFields.push('studentId');
      }
      if (!degree) {
        missingFields.push('degree');
      }
      if (missingFields.length > 0) {
        result.status = 'INVALID';
        result.message = `Missing required fields: ${missingFields.join(', ')}.`;
      } else if (duplicateRowNumbers.has(row.rowNumber)) {
        result.status = 'DUPLICATE';
        result.message = 'Duplicate row in this CSV upload.';
      } else if (existingKeys.has(this.buildRowKey(studentId, degree))) {
        result.status = 'EXISTS';
        result.message =
          'Credential already exists for this student ID and degree.';
      }

      rowResults.push(result);
    }

    rowResults.sort((a, b) => a.rowNumber - b.rowNumber);

    if (!dto.commit) {
      return this.buildBulkResponse('preview', rowResults);
    }

    const batch = await this.prisma.issuanceBatch.create({
      data: {
        issuerId,
        uploadedBy: admin.email,
        sourceType: 'CSV',
        totalRows: rowResults.length,
      },
    });

    for (const row of rowResults) {
      if (row.status !== 'VALID') {
        continue;
      }

      try {
        const credential = await this.issueCredentialRecord(issuerId, {
          studentName: row.studentName,
          studentId: row.studentId,
          degree: row.degree,
          batchId: batch.id,
        });

        row.status = 'ISSUED';
        row.verificationId = credential.verificationId;
        row.verificationCode = credential.verificationCode;
        row.metadataUri = credential.metadataUri;
      } catch (error) {
        row.status = 'FAILED';
        row.message = this.getIssueErrorMessage(error);
      }
    }

    await this.prisma.issuanceBatch.update({
      where: { id: batch.id },
      data: {
        issuedRows: rowResults.filter((row) => row.status === 'ISSUED').length,
        failedRows: rowResults.filter((row) => row.status === 'FAILED').length,
      },
    });

    return this.buildBulkResponse('issue', rowResults);
  }

  async list(admin: JwtPayload, query: ListCredentialsDto) {
    const issuerId = await this.institutionService.resolveInstitutionId(admin);
    const studentId = query.studentId?.trim();
    const studentName = query.studentName?.trim();
    const where = {
      issuerId,
      studentId: studentId
        ? {
            contains: studentId,
            mode: 'insensitive' as const,
          }
        : undefined,
      studentName: studentName
        ? {
            contains: studentName,
            mode: 'insensitive' as const,
          }
        : undefined,
      revoked: query.revoked,
    };

    const [items, total] = await Promise.all([
      this.prisma.credential.findMany({
        where,
        include: {
          issuer: true,
        },
        orderBy: {
          issuedAt: 'desc',
        },
      }),
      this.prisma.credential.count({ where }),
    ]);

    return {
      total,
      items: items.map((item) => this.toCredentialResponse(item)),
    };
  }

  async findById(admin: JwtPayload, id: string) {
    const credential = await this.prisma.credential.findUnique({
      where: { id },
      include: {
        issuer: true,
        verificationLogs: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 8,
        },
        blockchainLogs: {
          orderBy: {
            updatedAt: 'desc',
          },
          take: 8,
        },
        documentProofs: {
          orderBy: {
            registeredAt: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    await this.assertCredentialAccess(admin, credential.issuerId);

    return this.toCredentialResponse(credential, {
      includeTimeline: true,
    });
  }

  async revoke(admin: JwtPayload, id: string, dto: RevokeCredentialDto) {
    const existing = await this.prisma.credential.findUnique({
      where: { id },
      include: { issuer: true },
    });

    if (!existing) {
      throw new NotFoundException('Credential not found');
    }

    await this.assertCredentialAccess(admin, existing.issuerId);

    if (existing.revoked) {
      throw new ConflictException('Credential has already been revoked');
    }

    const revoked = await this.prisma.credential.update({
      where: { id },
      data: {
        revoked: true,
        revokedAt: new Date(),
        revokedBy: admin.email,
        revokedByAdminId: admin.sub,
        revocationReason: dto.reason,
        revocationNotes: dto.notes?.trim() || null,
      },
      include: {
        issuer: true,
      },
    });

    await this.auditLogService.log({
      action: 'CREDENTIAL_REVOKED',
      context: { actorAdminId: admin.sub, actorUsername: admin.username ?? undefined },
      targetType: 'Credential',
      targetId: id,
      metadata: {
        reason: dto.reason,
        notes: dto.notes ?? null,
        studentName: existing.studentName,
        degree: existing.degree,
      },
    });

    await this.refreshCredentialMetadata(revoked);
    try {
      await this.blockchainQueueService.enqueueRevoke(revoked.id);
    } catch (error) {
      await this.blockchainQueueService.markQueueFailure(
        revoked.id,
        BLOCKCHAIN_OPERATION.revoke,
        error instanceof Error
          ? error.message
          : 'Unable to enqueue revoke job.',
      );
    }

    return this.findOneOrThrow(revoked.id).then((credential) =>
      this.toCredentialResponse(credential),
    );
  }

  async remove(admin: JwtPayload, id: string) {
    const existing = await this.prisma.credential.findUnique({
      where: { id },
      include: { issuer: true },
    });

    if (!existing) {
      throw new NotFoundException('Credential not found');
    }

    await this.assertCredentialAccess(admin, existing.issuerId);

    if (!existing.revoked) {
      throw new ConflictException('Only revoked credentials can be deleted');
    }

    const deleteVerificationLogs = this.prisma.verificationLog.deleteMany({
      where: {
        credentialId: id,
      },
    });
    const deleteDocumentProofs = this.prisma.credentialDocumentProof.deleteMany({
      where: {
        credentialId: id,
      },
    });
    const deleteBlockchainLogs = this.prisma.blockchainAnchorLog.deleteMany({
      where: {
        credentialId: id,
      },
    });
    const deleteCredential = this.prisma.credential.delete({
      where: { id },
    });

    await this.prisma.$transaction([
      deleteVerificationLogs,
      deleteDocumentProofs,
      deleteBlockchainLogs,
      deleteCredential,
    ]);
    await this.assetsService.deleteAssets(id);

    return {
      id,
      deleted: true,
    };
  }

  async registerSecurePdf(
    admin: JwtPayload,
    id: string,
    file: UploadedCredentialFile,
  ) {
    const credential = await this.prisma.credential.findUnique({
      where: { id },
      include: { issuer: true },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    await this.assertCredentialAccess(admin, credential.issuerId);
    await this.pdfReferenceService.prepareUploadedPdf(file);

    const reference = await this.pdfReferenceService.extractReferenceFromPdfBuffer(
      file.buffer,
      'credential',
    );
    if (!reference) {
      throw new BadRequestException(
        'Unable to read a verification reference from this PDF.',
      );
    }

    const referencedCredential = await this.findByVerificationReference(reference);
    if (!referencedCredential || referencedCredential.id !== credential.id) {
      throw new BadRequestException(
        'The PDF verification reference does not match this credential.',
      );
    }

    return this.registerDocumentProof({
      credentialId: credential.id,
      file,
      registeredBy: admin.email,
      sourceType: CredentialDocumentProofSourceType.SINGLE_PDF,
    });
  }

  async registerBatchSecurePdf(
    admin: JwtPayload,
    batchId: string,
    file: UploadedCredentialFile,
  ) {
    const batch = await this.prisma.issuanceBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException('Issuance batch not found');
    }

    await this.assertCredentialAccess(admin, batch.issuerId);

    throw new BadRequestException(
      'Batch ZIP secure-PDF registration is reserved for the ZIP extraction worker. Register single PDFs from each issued credential for this v1 API path.',
    );
  }

  async findOneOrThrow(id: string) {
    const credential = await this.prisma.credential.findUnique({
      where: { id },
      include: {
        issuer: true,
      },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    return credential;
  }

  async findByVerificationIdOrThrow(verificationId: string) {
    const credential = await this.prisma.credential.findUnique({
      where: { verificationId },
      include: {
        issuer: true,
      },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    return credential;
  }

  async ensureAssets(id: string) {
    const credential = await this.findOneOrThrow(id);
    await this.refreshCredentialAssets(credential);
    return this.findOneOrThrow(id);
  }

  async backfillDocumentHashes() {
    const credentials = await this.prisma.credential.findMany({
      where: {
        documentHash: null,
        securePdfEnabled: true,
      },
      include: {
        issuer: true,
      },
      orderBy: {
        issuedAt: 'asc',
      },
    });

    for (const credential of credentials) {
      await this.syncDocumentHash(credential);
    }

    return credentials.length;
  }

  private async assertCredentialAccess(
    admin: JwtPayload,
    credentialIssuerId: string,
  ) {
    if (admin.role !== ADMIN_ROLE) {
      return;
    }

    const issuerId = await this.institutionService.resolveInstitutionId(admin);
    if (issuerId !== credentialIssuerId) {
      throw new ForbiddenException('You do not have access to this credential');
    }
  }

  private async registerDocumentProof(input: {
    credentialId: string;
    file: UploadedCredentialFile;
    registeredBy: string;
    sourceType: CredentialDocumentProofSourceType;
  }) {
    const documentHash = hashBuffer(input.file.buffer);

    const [, proof, credential] = await this.prisma.$transaction([
      this.prisma.credentialDocumentProof.updateMany({
        where: {
          credentialId: input.credentialId,
          status: 'ACTIVE',
        },
        data: {
          status: 'SUPERSEDED',
        },
      }),
      this.prisma.credentialDocumentProof.upsert({
        where: {
          credentialId_hash: {
            credentialId: input.credentialId,
            hash: documentHash,
          },
        },
        update: {
          fileName: input.file.originalname ?? 'credential.pdf',
          fileSize: input.file.size,
          mimeType: input.file.mimetype,
          registeredAt: new Date(),
          registeredBy: input.registeredBy,
          sourceType: input.sourceType,
          status: 'ACTIVE',
        },
        create: {
          credentialId: input.credentialId,
          hash: documentHash,
          fileName: input.file.originalname ?? 'credential.pdf',
          fileSize: input.file.size,
          mimeType: input.file.mimetype,
          registeredBy: input.registeredBy,
          sourceType: input.sourceType,
          status: 'ACTIVE',
        },
      }),
      this.prisma.credential.update({
        where: { id: input.credentialId },
        data: {
          securePdfEnabled: true,
          verificationMode: 'SECURE_PDF',
          documentHash,
          chainProofHash: documentHash,
          fileName: input.file.originalname ?? 'credential.pdf',
          fileSize: input.file.size,
          mimeType: input.file.mimetype,
        },
        include: {
          issuer: true,
        },
      }),
    ]);

    return {
      credential: this.toCredentialResponse(credential),
      documentProof: proof,
    };
  }

  private async findByVerificationReference(reference: string) {
    const normalized = reference.trim();
    if (!normalized) {
      return null;
    }

    return this.prisma.credential.findFirst({
      where: {
        OR: [
          { verificationId: normalized },
          { verificationCode: normalized },
          { signedVerificationToken: normalized },
        ],
      },
      include: { issuer: true },
    });
  }

  private toCredentialResponse(
    credential: CredentialWithIssuerAndLogs | CredentialWithIssuer,
    options?: {
      includeTimeline?: boolean;
    },
  ) {
    const normalizedVerificationUrl = this.assetsService.resolveVerificationUrl(
      credential.verificationId,
      credential.verificationUrl,
    );
    const normalizedMetadataUri = this.assetsService.resolveMetadataUri(
      credential.id,
      credential.metadataUri,
    );
    const normalizedQrCodeUri = this.assetsService.resolveQrCodeUri(
      credential.id,
      credential.qrCodeUri,
    );
    const normalizedCertificateUri = credential.securePdfEnabled
      ? this.assetsService.resolveCertificateUri(
          credential.verificationId,
          credential.certificateUri,
        )
      : null;
    const metadata = this.resolveMetadataDocument(credential, {
      verificationUrl: normalizedVerificationUrl,
      metadataUri: normalizedMetadataUri,
      qrCodeUri: normalizedQrCodeUri,
      certificateUri: normalizedCertificateUri,
    });
    const activities =
      options?.includeTimeline && hasCredentialLogs(credential)
        ? this.buildActivities(credential)
        : undefined;
    const blockchainLogs =
      hasCredentialLogs(credential) && Array.isArray(credential.blockchainLogs)
        ? credential.blockchainLogs
        : undefined;

    return {
      id: credential.id,
      credentialExternalId: credential.credentialExternalId,
      verificationId: credential.verificationId,
      verificationCode: credential.verificationCode,
      signedVerificationToken: credential.signedVerificationToken,
      qrPayload: credential.qrPayload,
      verificationMode: credential.verificationMode,
      securePdfEnabled: credential.securePdfEnabled,
      studentName: credential.studentName,
      studentId: credential.studentId,
      degree: credential.degree,
      metadataUri: normalizedMetadataUri,
      metadata,
      qrCodeUri: normalizedQrCodeUri,
      certificateUri: normalizedCertificateUri,
      verificationUrl: normalizedVerificationUrl,
      hash: credential.hash,
      registryHash: credential.registryHash,
      chainProofHash: credential.chainProofHash,
      documentHash: credential.documentHash,
      fileName: credential.fileName,
      mimeType: credential.mimeType,
      fileSize: credential.fileSize,
      txHash: credential.txHash,
      chainId: credential.chainId,
      anchoredAt: credential.anchoredAt,
      blockNumber: credential.blockNumber,
      anchorStatus: credential.anchorStatus,
      chainStatus: credential.chainStatus,
      chainSyncedAt: credential.chainSyncedAt,
      anchorVersion: credential.anchorVersion,
      issuerWallet: credential.issuerWallet,
      chainVerificationMetadata: credential.chainVerificationMetadata,
      revocationTxHash: credential.revocationTxHash,
      revoked: credential.revoked,
      revokedAt: credential.revokedAt,
      revokedBy: credential.revokedBy,
      revocationReason: credential.revocationReason,
      verificationCount: credential.verificationCount,
      verifiedAt: credential.verifiedAt,
      issuedAt: credential.issuedAt,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
      issuer: {
        id: credential.issuer.id,
        name: credential.issuer.name,
        displayName: credential.issuer.displayName,
        domain: credential.issuer.domain,
        logoUrl: credential.issuer.logoUrl,
        websiteUrl: credential.issuer.websiteUrl,
        wallet: credential.issuer.wallet,
        status: credential.issuer.status,
      },
      documentProofs:
        'documentProofs' in credential ? credential.documentProofs : undefined,
      blockchainLogs,
      activities,
    };
  }

  private buildActivities(credential: CredentialWithIssuerAndLogs) {
    const activities: Array<{
      id: string;
      type: 'ISSUED' | 'REVOKED' | 'VERIFIED' | 'BLOCKCHAIN';
      status: string;
      occurredAt: Date;
      description: string;
    }> = credential.verificationLogs.map((log) => ({
      id: log.id,
      type: 'VERIFIED' as const,
      status: log.status,
      occurredAt: log.createdAt,
      description: this.buildVerificationActivityDescription(log),
    }));

    activities.push({
      id: `issued-${credential.id}`,
      type: 'ISSUED' as const,
      status: 'VALID',
      occurredAt: credential.issuedAt,
      description: 'Credential record issued and asset bundle generated.',
    });

    if (credential.revokedAt) {
      activities.push({
        id: `revoked-${credential.id}`,
        type: 'REVOKED' as const,
        status: 'REVOKED',
        occurredAt: credential.revokedAt,
        description: credential.revocationReason
          ? `Credential revoked: ${credential.revocationReason}`
          : 'Credential revoked.',
      });
    }

    for (const log of credential.blockchainLogs) {
      activities.push({
        id: log.id,
        type: 'BLOCKCHAIN' as const,
        status: log.status,
        occurredAt: log.updatedAt,
        description: this.buildBlockchainActivityDescription(log),
      });
    }

    return activities.sort(
      (left, right) => right.occurredAt.getTime() - left.occurredAt.getTime(),
    );
  }

  private async issueCredentialRecord(
    issuerId: string,
    input: {
      studentName: string;
      studentId: string;
      degree: string;
      graduationYear?: number;
      batchId?: string;
    },
  ) {
    const issuer = await this.prisma.issuer.findUnique({
      where: { id: issuerId },
    });

    if (!issuer) {
      throw new NotFoundException({
        message: 'Institution configuration not found',
        code: 'INSTITUTION_SETUP_REQUIRED',
      });
    }

    const issuedAt = new Date();
    const credentialId = generateCredentialId();
    const verificationId = generateVerificationId();
    const verificationCode = generateVerificationCode();
    const institution = issuer.displayName ?? issuer.name;
    const signedVerificationToken = buildSignedVerificationToken({
      credentialId,
      verificationId,
      verificationCode,
      issuerId,
      issuedAt,
      secret: this.configService.jwtSecret,
    });
    const registryProofHash = buildRegistryProofHash({
      credentialId,
      verificationId,
      verificationCode,
      issuerId,
      issuedAt,
      signedVerificationToken,
    });
    const securePdfEnabled = false;
    const assetRecord = this.buildAssetRecord(
      {
        id: credentialId,
        verificationId,
        verificationCode,
        signedVerificationToken,
        studentName: input.studentName,
        studentId: input.studentId,
        degree: input.degree,
        issuedAt,
        securePdfEnabled,
        documentHash: null,
        revoked: false,
        revokedAt: null,
        revocationReason: null,
      },
      issuer,
    );
    const hash = buildCredentialHash({
      credentialId,
      verificationId,
      issuerId,
      institution,
      studentName: input.studentName,
      studentId: input.studentId,
      degree: input.degree,
      issuedAt,
    });
    let assetBundle: CredentialAssetBundle;

    try {
      assetBundle = await this.assetsService.generateAndPersist(assetRecord);
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error
          ? `Unable to generate credential assets: ${error.message}`
          : 'Unable to generate credential assets.',
      );
    }

    try {
      const created = await this.prisma.credential.create({
        data: {
          id: credentialId,
          verificationId,
          verificationCode,
          signedVerificationToken,
          credentialExternalId: credentialId,
          qrPayload: assetBundle.metadata.qrPayload,
          verificationMode: 'CORE_REGISTRY',
          securePdfEnabled: false,
          studentName: input.studentName,
          studentId: input.studentId,
          degree: input.degree,
          graduationYear: input.graduationYear,
          metadataUri: assetBundle.metadataUri,
          metadataJson:
            assetBundle.metadata as unknown as Prisma.InputJsonValue,
          qrCodeUri: assetBundle.qrCodeUri,
          certificateUri: assetBundle.certificateUri,
          verificationUrl: assetBundle.verificationUrl,
          hash,
          registryHash: registryProofHash,
          chainProofHash: registryProofHash,
          documentHash: null,
          fileName: assetBundle.fileName,
          mimeType: assetBundle.mimeType,
          fileSize: assetBundle.fileSize,
          anchorVersion: 'V2',
          chainStatus: 'PENDING',
          issuerWallet: issuer.wallet,
          issuerId,
          batchId: input.batchId,
          issuedAt,
        },
        include: {
          issuer: true,
        },
      });

      try {
        await this.blockchainQueueService.enqueueAnchor(created.id);
      } catch (error) {
        await this.blockchainQueueService.markQueueFailure(
          created.id,
          BLOCKCHAIN_OPERATION.anchor,
          error instanceof Error
            ? error.message
            : 'Unable to enqueue anchor job.',
        );
      }

      return this.findOneOrThrow(created.id);
    } catch (error) {
      await this.assetsService.deleteAssets(credentialId);
      throw error;
    }
  }

  private async refreshCredentialAssets(credential: CredentialWithIssuer) {
    const assetRecord = this.buildAssetRecord(credential, credential.issuer);
    const assetBundle =
      await this.assetsService.generateAndPersist(assetRecord);

    await this.prisma.credential.update({
      where: { id: credential.id },
      data: {
        metadataUri: assetBundle.metadataUri,
        metadataJson: assetBundle.metadata as unknown as Prisma.InputJsonValue,
        qrCodeUri: assetBundle.qrCodeUri,
        certificateUri: assetBundle.certificateUri,
        verificationUrl: assetBundle.verificationUrl,
        qrPayload: assetBundle.metadata.qrPayload,
        chainProofHash:
          credential.securePdfEnabled && assetBundle.documentHash
            ? assetBundle.documentHash
            : credential.chainProofHash,
        documentHash: assetBundle.documentHash,
        fileName: assetBundle.fileName,
        mimeType: assetBundle.mimeType,
        fileSize: assetBundle.fileSize,
      },
    });
  }

  private async refreshCredentialMetadata(credential: CredentialWithIssuer) {
    const assetRecord = this.buildAssetRecord(credential, credential.issuer);
    const assetBundle = await this.assetsService.updateMetadata(assetRecord);

    await this.prisma.credential.update({
      where: { id: credential.id },
      data: {
        metadataUri: assetBundle.metadataUri,
        metadataJson: assetBundle.metadata as unknown as Prisma.InputJsonValue,
        verificationUrl: assetBundle.verificationUrl,
      },
    });
  }

  private buildAssetRecord(
    credential: {
      id: string;
      verificationId: string;
      verificationCode: string;
      signedVerificationToken: string;
      studentName: string;
      studentId: string;
      degree: string;
      issuedAt: Date;
      securePdfEnabled: boolean;
      documentHash: string | null;
      revoked: boolean;
      revokedAt: Date | null;
      revocationReason: string | null;
    },
    issuer: Issuer,
  ): CredentialAssetRecord {
    return {
      id: credential.id,
      verificationId: credential.verificationId,
      verificationCode: credential.verificationCode,
      signedVerificationToken: credential.signedVerificationToken,
      studentName: credential.studentName,
      studentId: credential.studentId,
      degree: credential.degree,
      issuedAt: credential.issuedAt,
      securePdfEnabled: credential.securePdfEnabled,
      documentHash: credential.documentHash,
      revoked: credential.revoked,
      revokedAt: credential.revokedAt,
      revocationReason: credential.revocationReason,
      issuer: {
        id: issuer.id,
        name: issuer.name,
        displayName: issuer.displayName,
        domain: issuer.domain,
        logoUrl: issuer.logoUrl,
        websiteUrl: issuer.websiteUrl,
        status: issuer.status,
      },
    };
  }

  private buildBulkResponse(mode: BulkIssueMode, rows: BulkIssueRowResult[]) {
    const invalidRows = rows.filter((row) =>
      this.isInvalidRowStatus(row.status),
    ).length;
    const issuedRows = rows.filter((row) => row.status === 'ISSUED').length;
    const failedRows = rows.filter((row) => row.status === 'FAILED').length;
    const validRows = rows.filter((row) =>
      this.isValidRowStatus(row.status),
    ).length;

    return {
      mode,
      totalRows: rows.length,
      validRows,
      invalidRows,
      issuedRows,
      failedRows,
      rows,
    };
  }

  private isInvalidRowStatus(status: BulkIssueRowStatus) {
    return (
      status === 'INVALID' || status === 'DUPLICATE' || status === 'EXISTS'
    );
  }

  private isValidRowStatus(status: BulkIssueRowStatus) {
    return status === 'VALID' || status === 'ISSUED' || status === 'FAILED';
  }

  private buildRowKey(studentId: string, degree: string) {
    return `${this.normalizeForKey(studentId)}::${this.normalizeForKey(degree)}`;
  }

  private normalizeForKey(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private findDuplicateRowNumbers(
    rows: Array<{ rowNumber: number; studentId: string; degree: string }>,
  ) {
    const seen = new Set<string>();
    const duplicates = new Set<number>();

    for (const row of rows) {
      const studentId = row.studentId.trim();
      const degree = row.degree.trim();

      if (!studentId || !degree) {
        continue;
      }

      const key = this.buildRowKey(studentId, degree);
      if (seen.has(key)) {
        duplicates.add(row.rowNumber);
      } else {
        seen.add(key);
      }
    }

    return duplicates;
  }

  private async lookupExistingCredentialKeys(
    issuerId: string,
    rows: Array<{ studentId: string; degree: string; studentName: string }>,
  ) {
    const studentIds = Array.from(
      new Set(
        rows
          .map((row) => row.studentId.trim())
          .filter((studentId) => studentId.length > 0),
      ),
    );

    if (studentIds.length === 0) {
      return new Set<string>();
    }

    const existing = await this.prisma.credential.findMany({
      where: {
        issuerId,
        studentId: {
          in: studentIds,
        },
      },
      select: {
        studentId: true,
        degree: true,
      },
    });

    return new Set(
      existing.map((record) =>
        this.buildRowKey(record.studentId, record.degree),
      ),
    );
  }

  private getIssueErrorMessage(error: unknown) {
    if (error instanceof ConflictException) {
      return 'A duplicate record prevented issuance.';
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return 'A unique constraint prevented issuance.';
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unable to issue credential.';
  }

  private async syncDocumentHash(credential: CredentialWithIssuer) {
    let certificateBuffer: Buffer;

    try {
      certificateBuffer = await this.assetsService.readCertificate(
        credential.id,
      );
    } catch {
      const assetRecord = this.buildAssetRecord(credential, credential.issuer);
      const assetBundle =
        await this.assetsService.generateAndPersist(assetRecord);
      await this.prisma.credential.update({
        where: { id: credential.id },
        data: {
          metadataUri: assetBundle.metadataUri,
          metadataJson:
            assetBundle.metadata as unknown as Prisma.InputJsonValue,
          qrCodeUri: assetBundle.qrCodeUri,
          certificateUri: assetBundle.certificateUri,
          verificationUrl: assetBundle.verificationUrl,
          documentHash: assetBundle.documentHash,
          fileName: assetBundle.fileName,
          mimeType: assetBundle.mimeType,
          fileSize: assetBundle.fileSize,
        },
      });
      return;
    }

    await this.prisma.credential.update({
      where: { id: credential.id },
      data: {
        documentHash: hashBuffer(certificateBuffer),
        fileName:
          credential.fileName ?? `credential-${credential.verificationId}.pdf`,
        mimeType: credential.mimeType ?? 'application/pdf',
        fileSize: credential.fileSize ?? certificateBuffer.byteLength,
      },
    });
  }

  private buildVerificationActivityDescription(log: {
    ipAddress: string | null;
    matched: boolean;
    uploadedHash: string | null;
  }) {
    const origin = log.ipAddress ? ` from ${log.ipAddress}` : '';
    if (log.uploadedHash) {
      return `PDF integrity check${origin}. Hash ${log.uploadedHash.slice(0, 12)}...`;
    }

    return log.matched
      ? `Verification lookup${origin}.`
      : `Verification lookup without a matched credential${origin}.`;
  }

  private buildBlockchainActivityDescription(log: {
    operation: string;
    status: string;
    txHash: string | null;
    blockNumber: number | null;
    attempts: number;
    errorMessage: string | null;
  }) {
    const action =
      log.operation === BLOCKCHAIN_OPERATION.revoke
        ? 'Revocation'
        : 'Anchoring';
    const receipt = log.txHash
      ? ` Transaction ${log.txHash.slice(0, 12)}...`
      : '';
    const block = log.blockNumber ? ` Block ${log.blockNumber}.` : '';
    const error = log.errorMessage ? ` ${log.errorMessage}` : '';

    return `${action} ${log.status.toLowerCase()} after ${log.attempts} attempt(s).${receipt}${block}${error}`.trim();
  }

  private resolveMetadataDocument(
    credential: CredentialWithIssuer,
    urls: {
      verificationUrl: string;
      metadataUri: string;
      qrCodeUri: string;
      certificateUri: string | null;
    },
  ) {
    const rawMetadata = credential.metadataJson;
    if (
      rawMetadata &&
      typeof rawMetadata === 'object' &&
      !Array.isArray(rawMetadata)
    ) {
      const typedMetadata =
        rawMetadata as unknown as Partial<CredentialMetadataDocument>;
      if (typedMetadata.credentialId && typedMetadata.verificationId) {
        return {
          ...typedMetadata,
          verificationUrl:
            typedMetadata.verificationUrl?.trim() || urls.verificationUrl,
          metadataUri: typedMetadata.metadataUri?.trim() || urls.metadataUri,
          qrCodeUri: typedMetadata.qrCodeUri?.trim() || urls.qrCodeUri,
          certificateUri:
            typedMetadata.certificateUri?.trim() || urls.certificateUri,
        } as CredentialMetadataDocument;
      }
    }

    return this.assetsService.buildBundle(
      this.buildAssetRecord(credential, credential.issuer),
    ).metadata;
  }
}
