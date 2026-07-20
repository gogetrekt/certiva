import { randomBytes } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { IssuerSigningKey } from '@prisma/client';

import { AuditLogService } from '../../modules/audit/audit-log.service';
import {
  PublicCredentialPayload,
  buildPublicSignaturePayload,
} from '../../modules/credential/credential.utils';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SIGNING_KEY_PROVIDER,
  SigningKeyProvider,
} from './signing-key.provider';

export interface CredentialSignature {
  signature: string;
  publicPayload: string;
  /** IssuerSigningKey.id (cuid) — persisted as Credential.signingKeyId FK. */
  signingKeyDbId: string;
  /** IssuerSigningKey.keyId (public short id) — embedded in the signed payload. */
  signingKeyId: string;
  signedAt: Date;
}

/**
 * Owns issuer Ed25519 signing keys: lazy-generates one on first use, signs
 * credential payloads with the active key. The raw private key never leaves the
 * provider — this service only ever holds the encrypted/opaque stored material.
 */
@Injectable()
export class SigningKeyService {
  private readonly logger = new Logger(SigningKeyService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SIGNING_KEY_PROVIDER)
    private readonly provider: SigningKeyProvider,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Return the issuer's active signing key, generating one lazily on first use.
   * No manual setup step is ever required from an institution.
   */
  async getOrCreateActiveKey(issuerId: string): Promise<IssuerSigningKey> {
    const existing = await this.prisma.issuerSigningKey.findFirst({
      where: { issuerId, active: true, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return existing;
    }

    // ponytail: findFirst→create isn't atomic — two concurrent first-issuances
    // for the same issuer could each create an active key. Benign: both keys are
    // valid and every credential embeds the exact signingKeyId it was signed
    // with, so verification is unaffected. Add a per-issuer advisory lock (like
    // the audit chain) only if the "one active key" invariant must be strict.

    const { publicKey, privateKeyStored } =
      await this.provider.generateKeyPair();
    const created = await this.prisma.issuerSigningKey.create({
      data: {
        issuerId,
        keyId: `sk_${randomBytes(9).toString('hex')}`,
        publicKey,
        privateKeyEncrypted: privateKeyStored,
        algorithm: this.provider.algorithm,
        active: true,
      },
    });

    // Key creation is a high-impact event; record it (no admin actor — system
    // initiated during issuance). Never log the private key material.
    await this.auditLog.log({
      action: 'SIGNING_KEY_GENERATED',
      targetType: 'IssuerSigningKey',
      targetId: created.keyId,
      metadata: { issuerId, algorithm: created.algorithm },
      context: {},
    });
    this.logger.log(
      `Generated ${created.algorithm} signing key ${created.keyId} for issuer ${issuerId}`,
    );
    return created;
  }

  /** Build and sign the public payload for a credential using the issuer's active key. */
  async signCredential(
    input: Omit<PublicCredentialPayload, 'signingKeyId'> & { issuerId: string },
  ): Promise<CredentialSignature> {
    const key = await this.getOrCreateActiveKey(input.issuerId);
    const publicPayload = buildPublicSignaturePayload({
      credentialId: input.credentialId,
      verificationId: input.verificationId,
      issuerDomain: input.issuerDomain,
      issuerName: input.issuerName,
      studentName: input.studentName,
      studentId: input.studentId,
      degree: input.degree,
      graduationYear: input.graduationYear,
      issuedAt: input.issuedAt,
      signingKeyId: key.keyId,
    });
    const signature = await this.provider.sign(
      publicPayload,
      key.privateKeyEncrypted,
    );
    return {
      signature,
      publicPayload,
      signingKeyDbId: key.id,
      signingKeyId: key.keyId,
      signedAt: new Date(),
    };
  }
}
