import { webEnvError } from './env-rule';

/**
 * The Node-only half of the env guard.
 *
 * Imports the rule from `env-rule`, never from `env`: `env` asserts on import,
 * so importing it here threw during module evaluation before `process.exit`
 * could run. Next then logged "An error occurred while loading instrumentation
 * hook" and carried on serving traffic — measured, and precisely the swallowed
 * failure this exit exists to prevent.
 *
 * `process.exit` is not available in the Edge runtime, and Turbopack fails the
 * build on the mere presence of it in any module that reaches an Edge bundle —
 * `instrumentation.ts` is bundled for both runtimes, so the call cannot live
 * there either. Only the `NEXT_RUNTIME === 'nodejs'` branch of instrumentation
 * imports this file, and that branch is eliminated from the Edge bundle at
 * build time.
 *
 * Exit rather than throw: Next calls the instrumentation hook after the server
 * is already listening and swallows a rejection from it, so throwing there
 * would print nothing useful and serve traffic anyway. The API refuses to boot
 * on a bad env for the same reason; this matches it.
 */
export function assertWebEnvOrExit() {
  const error = webEnvError();

  if (error) {
    console.error(`[certiva-web] ${error}`);
    process.exit(1);
  }
}
