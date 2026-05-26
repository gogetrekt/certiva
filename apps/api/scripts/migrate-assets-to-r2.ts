#!/usr/bin/env ts-node
/**
 * migrate-assets-to-r2.ts
 *
 * Uploads existing local credential/document-proof assets to Cloudflare R2.
 * Safe to run multiple times — skips objects that already exist in R2 unless
 * --force is passed.
 *
 * Usage (from apps/api):
 *   pnpm ts-node scripts/migrate-assets-to-r2.ts [--dry-run] [--force]
 *
 * Required env vars (same as STORAGE_DRIVER=r2 in .env):
 *   R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT
 *
 * Optional:
 *   ASSET_STORAGE_ROOT  (default: storage)
 *   R2_FORCE_PATH_STYLE (default: true)
 *
 * Flags:
 *   --dry-run   List files that would be uploaded without actually uploading.
 *   --force     Re-upload even if the R2 object already exists.
 */

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

// ── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");

// ── Config from env ───────────────────────────────────────────────────────────
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

const ASSET_ROOT = path.isAbsolute(process.env.ASSET_STORAGE_ROOT ?? "storage")
  ? (process.env.ASSET_STORAGE_ROOT as string)
  : path.resolve(process.cwd(), process.env.ASSET_STORAGE_ROOT ?? "storage");

const R2_ENDPOINT = requireEnv("R2_ENDPOINT");
const R2_BUCKET = requireEnv("R2_BUCKET");
const R2_ACCESS_KEY_ID = requireEnv("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = requireEnv("R2_SECRET_ACCESS_KEY");
const FORCE_PATH_STYLE = process.env.R2_FORCE_PATH_STYLE !== "false";

const client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  forcePathStyle: FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function contentTypeFor(filename: string): string {
  if (filename.endsWith(".pdf")) return "application/pdf";
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}

async function objectExists(key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

function sha256File(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function collectFiles(dir: string, prefix: string): Array<{ localPath: string; key: string }> {
  const results: Array<{ localPath: string; key: string }> = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const localPath = path.join(dir, entry.name);
    const key = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      results.push(...collectFiles(localPath, key));
    } else if (entry.isFile()) {
      results.push({ localPath, key });
    }
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Asset root : ${ASSET_ROOT}`);
  console.log(`R2 bucket  : ${R2_BUCKET}`);
  console.log(`Mode       : ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`Force      : ${FORCE}`);
  console.log();

  if (!fs.existsSync(ASSET_ROOT)) {
    console.log("Asset root does not exist — nothing to migrate.");
    return;
  }

  // Collect from credentials/ and document-proofs/
  const prefixes = ["credentials", "document-proofs"];
  const allFiles: Array<{ localPath: string; key: string }> = [];
  for (const prefix of prefixes) {
    const dir = path.join(ASSET_ROOT, prefix);
    allFiles.push(...collectFiles(dir, prefix));
  }

  console.log(`Found ${allFiles.length} local asset file(s).`);
  if (allFiles.length === 0) return;

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const { localPath, key } of allFiles) {
    const stats = fs.statSync(localPath);
    const sizeKb = (stats.size / 1024).toFixed(1);

    if (!FORCE) {
      const exists = await objectExists(key);
      if (exists) {
        console.log(`  SKIP  ${key} (already in R2)`);
        skipped++;
        continue;
      }
    }

    const localHash = sha256File(localPath);
    console.log(`  ${DRY_RUN ? "WOULD UPLOAD" : "UPLOAD"} ${key} (${sizeKb} KB, sha256=${localHash})`);

    if (!DRY_RUN) {
      try {
        const body = fs.readFileSync(localPath);
        await client.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: body,
            ContentType: contentTypeFor(path.basename(localPath)),
            ContentLength: body.byteLength,
          }),
        );
        uploaded++;
      } catch (err) {
        console.error(`  FAIL  ${key}: ${(err as Error).message}`);
        failed++;
      }
    } else {
      uploaded++;
    }
  }

  console.log();
  console.log("── Summary ──────────────────────────────────────────");
  console.log(`  ${DRY_RUN ? "Would upload" : "Uploaded"} : ${uploaded}`);
  console.log(`  Skipped   : ${skipped}`);
  console.log(`  Failed    : ${failed}`);
  if (failed > 0) {
    console.log();
    console.log("Some files failed. Re-run to retry, or check permissions/credentials.");
    process.exit(1);
  }
  console.log();
  console.log("Local files are NOT deleted. Keep them as a backup until you");
  console.log("have verified R2 content and switched STORAGE_DRIVER=r2.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
