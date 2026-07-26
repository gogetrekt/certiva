#!/usr/bin/env ts-node
/**
 * Backfill `Credential.vcDocument` — the secured VC snapshot — for credentials
 * that already carry a `vcProofValue` from before the snapshot column existed.
 *
 * Those credentials' documents used to be rebuilt from the live `Issuer` row on
 * every export, so this script has to rebuild them the same way once more and
 * then check its work: if the rebuilt document still verifies against the stored
 * proof, the issuer has not drifted and the snapshot is captured as-is. If it
 * does NOT verify, the institution's name or domain changed at some point and
 * that credential's VC has been failing external verification ever since — it is
 * re-signed over the current document, which is the only way back to a valid VC.
 *
 * Credentials whose signing key has been REVOKED are never re-signed, only
 * skipped and reported: signing fresh material with a retired key would undo the
 * point of revoking it. They keep working through /proof.
 *
 * Run from apps/api. Dry-run is the default — it writes nothing without
 * --apply, matching rekey-signing-secret.ts and backfill-vc-proof.ts:
 *
 *     npx ts-node -T scripts/backfill-vc-document.ts
 *     npx ts-node -T scripts/backfill-vc-document.ts --apply
 */
import { PrismaClient, Prisma } from '@prisma/client';

import {
  decryptSecret,
  signEd25519,
  verifyEd25519,
} from '../src/common/signing/signing-crypto.util';
import {
  multibaseToSignatureBase64,
  signatureToMultibase,
} from '../src/common/vc/multibase.util';
import { buildOpenBadgeCredential } from '../src/common/vc/vc-claims.util';
import {
  attachProof,
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
    where: {
      // Prisma rejects a bare `null` on a Json column — DbNull is "no value in
      // the column", which is what every pre-migration row has.
      vcDocument: { equals: Prisma.DbNull },
      vcProofValue: { not: null },
      vcProofCreated: { not: null },
    },
    include: { issuer: true, signingKey: true },
    orderBy: { issuedAt: 'asc' },
  });

  if (credentials.length === 0) {
    console.log('Every credential with a VC proof already has a snapshot.');
    return;
  }

  const skipped: string[] = [];
  const resigned: string[] = [];
  let captured = 0;

  for (const credential of credentials) {
    const key = credential.signingKey;
    const created = credential.vcProofCreated;
    if (!key || !created || !credential.vcProofValue) {
      skipped.push(`${credential.credentialExternalId} (incomplete proof row)`);
      continue;
    }

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
    const proofConfig = buildProofConfig({
      issuerDomain: credential.issuer.domain,
      keyId: key.keyId,
      created,
    });
    const hashData = buildProofHashData(document, proofConfig);

    let proofValue = credential.vcProofValue;
    const stillValid = verifyEd25519(
      hashData,
      multibaseToSignatureBase64(proofValue),
      key.publicKey,
    );

    if (!stillValid) {
      // The document this credential was signed over no longer exists anywhere:
      // only the live issuer values do, and they disagree with the signature.
      if (key.revokedAt) {
        skipped.push(
          `${credential.credentialExternalId} (issuer data changed since signing, key ${key.keyId} revoked ${key.revokedAt.toISOString()} — cannot re-sign)`,
        );
        continue;
      }
      const signature = signEd25519(
        hashData,
        decryptSecret(key.privateKeyEncrypted, SECRET),
      );
      // A proof that does not check out is worse than no proof: a verifier reads
      // it as tampering.
      if (!verifyEd25519(hashData, signature, key.publicKey)) {
        throw new Error(
          `Credential ${credential.credentialExternalId}: re-signed proof failed self-verification. Nothing further was written.`,
        );
      }
      proofValue = signatureToMultibase(signature);
      resigned.push(`${credential.credentialExternalId} (key ${key.keyId})`);
    }

    if (APPLY) {
      await prisma.credential.update({
        where: { id: credential.id },
        data: {
          vcProofValue: proofValue,
          vcDocument: attachProof(
            document,
            proofConfig,
            proofValue,
          ) as unknown as Prisma.InputJsonValue,
        },
      });
    }
    captured += 1;
  }

  console.log(
    `${APPLY ? 'Captured' : '[dry-run] would capture'} ${captured} snapshot(s).`,
  );
  if (resigned.length > 0) {
    console.log(
      `Re-signed ${resigned.length} credential(s) whose issuer data had changed since issuance (their VC was already failing verification):`,
    );
    for (const line of resigned) console.log(`  - ${line}`);
  }
  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length} credential(s):`);
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
