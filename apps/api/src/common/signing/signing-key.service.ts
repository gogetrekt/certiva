import { randomBytes } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { IssuerSigningKey } from '@prisma/client';

import {
  AuditLogService,
  type AuditContext,
} from '../../modules/audit/audit-log.service';
import {
  PublicCredentialPayload,
  buildPublicSignaturePayload,
} from '../../modules/credential/credential.utils';
import { PrismaService } from '../../prisma/prisma.service';
import { signatureToMultibase } from '../vc/multibase.util';
import { buildOpenBadgeCredential } from '../vc/vc-claims.util';
import {
  attachProof,
  buildProofConfig,
  buildProofHashData,
} from '../vc/vc-proof.util';
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
  /**
   * `eddsa-jcs-2022` proofValue for the W3C VC export, base58btc multibase.
   * A second signature rather than a reuse of `signature`: Data Integrity signs
   * SHA-256(proof config) || SHA-256(document), which is not the byte string
   * `publicPayload` covers.
   */
  vcProofValue: string;
  vcProofCreated: Date;
  /**
   * The secured VC — the exact document these bytes were signed over, with the
   * proof attached. Persisted as `Credential.vcDocument` and served verbatim:
   * rebuilding it at export time from a live `Issuer` row would break every old
   * VC as soon as an admin edits the institution's name or domain.
   */
  vcDocument: Record<string, unknown>;
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

    const created = await this.prisma.issuerSigningKey.create({
      data: await this.buildKeyData(issuerId),
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

  /**
   * Retire the issuer's active key(s) and generate a replacement. Retired keys
   * are marked (active=false, revokedAt) but never deleted: every credential
   * carries the FK of the key it was signed with, so credentials issued before a
   * rotation keep verifying against their original key. Rotation therefore only
   * changes which key signs *new* credentials.
   */
  async rotateActiveKey(
    issuerId: string,
    context: AuditContext,
  ): Promise<{ created: IssuerSigningKey; retiredKeyIds: string[] }> {
    // Generate outside the transaction: key generation and encryption touch no
    // DB state, and keeping crypto out of the tx keeps the row lock short.
    const data = await this.buildKeyData(issuerId);

    // Rotation and its audit entry commit together or not at all. A rotation
    // with no audit entry would be invisible to chain verification (a missing
    // entry keeps prevHash→entryHash contiguous), so for key actions the audit
    // write is fail-closed: if it throws, the rotation rolls back with it.
    const { created, retiredKeyIds } = await this.prisma.$transaction(
      async (tx) => {
        // FIRST statement, before any IssuerSigningKey row is touched. Every
        // audit writer must take the chain lock before data rows; acquiring them
        // in the opposite order here would deadlock against a concurrent audit
        // write. Do not "tidy" this below the queries.
        await this.auditLog.lockChain(tx);

        const current = await tx.issuerSigningKey.findMany({
          where: { issuerId, active: true, revokedAt: null },
          select: { keyId: true },
        });
        await tx.issuerSigningKey.updateMany({
          where: { issuerId, active: true, revokedAt: null },
          data: { active: false, revokedAt: new Date() },
        });
        const createdKey = await tx.issuerSigningKey.create({ data });
        const retired = current.map((key) => key.keyId);

        await this.auditLog.log(
          {
            action: 'SIGNING_KEY_ROTATED',
            targetType: 'IssuerSigningKey',
            targetId: createdKey.keyId,
            metadata: {
              issuerId,
              algorithm: createdKey.algorithm,
              retiredKeyIds: retired,
            },
            context,
          },
          tx,
        );

        return { created: createdKey, retiredKeyIds: retired };
      },
    );

    this.logger.log(
      `Rotated signing key for issuer ${issuerId}: retired [${retiredKeyIds.join(', ')}], now signing with ${created.keyId}`,
    );

    return { created, retiredKeyIds };
  }

  /**
   * Public key history for an issuer. Private key material is never selected —
   * this feeds the admin "institution verification keys" view and the public
   * key endpoint verifiers use to check signatures independently.
   */
  listPublicKeys(issuerId: string) {
    return this.prisma.issuerSigningKey.findMany({
      where: { issuerId },
      orderBy: { createdAt: 'desc' },
      select: {
        keyId: true,
        publicKey: true,
        algorithm: true,
        active: true,
        createdAt: true,
        revokedAt: true,
        _count: { select: { credentials: true } },
      },
    });
  }

  /** Fresh keypair row data (private key already encrypted by the provider). */
  private async buildKeyData(issuerId: string) {
    const { publicKey, privateKeyStored } =
      await this.provider.generateKeyPair();
    return {
      issuerId,
      keyId: `sk_${randomBytes(9).toString('hex')}`,
      publicKey,
      privateKeyEncrypted: privateKeyStored,
      algorithm: this.provider.algorithm,
      active: true,
    };
  }

  /**
   * Build and sign the public payload for a credential using the issuer's active
   * key, plus the W3C VC Data Integrity proof over the same facts. Both come out
   * of one key lookup, and the VC proof is produced at issuance rather than on
   * export so the public export endpoint never decrypts a private key and never
   * has to sign with a key that has since been revoked.
   */
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

    // One timestamp for one signing event: signedAt and the VC proof's `created`
    // describe the same act, so they must not drift by however long the second
    // signature takes.
    const signedAt = new Date();
    const document = buildOpenBadgeCredential({
      credentialId: input.credentialId,
      issuerId: input.issuerId,
      issuerDomain: input.issuerDomain,
      issuerName: input.issuerName,
      studentName: input.studentName,
      studentId: input.studentId,
      degree: input.degree,
      graduationYear: input.graduationYear,
      issuedAt: input.issuedAt,
    });
    const proofConfig = buildProofConfig({
      issuerDomain: input.issuerDomain,
      keyId: key.keyId,
      created: signedAt,
    });
    const vcProofValue = signatureToMultibase(
      await this.provider.sign(
        buildProofHashData(document, proofConfig),
        key.privateKeyEncrypted,
      ),
    );

    return {
      signature,
      publicPayload,
      signingKeyDbId: key.id,
      signingKeyId: key.keyId,
      signedAt,
      vcProofValue,
      vcProofCreated: signedAt,
      vcDocument: attachProof(document, proofConfig, vcProofValue),
    };
  }
}
