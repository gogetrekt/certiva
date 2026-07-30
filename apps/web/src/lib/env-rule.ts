/**
 * The env rule on its own, with no import-time side effect and no opinion about
 * how to fail.
 *
 * It is separate from `env.ts` because that module asserts on import — which is
 * what protects route handlers — and the exiting guard must be able to read the
 * rule *without* triggering that throw first. When `env-exit.ts` imported
 * `env.ts` directly, module evaluation threw before `process.exit` could run,
 * Next reported "An error occurred while loading instrumentation hook" and then
 * kept serving traffic: the exact swallowed-rejection behaviour the exit exists
 * to avoid.
 */

/**
 * `next build` executes these modules while collecting page data, long before
 * anything serves a request. A build machine has no reason to hold the
 * production cookie setting, so the check would fail there for a configuration
 * that is only ever supplied at run time.
 *
 * Next sets NEXT_PHASE for exactly this kind of distinction. The alternative —
 * feeding a dummy COOKIE_SECURE=true through the Dockerfile — was rejected: it
 * would fix this one Dockerfile while leaving `next build` broken everywhere
 * else it runs (CI, a hosting provider, a developer's machine), and it teaches
 * the build to pass by asserting something untrue about the deployment.
 */
function isBuildPhase() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/**
 * Returns the problem as a message, or null when the configuration is
 * acceptable.
 */
export function webEnvError(): string | null {
  if (isBuildPhase()) {
    return null;
  }

  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  if (process.env.COOKIE_SECURE !== 'true') {
    return (
      'COOKIE_SECURE must be "true" when NODE_ENV=production. ' +
      `Got ${JSON.stringify(process.env.COOKIE_SECURE ?? null)}. ` +
      'Leaving it unset sends the certiva_access_token cookie over plain ' +
      'HTTP with no warning — set COOKIE_SECURE=true, or run with ' +
      'NODE_ENV=development for local HTTP.'
    );
  }

  return null;
}
