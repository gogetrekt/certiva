/**
 * One-time migration: fix stale verificationUrl / qrPayload in DB
 * and delete stale QR PNGs.
 *
 * Run: node scripts/fix-verification-urls.mjs
 */
import { PrismaClient } from "@prisma/client";
import { unlink } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envPath = resolve(__dirname, "../.env");
try {
  const envText = readFileSync(envPath, "utf8");
  for (const line of envText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {}

const WEB_BASE = (process.env.WEB_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const ASSET_ROOT = resolve(__dirname, "..", process.env.ASSET_STORAGE_ROOT ?? "storage");

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
    const correctUrl = `${WEB_BASE}/verify/${cred.credentialExternalId}`;
    const correctQrPayload = `${correctUrl}?token=${cred.signedVerificationToken}`;

    const urlIsWrong =
      !cred.verificationUrl ||
      !cred.verificationUrl.includes(`/verify/${cred.credentialExternalId}`);

    if (!urlIsWrong) continue;

    console.log(`Fixing ${cred.id}:`);
    console.log(`  old: ${cred.verificationUrl}`);
    console.log(`  new: ${correctUrl}`);

    await prisma.credential.update({
      where: { id: cred.id },
      data: {
        verificationUrl: correctUrl,
        qrPayload: correctQrPayload,
      },
    });

    const qrPath = join(ASSET_ROOT, "credentials", cred.id, "verification-qr.png");
    try {
      await unlink(qrPath);
      console.log(`  deleted stale QR: ${qrPath}`);
    } catch {
      console.log(`  QR already absent: ${qrPath}`);
    }

    fixed++;
  }

  console.log(`\nDone. Fixed ${fixed} / ${credentials.length} credentials.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
