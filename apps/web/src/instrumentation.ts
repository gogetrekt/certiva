/**
 * Runs once when the Next server starts. Importing the env contract statically
 * — and calling it — is what turns a bad configuration into a refused start
 * instead of a surprise on the first login request.
 *
 * Both halves are deliberate: a dynamic `import()` whose bindings are never read
 * gets dropped by the bundler, which silently disabled this check once already.
 */
import { assertWebEnv } from './lib/env';

export function register() {
  assertWebEnv();
}
