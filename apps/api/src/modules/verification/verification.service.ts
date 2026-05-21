import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IssuerStatus,
  Prisma,
  VerificationEventType,
  type Credential,
  type Issuer,
} from '@prisma/client';

import { hashBuffer } from '../../common/utils/hash.util';
import { PdfReferenceService } from '../../common/services/pdf-reference.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { BLOCKCHAIN_PROOF_STATUS } from '../blockchain/blockchain.constants';
import { CredentialAssetsService } from '../credential/credential-assets.service';
import { VerifyCredentialDto } from './dto/verify-credential.dto';

type VerificationStatus =
  | 'VALID'
  | 'INVALID'
  | 'REVOKED'
  | 'NOT_FOUND'
  | 'TAMPERED'
  | 'INTEGRITY_VERIFIED'
  | 'DOCUMENT_MODIFIED'
  | 'NO_SECURE_PDF_RECORD';

interface UploadedPdfFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

type CredentialWithIssuer = Credential & {
  issuer: Issuer;
};

type VerificationCredentialRecord = Prisma.CredentialGetPayload<{
  include: {
    issuer: true;
  };
}>;

function resolveIssuerLabel(credential: VerificationCredentialRecord) {
  return credential.issuer.displayName ?? credential.issuer.name;
}

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetsService: CredentialAssetsService,
    private readonly blockchainService: BlockchainService,
    private readonly pdfReferenceService: PdfReferenceService,
  ) {}

  async verify(dto: VerifyCredentialDto, ipAddress: string) {
    if (!dto.credentialId && !dto.hash) {
      throw new BadRequestException(
        'Provide credentialId or hash for verification',
      );
    }

    const createdAt = new Date();
    const credential = await this.prisma.credential.findFirst({
      where: {
        id: dto.credentialId ?? undefined,
        OR: dto.hash
          ? [{ hash: dto.hash }, { documentHash: dto.hash }]
          : undefined,
        issuer: dto.issuerDomain
          ? {
              domain: dto.issuerDomain,
            }
          : undefined,
      },
      include: { issuer: true },
    });

    const verification =
      credential && (await this.blockchainService.verifyCredential(credential));
    const status = credential
      ? this.resolveStatus(credential, verification ?? null)
      : 'NOT_FOUND';

    await this.recordVerification({
      credentialId: credential?.id ?? null,
      createdAt,
      ipAddress,
      matched: Boolean(credential),
      status,
      uploadedHash: dto.hash?.trim().toLowerCase() || null,
      eventType: VerificationEventType.REGISTRY_CODE_LOOKUP,
    });

    return {
      result: status,
      verifiedAtTimestamp: createdAt,
      blockchainVerified: verification?.blockchainVerified ?? false,
      blockchainStatus:
        verification?.blockchainStatus ?? BLOCKCHAIN_PROOF_STATUS.unavailable,
      txHash: verification?.txHash ?? credential?.txHash ?? null,
      blockNumber: verification?.blockNumber ?? credential?.blockNumber ?? null,
      anchoredAt: verification?.anchoredAt ?? credential?.anchoredAt ?? null,
      trustChecks: this.buildTrustChecks(credential, verification ?? null),
      credential: credential
        ? {
            id: credential.id,
            verificationId: credential.verificationId,
            verificationCode: credential.verificationCode,
            verificationMode: credential.verificationMode,
            securePdfEnabled: credential.securePdfEnabled,
            studentName: credential.studentName,
            studentId: credential.studentId,
            degree: credential.degree,
            issuerId: credential.issuerId,
            revoked: credential.revoked,
          }
        : null,
    };
  }

  async verifyByVerificationId(verificationId: string, ipAddress: string) {
    return this.resolveCredentialReference(
      verificationId,
      ipAddress,
      VerificationEventType.QR_LOOKUP,
    );
  }

  async verifyCredentialCode(reference: string, ipAddress: string) {
    return this.resolveCredentialReference(
      reference,
      ipAddress,
      VerificationEventType.REGISTRY_CODE_LOOKUP,
    );
  }

  private async resolveCredentialReference(
    verificationId: string,
    ipAddress: string,
    eventType: VerificationEventType,
  ) {
    const createdAt = new Date();
    const credential = await this.prisma.credential.findFirst({
      where: {
        OR: [{ verificationId }, { verificationCode: verificationId }],
      },
      include: {
        issuer: true,
      },
    });

    if (!credential) {
      await this.recordVerification({
        credentialId: null,
        createdAt,
        ipAddress,
        matched: false,
        status: 'NOT_FOUND',
        uploadedHash: null,
        eventType,
      });

      return {
        verificationId,
        verificationCode: null,
        verificationMode: null,
        securePdfEnabled: false,
        valid: false,
        result: 'NOT_FOUND' as const,
        revoked: false,
        revocationReason: null,
        metadataUri: null,
        qrCodeUri: null,
        certificateUri: null,
        verificationUrl: null,
        verificationCount: 0,
        verifiedAt: null,
        issuer: null,
        degree: null,
        issuedAt: null,
        revokedAt: null,
        blockchainVerified: false,
        blockchainStatus: BLOCKCHAIN_PROOF_STATUS.notAnchored,
        txHash: null,
        blockNumber: null,
        anchoredAt: null,
        trustChecks: this.buildTrustChecks(null, null),
        verifiedAtTimestamp: createdAt,
        credential: null,
      };
    }

    const blockchainVerification =
      await this.blockchainService.verifyCredential(credential);
    const status = this.resolveStatus(credential, blockchainVerification);
    const updatedCredential = await this.recordVerification({
      credentialId: credential.id,
      createdAt,
      ipAddress,
      matched: true,
      status,
      uploadedHash: null,
      eventType,
    });

    const currentCredential: VerificationCredentialRecord =
      updatedCredential ?? credential;
    const verificationUrl = this.assetsService.resolveVerificationUrl(
      currentCredential.verificationId,
      currentCredential.verificationUrl,
    );
    const metadataUri = this.assetsService.resolveMetadataUri(
      currentCredential.id,
      currentCredential.metadataUri,
    );
    const qrCodeUri = this.assetsService.resolveQrCodeUri(
      currentCredential.id,
      currentCredential.qrCodeUri,
    );
    const certificateUri = this.assetsService.resolveCertificateUri(
      currentCredential.verificationId,
      currentCredential.certificateUri,
    );

    return {
      verificationId: currentCredential.verificationId,
      verificationCode: currentCredential.verificationCode,
      verificationMode: currentCredential.verificationMode,
      securePdfEnabled: currentCredential.securePdfEnabled,
      valid: status === 'VALID',
      result: status,
      revoked: currentCredential.revoked,
      revocationReason: currentCredential.revocationReason,
      metadataUri,
      qrCodeUri,
      certificateUri,
      verificationUrl,
      verificationCount: currentCredential.verificationCount,
      verifiedAt: currentCredential.verifiedAt,
      issuer: this.buildIssuerResponse(currentCredential),
      degree: currentCredential.degree,
      issuedAt: currentCredential.issuedAt,
      revokedAt: currentCredential.revokedAt,
      blockchainVerified: blockchainVerification.blockchainVerified,
      blockchainStatus: blockchainVerification.blockchainStatus,
      txHash: blockchainVerification.txHash ?? currentCredential.txHash ?? null,
      blockNumber:
        blockchainVerification.blockNumber ??
        currentCredential.blockNumber ??
        null,
      anchoredAt:
        blockchainVerification.anchoredAt ??
        currentCredential.anchoredAt ??
        null,
      trustChecks: this.buildTrustChecks(
        currentCredential,
        blockchainVerification,
      ),
      verifiedAtTimestamp: createdAt,
      credential: {
        id: currentCredential.id,
        studentName: currentCredential.studentName,
        studentId: currentCredential.studentId,
        hash: currentCredential.hash,
        documentHash: currentCredential.documentHash,
      },
    };
  }

  async verifyCredentialPdf(file: UploadedPdfFile, ipAddress: string) {
    await this.pdfReferenceService.prepareUploadedPdf(file);

    const reference =
      await this.pdfReferenceService.extractReferenceFromPdfBuffer(
        file.buffer,
        'credential',
      );
    if (!reference) {
      const createdAt = new Date();
      await this.recordVerification({
        credentialId: null,
        createdAt,
        ipAddress,
        matched: false,
        status: 'NOT_FOUND',
        uploadedHash: null,
        eventType: VerificationEventType.QR_LOOKUP,
      });

      return {
        ...(await this.buildNotFoundResponse('', createdAt)),
        resolvedReference: null,
        referenceSource: 'QR' as const,
      };
    }

    const result = await this.resolveCredentialReference(
      reference,
      ipAddress,
      VerificationEventType.QR_LOOKUP,
    );

    return {
      ...result,
      resolvedReference: reference,
      referenceSource: 'QR' as const,
    };
  }

  async verifySecurePdf(file: UploadedPdfFile, ipAddress: string) {
    await this.pdfReferenceService.prepareUploadedPdf(file);

    const uploadedHash = hashBuffer(file.buffer);
    const createdAt = new Date();
    const reference =
      await this.pdfReferenceService.extractReferenceFromPdfBuffer(
        file.buffer,
        'credential',
      );
    const credential = reference
      ? await this.prisma.credential.findFirst({
          where: {
            OR: [
              { verificationId: reference },
              { verificationCode: reference },
              { signedVerificationToken: reference },
            ],
          },
          include: {
            issuer: true,
            documentProofs: {
              where: { status: 'ACTIVE' },
              orderBy: { registeredAt: 'desc' },
              take: 1,
            },
          },
        })
      : null;

    if (!credential) {
      await this.recordVerification({
        credentialId: null,
        createdAt,
        ipAddress,
        matched: false,
        status: 'NOT_FOUND',
        uploadedHash,
        eventType: VerificationEventType.PDF_INTEGRITY_CHECK,
      });

      return {
        status: 'NOT_FOUND' as const,
        blockchainVerified: false,
        blockchainStatus: BLOCKCHAIN_PROOF_STATUS.notAnchored,
        txHash: null,
        blockNumber: null,
        anchoredAt: null,
        trustChecks: this.buildTrustChecks(null, null),
        integrityMatched: false,
        resolvedReference: reference,
        referenceSource: reference ? ('QR' as const) : null,
      };
    }

    const resolvedReference = reference ?? credential.verificationId;
    const blockchainVerification =
      await this.blockchainService.verifyCredential(credential);
    const activeProof = credential.documentProofs[0] ?? null;

    if (credential.revoked || blockchainVerification.proof?.revoked) {
      const updatedCredential = await this.recordVerification({
        credentialId: credential.id,
        createdAt,
        ipAddress,
        matched: false,
        status: 'REVOKED',
        uploadedHash,
        eventType: VerificationEventType.PDF_INTEGRITY_CHECK,
      });

      return this.buildSecurePdfResponse({
        credential: updatedCredential ?? credential,
        blockchainVerification,
        createdAt,
        uploadedHash,
        registeredHash: activeProof?.hash ?? null,
        integrityMatched: false,
        status: 'REVOKED',
        reference: resolvedReference,
      });
    }

    if (!activeProof) {
      await this.recordVerification({
        credentialId: credential.id,
        createdAt,
        ipAddress,
        matched: false,
        status: 'NO_SECURE_PDF_RECORD',
        uploadedHash,
        eventType: VerificationEventType.PDF_INTEGRITY_CHECK,
      });

      return this.buildSecurePdfResponse({
        credential,
        blockchainVerification,
        createdAt,
        uploadedHash,
        registeredHash: null,
        integrityMatched: false,
        status: 'NO_SECURE_PDF_RECORD',
        reference: resolvedReference,
      });
    }

    if (activeProof.hash !== uploadedHash) {
      const updatedCredential = await this.recordVerification({
        credentialId: credential.id,
        createdAt,
        ipAddress,
        matched: false,
        status: 'DOCUMENT_MODIFIED',
        uploadedHash,
        eventType: VerificationEventType.PDF_INTEGRITY_CHECK,
      });

      return this.buildSecurePdfResponse({
        credential: updatedCredential ?? credential,
        blockchainVerification,
        createdAt,
        uploadedHash,
        registeredHash: activeProof.hash,
        integrityMatched: false,
        status: 'DOCUMENT_MODIFIED',
        reference: resolvedReference,
      });
    }

    const updatedCredential = await this.recordVerification({
      credentialId: credential.id,
      createdAt,
      ipAddress,
      matched: true,
      status: 'INTEGRITY_VERIFIED',
      uploadedHash,
      eventType: VerificationEventType.PDF_INTEGRITY_CHECK,
    });

    return this.buildSecurePdfResponse({
      credential: updatedCredential ?? credential,
      blockchainVerification,
      createdAt,
      uploadedHash,
      registeredHash: activeProof.hash,
      integrityMatched: true,
      status: 'INTEGRITY_VERIFIED',
      reference: resolvedReference,
    });
  }

  async verifyUploadedPdf(file: UploadedPdfFile, ipAddress: string) {
    return this.verifySecurePdf(file, ipAddress);
  }

  async getCertificateByVerificationId(verificationId: string) {
    const credential = await this.prisma.credential.findUnique({
      where: { verificationId },
      select: { id: true },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    return credential;
  }

  private async buildNotFoundResponse(reference: string, createdAt: Date) {
    return {
      verificationId: reference,
      verificationCode: null,
      verificationMode: null,
      securePdfEnabled: false,
      valid: false,
      result: 'NOT_FOUND' as const,
      revoked: false,
      revocationReason: null,
      metadataUri: null,
      qrCodeUri: null,
      certificateUri: null,
      verificationUrl: null,
      verificationCount: 0,
      verifiedAt: null,
      issuer: null,
      degree: null,
      issuedAt: null,
      revokedAt: null,
      blockchainVerified: false,
      blockchainStatus: BLOCKCHAIN_PROOF_STATUS.notAnchored,
      txHash: null,
      blockNumber: null,
      anchoredAt: null,
      trustChecks: this.buildTrustChecks(null, null),
      verifiedAtTimestamp: createdAt,
      credential: null,
    };
  }

  private buildSecurePdfResponse(input: {
    credential: VerificationCredentialRecord;
    blockchainVerification: Awaited<
      ReturnType<BlockchainService['verifyCredential']>
    >;
    createdAt: Date;
    uploadedHash: string;
    registeredHash: string | null;
    integrityMatched: boolean;
    status:
      | 'INTEGRITY_VERIFIED'
      | 'DOCUMENT_MODIFIED'
      | 'NO_SECURE_PDF_RECORD'
      | 'REVOKED';
    reference: string;
  }) {
    return {
      status: input.status,
      credentialId: input.credential.id,
      verificationId: input.credential.verificationId,
      verificationCode: input.credential.verificationCode,
      resolvedReference: input.reference,
      referenceSource: 'QR' as const,
      studentName: input.credential.studentName,
      institution: resolveIssuerLabel(input.credential),
      degree: input.credential.degree,
      issuedAt: input.credential.issuedAt,
      verificationTimestamp: input.createdAt,
      verificationCount: input.credential.verificationCount,
      blockchainVerified: input.blockchainVerification.blockchainVerified,
      blockchainStatus: input.blockchainVerification.blockchainStatus,
      txHash:
        input.blockchainVerification.txHash ?? input.credential.txHash ?? null,
      blockNumber:
        input.blockchainVerification.blockNumber ??
        input.credential.blockNumber ??
        null,
      anchoredAt:
        input.blockchainVerification.anchoredAt ??
        input.credential.anchoredAt ??
        null,
      documentHash: input.registeredHash,
      uploadedHash: input.uploadedHash,
      integrityMatched: input.integrityMatched,
      trustChecks: this.buildTrustChecks(
        input.credential,
        input.blockchainVerification,
      ),
    };
  }

  private resolveStatus(
    credential: CredentialWithIssuer,
    blockchainVerification: Awaited<
      ReturnType<BlockchainService['verifyCredential']>
    > | null,
  ): VerificationStatus {
    if (credential.issuer.status !== IssuerStatus.ACTIVE) {
      return 'INVALID';
    }

    if (
      blockchainVerification?.blockchainStatus ===
      BLOCKCHAIN_PROOF_STATUS.mismatch
    ) {
      return 'TAMPERED';
    }

    if (blockchainVerification?.proof?.revoked || credential.revoked) {
      return 'REVOKED';
    }

    return 'VALID';
  }

  private buildTrustChecks(
    credential: VerificationCredentialRecord | CredentialWithIssuer | null,
    blockchainVerification: Awaited<
      ReturnType<BlockchainService['verifyCredential']>
    > | null,
  ) {
    const issuerAuthorized =
      blockchainVerification?.proof?.issuerAuthorized ??
      blockchainVerification?.blockchainStatus ===
        BLOCKCHAIN_PROOF_STATUS.archivedV1;
    const anchored =
      blockchainVerification?.blockchainVerified ||
      blockchainVerification?.blockchainStatus ===
        BLOCKCHAIN_PROOF_STATUS.archivedV1;
    const active =
      Boolean(credential) &&
      !credential?.revoked &&
      !blockchainVerification?.proof?.revoked;

    return [
      {
        key: 'integrity',
        label: 'Credential Integrity Verified',
        ok:
          blockchainVerification?.blockchainStatus !==
            BLOCKCHAIN_PROOF_STATUS.mismatch && Boolean(credential),
      },
      {
        key: 'issuer',
        label: 'Official Issuer Confirmed',
        ok: Boolean(issuerAuthorized),
      },
      {
        key: 'chain',
        label: 'Blockchain Proof Verified',
        ok: Boolean(anchored),
      },
      {
        key: 'active',
        label: active ? 'Credential Active' : 'Credential Revoked',
        ok: active,
      },
    ];
  }

  private async recordVerification(input: {
    credentialId: string | null;
    createdAt: Date;
    ipAddress: string;
    matched: boolean;
    status: VerificationStatus;
    uploadedHash: string | null;
    eventType: VerificationEventType;
  }): Promise<VerificationCredentialRecord | null> {
    if (!input.credentialId) {
      await this.prisma.verificationLog.create({
        data: {
          credentialId: null,
          eventType: input.eventType,
          uploadedHash: input.uploadedHash,
          matched: input.matched,
          status: input.status,
          ipAddress: input.ipAddress,
          createdAt: input.createdAt,
        },
      });

      return null;
    }

    const createVerificationLog = this.prisma.verificationLog.create({
      data: {
        credentialId: input.credentialId,
        eventType: input.eventType,
        uploadedHash: input.uploadedHash,
        matched: input.matched,
        status: input.status,
        ipAddress: input.ipAddress,
        createdAt: input.createdAt,
      },
    });
    const updateCredential = this.prisma.credential.update({
      where: {
        id: input.credentialId,
      },
      data: {
        verificationCount: {
          increment: 1,
        },
        verifiedAt: input.createdAt,
      },
      include: {
        issuer: true,
      },
    });

    const [, credential] = await this.prisma.$transaction([
      createVerificationLog,
      updateCredential,
    ]);

    return credential;
  }

  private buildIssuerResponse(credential: VerificationCredentialRecord) {
    return {
      id: credential.issuer.id,
      name: credential.issuer.name,
      displayName: credential.issuer.displayName,
      domain: credential.issuer.domain,
      logoUrl: credential.issuer.logoUrl,
      websiteUrl: credential.issuer.websiteUrl,
      status: credential.issuer.status,
    };
  }
}
