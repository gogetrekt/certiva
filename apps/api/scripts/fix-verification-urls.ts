/**
 * One-time migration: fix stale verificationUrl / qrPayload fields in the
 * database and delete stale QR PNG files so they are regenerated on next request.
 *
 * Run from apps/api:
 *   npx ts-node --project tsconfig.json -e "require('./scripts/fix-verification-urls')"
 * or
 *   npx tsx scripts/fix-verification-urls.ts
 */

import { PrismaClient } from "@prisma/client";
import { unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import * as dotenv from "dotenv";

dotenv.config();

const WEB_BASE = (process.env.WEB_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const ASSET_ROOT = resolve(process.cwd(), process.env.ASSET_STORAGE_ROOT ?? "storage");

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

    console.log(`Fixing ${cred.id}:`);
    console.log(`  old verificationUrl: ${cred.verificationUrl}`);
    console.log(`  new verificationUrl: ${correctUrl}`);

    await prisma.credential.update({
      where: { id: cred.id },
      data: {
        verificationUrl: correctUrl,
        qrPayload: correctQrPayload,
      },
    });

    // Delete stale QR PNG so it is regenerated on next /qr request
    const qrPath = join(ASSET_ROOT, "credentials", cred.id, "verification-qr.png");
    try {
      await unlink(qrPath);
      console.log(`  deleted stale QR: ${qrPath}`);
    } catch {
      console.log(`  QR file not found (ok): ${qrPath}`);
    }

    fixed++;
  }

  console.log(`\nDone. Fixed ${fixed} of ${credentials.length} credentials.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
