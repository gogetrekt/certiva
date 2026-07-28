#!/usr/bin/env ts-node
/**
 * One-time migration: fix stale verificationUrl / qrPayload fields in the
 * database and delete stale QR PNG files so they are regenerated on next request.
 *
 * Dry-run is the default — it writes nothing and deletes nothing without
 * --apply, matching rekey-signing-secret.ts / backfill-vc-proof.ts /
 * migrate-assets-to-r2.ts so no two runbooks in this directory behave
 * differently. The destructive half here is the `unlink`, so a bare run that
 * silently wrote would be unrecoverable from the script alone.
 *
 * Run from apps/api:
 *   npx ts-node -T scripts/fix-verification-urls.ts
 *   npx ts-node -T scripts/fix-verification-urls.ts --apply
 */

import { PrismaClient } from '@prisma/client';
import { unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { loadScriptEnv } from './load-env';

loadScriptEnv();

const APPLY = process.argv.includes('--apply');
const WEB_BASE = (
  process.env.WEB_PUBLIC_BASE_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '');
const ASSET_ROOT = resolve(
  process.cwd(),
  process.env.ASSET_STORAGE_ROOT ?? 'storage',
);

const prisma = new PrismaClient();

async function main() {
  const credentials = await prisma.credential.findMany({
    select: {
      id: true,
      credentialExternalId: true,
      verificationUrl: true,
      qrPayload: true,
      signedVerificationToken: true,
    },
  });

  let fixed = 0;

  for (const cred of credentials) {
    const correctUrl = `${WEB_BASE}/verify/${encodeURIComponent(cred.credentialExternalId)}`;
    const correctQrPayload = `${correctUrl}?token=${encodeURIComponent(cred.signedVerificationToken)}`;

    const urlIsWrong =
      !cred.verificationUrl ||
      !cred.verificationUrl.includes(`/verify/${cred.credentialExternalId}`);

    if (!urlIsWrong) continue;

    console.log(`${APPLY ? 'Fixing' : '[dry-run] would fix'} ${cred.id}:`);
    console.log(`  old verificationUrl: ${cred.verificationUrl}`);
    console.log(`  new verificationUrl: ${correctUrl}`);

    const qrPath = join(
      ASSET_ROOT,
      'credentials',
      cred.id,
      'verification-qr.png',
    );

    if (APPLY) {
      await prisma.credential.update({
        where: { id: cred.id },
        data: {
          verificationUrl: correctUrl,
          qrPayload: correctQrPayload,
        },
      });

      // Delete stale QR PNG so it is regenerated on next /qr request
      try {
        await unlink(qrPath);
        console.log(`  deleted stale QR: ${qrPath}`);
      } catch {
        console.log(`  QR file not found (ok): ${qrPath}`);
      }
    } else {
      console.log(`  would delete stale QR: ${qrPath}`);
    }

    fixed++;
  }

  console.log(
    `\nDone. ${APPLY ? 'Fixed' : '[dry-run] would fix'} ${fixed} of ${credentials.length} credentials.`,
  );
  if (!APPLY) {
    console.log(
      'Dry run only — nothing written, no QR deleted. Re-run with --apply once the counts look right.',
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
