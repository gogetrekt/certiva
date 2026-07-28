/**
 * Server-side env contract for apps/web, mirroring the hard guards in the API's
 * `main.ts` — refuse to run on a configuration that is quietly unsafe rather
 * than defaulting to the lax value.
 *
 * FIX.md 3.10 suggested zod for this. It is one boolean rule and `apps/web` does
 * not depend on zod, so a plain guard does the same job without adding a runtime
 * dependency to the web app. Swap it in if this file ever grows real schema
 * work.
 */

export function assertWebEnv() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  if (process.env.COOKIE_SECURE !== 'true') {
    const message =
      'COOKIE_SECURE must be "true" when NODE_ENV=production. ' +
      `Got ${JSON.stringify(process.env.COOKIE_SECURE ?? null)}. ` +
      'Leaving it unset sends the certiva_access_token cookie over plain ' +
      'HTTP with no warning — set COOKIE_SECURE=true, or run with ' +
      'NODE_ENV=development for local HTTP.';

    // Exit rather than throw. Next calls the instrumentation hook after the
    // server is already listening and swallows a rejection from it, so throwing
    // here would print nothing and serve traffic anyway — measured, not assumed.
    // The API refuses to boot on a bad env for the same reason; this matches it.
    console.error(`[certiva-web] ${message}`);
    process.exit(1);
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
