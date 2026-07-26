#!/usr/bin/env ts-node
/**
 * Backfill the W3C VC (`eddsa-jcs-2022`) Data Integrity proof for credentials
 * issued before the VC export existed.
 *
 * Credentials issued from now on are signed at issuance, so this is a one-shot
 * catch-up. Credentials whose signing key has since been REVOKED are skipped,
 * not re-signed: signing fresh material with a retired key would undo the whole
 * point of revoking it. Those credentials keep working through /proof with their
 * original Ed25519 signature; they simply have no VC export.
 *
 * Run from apps/api. Dry-run is the default — it writes nothing without
 * --apply, matching rekey-signing-secret.ts so the two runbooks cannot be
 * confused for one another:
 *
 *     npx ts-node -T scripts/backfill-vc-proof.ts
 *     npx ts-node -T scripts/backfill-vc-proof.ts --apply
 */
import { PrismaClient } from '@prisma/client';

import {
  decryptSecret,
  signEd25519,
  verifyEd25519,
} from '../src/common/signing/signing-crypto.util';
import { signatureToMultibase } from '../src/common/vc/multibase.util';
import { buildOpenBadgeCredential } from '../src/common/vc/vc-claims.util';
import {
  buildProofConfig,
  buildProofHashData,
} from '../src/common/vc/vc-proof.util';

import { loadScriptEnv } from './load-env';

loadScriptEnv();

const SECRET = process.env.SIGNING_KEY_ENCRYPTION_SECRET;
const APPLY = process.argv.includes('--apply');

const prisma = new PrismaClient();

async function main() {
  if (!SECRET) {
    throw new Error('SIGNING_KEY_ENCRYPTION_SECRET must be set.');
  }

  const credentials = await prisma.credential.findMany({
    where: { vcProofValue: null, signingKeyId: { not: null } },
    include: { issuer: true, signingKey: true },
    orderBy: { issuedAt: 'asc' },
  });

  if (credentials.length === 0) {
    console.log('Every signed credential already has a VC proof — nothing to do.');
    return;
  }

  const skipped: string[] = [];
  let written = 0;

  for (const credential of credentials) {
    const key = credential.signingKey;
    if (!key) {
      skipped.push(`${credential.credentialExternalId} (no signing key row)`);
      continue;
    }
    if (key.revokedAt) {
      skipped.push(
        `${credential.credentialExternalId} (key ${key.keyId} revoked ${key.revokedAt.toISOString()})`,
      );
      continue;
    }

    // Reuse the credential's own signing timestamp so re-running the script is
    // idempotent in meaning, not just in effect.
    const created = credential.signedAt ?? credential.issuedAt;
    const document = buildOpenBadgeCredential({
      credentialId: credential.credentialExternalId,
      issuerId: credential.issuerId,
      issuerDomain: credential.issuer.domain,
      issuerName: credential.issuer.displayName ?? credential.issuer.name,
      studentName: credential.studentName,
      studentId: credential.studentId,
      degree: credential.degree,
      graduationYear: credential.graduationYear,
      issuedAt: credential.issuedAt,
    });
    const hashData = buildProofHashData(
      document,
      buildProofConfig({
        issuerDomain: credential.issuer.domain,
        keyId: key.keyId,
        created,
      }),
    );

    const privateKey = decryptSecret(key.privateKeyEncrypted, SECRET);
    const signature = signEd25519(hashData, privateKey);

    // Verify before writing — a proof that does not check out is worse than
    // no proof at all, because a verifier would read it as tampering.
    if (!verifyEd25519(hashData, signature, key.publicKey)) {
      throw new Error(
        `Credential ${credential.credentialExternalId}: proof failed self-verification. Nothing further was written.`,
      );
    }

    if (APPLY) {
      await prisma.credential.update({
        where: { id: credential.id },
        data: {
          vcProofValue: signatureToMultibase(signature),
          vcProofCreated: created,
        },
      });
    }
    written += 1;
  }

  console.log(
    `${APPLY ? 'Signed' : '[dry-run] would sign'} ${written} credential(s).`,
  );
  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length} credential(s) with a revoked key:`);
    for (const line of skipped) console.log(`  - ${line}`);
    console.log(
      'These keep verifying through /proof; they get no VC export by design.',
    );
  }
  if (!APPLY) {
    console.log(
      '\nDry run only — nothing written. Re-run with --apply once the counts look right.',
    );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
