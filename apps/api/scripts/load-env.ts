import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Load `.env` for the standalone scripts, in the same order prisma.config.js
 * uses: app-local first, repo root second. Uses Node's own loadEnvFile rather
 * than `dotenv` — the package is not a dependency of this workspace, so every
 * script that imported it failed at require time before it ran a single query.
 */
export function loadScriptEnv() {
  for (const path of [
    resolve(__dirname, '../.env'),
    resolve(__dirname, '../../../.env'),
  ]) {
    if (existsSync(path)) process.loadEnvFile(path);
  }
}
