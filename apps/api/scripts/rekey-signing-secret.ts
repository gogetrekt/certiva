#!/usr/bin/env tsx
/**
 * rekey-signing-secret.ts
 *
 * Re-encrypts every stored Ed25519 private key from an old
 * SIGNING_KEY_ENCRYPTION_SECRET to a new one. The keypairs themselves are
 * untouched: public keys, keyIds, and every existing signature stay valid — only
 * the at-rest encryption wrapper changes.
 *
 * Without this, rotating the master secret (exactly what you must do when it
 * leaks) would leave every stored private key permanently undecryptable, and the
 * institution could never sign again.
 *
 * Run from apps/api. Dry-run first — it writes nothing without --apply:
 *
 *   SIGNING_KEY_ENCRYPTION_SECRET_OLD=<old> SIGNING_KEY_ENCRYPTION_SECRET=<new> \
 *     npx tsx scripts/rekey-signing-secret.ts
 *
 *   SIGNING_KEY_ENCRYPTION_SECRET_OLD=<old> SIGNING_KEY_ENCRYPTION_SECRET=<new> \
 *     npx tsx scripts/rekey-signing-secret.ts --apply
 *
 * Safe to re-run: rows already readable with the new secret are skipped, so a
 * run interrupted halfway can simply be repeated.
 */

import { PrismaClient } from '@prisma/client';

import {
  decryptSecret,
  encryptSecret,
  signEd25519,
  verifyEd25519,
} from '../src/common/signing/signing-crypto.util';

import { loadScriptEnv } from './load-env';

loadScriptEnv();

const APPLY = process.argv.includes('--apply');
const OLD_SECRET = process.env.SIGNING_KEY_ENCRYPTION_SECRET_OLD ?? '';
const NEW_SECRET = process.env.SIGNING_KEY_ENCRYPTION_SECRET ?? '';

const prisma = new PrismaClient();

/** Probe payload — proves the decrypted private key still matches its public key. */
const PROBE = 'certiva-rekey-probe';

type Plan = {
  id: string;
  keyId: string;
  reencrypted: string;
  alreadyMigrated: boolean;
};

function assertSecrets() {
  if (!OLD_SECRET || !NEW_SECRET) {
    throw new Error(
      'Both SIGNING_KEY_ENCRYPTION_SECRET_OLD and SIGNING_KEY_ENCRYPTION_SECRET must be set.',
    );
  }
  if (OLD_SECRET === NEW_SECRET) {
    throw new Error(
      'Old and new secret are identical — nothing to re-encrypt (check your env).',
    );
  }
  if (NEW_SECRET.length < 32) {
    throw new Error(
      'SIGNING_KEY_ENCRYPTION_SECRET must be at least 32 characters.',
    );
  }
}

/**
 * Decrypt with the old secret, re-encrypt with the new one, and verify the
 * round-trip before anything is written. Rows that already open with the new
 * secret are reported as already-migrated instead of failing.
 */
function planRow(row: {
  id: string;
  keyId: string;
  publicKey: string;
  privateKeyEncrypted: string;
}): Plan {
  let privateKey: string;
  try {
    privateKey = decryptSecret(row.privateKeyEncrypted, OLD_SECRET);
  } catch {
    try {
      decryptSecret(row.privateKeyEncrypted, NEW_SECRET);
      return {
        id: row.id,
        keyId: row.keyId,
        reencrypted: row.privateKeyEncrypted,
        alreadyMigrated: true,
      };
    } catch {
      throw new Error(
        `Key ${row.keyId} cannot be decrypted with either secret — wrong SIGNING_KEY_ENCRYPTION_SECRET_OLD, or the row is corrupt. Nothing was written.`,
      );
    }
  }

  // The decrypted private key must still belong to the stored public key,
  // otherwise we would be re-encrypting garbage.
  if (!verifyEd25519(PROBE, signEd25519(PROBE, privateKey), row.publicKey)) {
    throw new Error(
      `Key ${row.keyId} decrypted, but does not match its stored public key. Nothing was written.`,
    );
  }

  const reencrypted = encryptSecret(privateKey, NEW_SECRET);
  if (decryptSecret(reencrypted, NEW_SECRET) !== privateKey) {
    throw new Error(
      `Key ${row.keyId} failed the re-encryption round-trip. Nothing was written.`,
    );
  }

  return { id: row.id, keyId: row.keyId, reencrypted, alreadyMigrated: false };
}

async function main() {
  assertSecrets();

  const rows = await prisma.issuerSigningKey.findMany({
    select: {
      id: true,
      keyId: true,
      publicKey: true,
      privateKeyEncrypted: true,
      active: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (rows.length === 0) {
    console.log('No signing keys stored — nothing to do.');
    return;
  }

  // Plan every row before writing any: a partial re-encryption is far worse
  // than a failed run, so the whole batch is validated up front.
  const plans = rows.map(planRow);
  const pending = plans.filter((p) => !p.alreadyMigrated);
  const skipped = plans.length - pending.length;

  console.log(`Signing keys found:      ${plans.length}`);
  console.log(`Already using new secret: ${skipped}`);
  console.log(`To re-encrypt:            ${pending.length}`);
  for (const plan of pending) {
    console.log(`  - ${plan.keyId}`);
  }

  if (!APPLY) {
    console.log(
      '\nDry run only — nothing written. Re-run with --apply once the counts look right.',
    );
    return;
  }

  await prisma.$transaction(
    pending.map((plan) =>
      prisma.issuerSigningKey.update({
        where: { id: plan.id },
        data: { privateKeyEncrypted: plan.reencrypted },
      }),
    ),
  );

  console.log(
    `\nRe-encrypted ${pending.length} key(s). Deploy with SIGNING_KEY_ENCRYPTION_SECRET=<new> and drop the old value.`,
  );
  console.log(
    'Verify before deleting the DB backup: issue one credential and verify one existing credential.',
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
