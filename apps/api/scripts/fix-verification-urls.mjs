/**
 * One-time migration: fix stale verificationUrl / qrPayload / metadataUri /
 * qrCodeUri / proofUrl values in DB, and delete stale on-disk assets so they
 * are regenerated from the current WEB_PUBLIC_BASE_URL / API_PUBLIC_BASE_URL
 * on next request.
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
const API_BASE = (process.env.API_PUBLIC_BASE_URL ?? "http://localhost:4000/api").replace(/\/+$/, "");
const ASSET_ROOT = resolve(__dirname, "..", process.env.ASSET_STORAGE_ROOT ?? "storage");

const prisma = new PrismaClient();

async function fixCredentials() {
  const credentials = await prisma.credential.findMany({
    select: {
      id: true,
      credentialExternalId: true,
      verificationUrl: true,
      qrPayload: true,
      qrCodeUri: true,
      metadataUri: true,
      certificateUri: true,
      signedVerificationToken: true,
      verificationId: true,
      securePdfEnabled: true,
    },
  });

  let fixed = 0;

  for (const cred of credentials) {
    const correctUrl = `${WEB_BASE}/verify/${cred.credentialExternalId}`;
    const correctQrPayload = `${correctUrl}?token=${cred.signedVerificationToken}`;
    const correctMetadataUri = `${API_BASE}/credentials/${cred.id}/metadata`;
    const correctQrCodeUri = `${API_BASE}/credentials/${cred.id}/qr`;
    const correctCertificateUri = cred.securePdfEnabled
      ? `${API_BASE}/verify/${cred.verificationId}/certificate`
      : null;

    const urlWrong =
      !cred.verificationUrl || cred.verificationUrl !== correctUrl;
    const qrPayloadWrong =
      !cred.qrPayload || cred.qrPayload !== correctQrPayload;
    const metadataWrong =
      !cred.metadataUri || cred.metadataUri !== correctMetadataUri;
    const qrCodeUriWrong =
      !cred.qrCodeUri || cred.qrCodeUri !== correctQrCodeUri;
    const certUriWrong =
      cred.certificateUri !== correctCertificateUri;

    if (
      !urlWrong &&
      !qrPayloadWrong &&
      !metadataWrong &&
      !qrCodeUriWrong &&
      !certUriWrong
    )
      continue;

    console.log(`Fixing credential ${cred.id}:`);
    if (urlWrong) {
      console.log(`  verificationUrl: ${cred.verificationUrl} → ${correctUrl}`);
    }
    if (qrPayloadWrong) {
      console.log(`  qrPayload was stale`);
    }
    if (metadataWrong) {
      console.log(`  metadataUri: ${cred.metadataUri} → ${correctMetadataUri}`);
    }
    if (qrCodeUriWrong) {
      console.log(`  qrCodeUri: ${cred.qrCodeUri} → ${correctQrCodeUri}`);
    }

    await prisma.credential.update({
      where: { id: cred.id },
      data: {
        verificationUrl: correctUrl,
        qrPayload: correctQrPayload,
        metadataUri: correctMetadataUri,
        qrCodeUri: correctQrCodeUri,
        certificateUri: correctCertificateUri,
      },
    });

    // Delete stale on-disk assets so they are regenerated with the correct URL
    const credDir = join(ASSET_ROOT, "credentials", cred.id);
    for (const filename of ["verification-qr.png", "metadata.json", "certificate.pdf"]) {
      const filePath = join(credDir, filename);
      try {
        await unlink(filePath);
        console.log(`  deleted stale ${filename}`);
      } catch {
        // file already absent — ignore
      }
    }

    fixed++;
  }

  console.log(`\nFixed ${fixed} / ${credentials.length} credentials.`);
  return fixed;
}

async function fixDocumentProofs() {
  const proofs = await prisma.secureDocumentProof.findMany({
    select: {
      id: true,
      verificationId: true,
      proofUrl: true,
      qrPayload: true,
      qrCodeUri: true,
      metadataUri: true,
      signedVerificationToken: true,
    },
  });

  let fixed = 0;

  for (const proof of proofs) {
    const correctUrl = `${WEB_BASE}/proof/${proof.verificationId}`;
    const correctQrPayload = `${correctUrl}?token=${proof.signedVerificationToken}`;
    const correctMetadataUri = `${API_BASE}/document-proofs/${proof.id}/metadata`;
    const correctQrCodeUri = `${API_BASE}/document-proofs/${proof.id}/qr`;

    const urlWrong = !proof.proofUrl || proof.proofUrl !== correctUrl;
    const qrPayloadWrong =
      !proof.qrPayload || proof.qrPayload !== correctQrPayload;
    const metadataWrong =
      !proof.metadataUri || proof.metadataUri !== correctMetadataUri;
    const qrCodeUriWrong =
      !proof.qrCodeUri || proof.qrCodeUri !== correctQrCodeUri;

    if (!urlWrong && !qrPayloadWrong && !metadataWrong && !qrCodeUriWrong)
      continue;

    console.log(`Fixing document proof ${proof.id}:`);
    if (urlWrong) {
      console.log(`  proofUrl: ${proof.proofUrl} → ${correctUrl}`);
    }
    if (qrPayloadWrong) {
      console.log(`  qrPayload was stale`);
    }
    if (metadataWrong) {
      console.log(`  metadataUri: ${proof.metadataUri} → ${correctMetadataUri}`);
    }
    if (qrCodeUriWrong) {
      console.log(`  qrCodeUri: ${proof.qrCodeUri} → ${correctQrCodeUri}`);
    }

    await prisma.secureDocumentProof.update({
      where: { id: proof.id },
      data: {
        proofUrl: correctUrl,
        qrPayload: correctQrPayload,
        metadataUri: correctMetadataUri,
        qrCodeUri: correctQrCodeUri,
      },
    });

    // Delete stale on-disk assets so they are regenerated with the correct URL
    const proofDir = join(ASSET_ROOT, "document-proofs", proof.id);
    for (const filename of ["verification-qr.png", "metadata.json"]) {
      const filePath = join(proofDir, filename);
      try {
        await unlink(filePath);
        console.log(`  deleted stale ${filename}`);
      } catch {
        // file already absent — ignore
      }
    }

    fixed++;
  }

  console.log(`\nFixed ${fixed} / ${proofs.length} document proofs.`);
  return fixed;
}

async function main() {
  console.log(`Web base: ${WEB_BASE}`);
  console.log(`API base: ${API_BASE}`);
  console.log(`Asset root: ${ASSET_ROOT}\n`);

  const credentialFixed = await fixCredentials();
  const proofFixed = await fixDocumentProofs();

  console.log(
    `\nTotal: fixed ${credentialFixed} credentials and ${proofFixed} document proofs.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
