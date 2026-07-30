/**
 * Runs once when the Next server starts. Calling the env contract here is what
 * turns a bad configuration into a refused start instead of a surprise on the
 * first login request.
 *
 * Next bundles this file for the Edge runtime as well as Node, so the exiting
 * half of the guard cannot be imported statically: `process.exit` does not
 * exist in the Edge runtime and Turbopack fails the build on its presence
 * alone. The `NEXT_RUNTIME` branch is what keeps `env-exit` out of the Edge
 * bundle — Next inlines that value per bundle, so the branch is eliminated at
 * build time rather than merely skipped at run time.
 *
 * The dynamic import's binding is read and called immediately. A dynamic
 * `import()` whose bindings are never read gets dropped by the bundler, which
 * silently disabled this check once already.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertWebEnvOrExit } = await import('./lib/env-exit');
    assertWebEnvOrExit();
  }
}
