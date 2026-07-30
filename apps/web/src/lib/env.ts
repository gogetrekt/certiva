/**
 * Server-side env contract for apps/web, mirroring the hard guards in the API's
 * `main.ts` — refuse to run on a configuration that is quietly unsafe rather
 * than defaulting to the lax value.
 *
 * FIX.md 3.10 suggested zod for this. It is one boolean rule and `apps/web` does
 * not depend on zod, so a plain guard does the same job without adding a runtime
 * dependency to the web app. Swap it in if this file ever grows real schema
 * work.
 *
 * The rule itself lives in `env-rule.ts` and the Node-only exit in
 * `env-exit.ts`. This module is imported by route handlers, and route handlers
 * reach an Edge bundle: `process.exit` here was a *build* failure, not a runtime
 * one — Turbopack rejects the call in any module that reaches an Edge bundle
 * whether or not the line ever executes.
 */

import { webEnvError } from './env-rule';

export { webEnvError };

/**
 * Throws rather than exits, so it is safe in any runtime. A route handler that
 * imports this module on an unsafe configuration fails loudly instead of
 * quietly setting a cookie without the `secure` flag.
 */
export function assertWebEnv() {
  const error = webEnvError();

  if (error) {
    throw new Error(error);
  }
}

// Also runs on import, so a route handler that reads `cookieSecure` cannot be
// reached on an unsafe configuration even if the startup hook is skipped.
assertWebEnv();

/**
 * Whether the auth cookie gets the `secure` flag. In production the guard above
 * has already made this `true`, so the only way it is false is a non-production
 * run.
 */
export const cookieSecure = process.env.COOKIE_SECURE === 'true';
