import * as bcrypt from 'bcrypt';

import { UNKNOWN_ADMIN_DUMMY_HASH } from './auth.service';

/**
 * The dummy hash is what login compares against when the identifier does not
 * exist. Its whole job is to cost the same as a real comparison, so both its
 * shape and its cost are asserted here — a malformed hash that bcrypt rejects
 * early would return instantly and reintroduce the username-existence oracle.
 */
describe('UNKNOWN_ADMIN_DUMMY_HASH', () => {
  it('is a well-formed 60-character bcrypt hash at cost 12', () => {
    expect(UNKNOWN_ADMIN_DUMMY_HASH).toHaveLength(60);
    expect(UNKNOWN_ADMIN_DUMMY_HASH).toMatch(
      /^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/,
    );
    expect(bcrypt.getRounds(UNKNOWN_ADMIN_DUMMY_HASH)).toBe(12);
  });

  it('matches no plausible password', async () => {
    for (const candidate of ['', 'admin', 'admin123', 'password', 'certiva']) {
      await expect(
        bcrypt.compare(candidate, UNKNOWN_ADMIN_DUMMY_HASH),
      ).resolves.toBe(false);
    }
  });

  it('costs a full bcrypt round, not an instant reject', async () => {
    // Measured against a freshly generated cost-12 hash rather than a fixed
    // millisecond floor, so the assertion holds on slow CI and fast laptops
    // alike. A hash bcrypt refuses to parse returns in well under half the
    // time of a real one.
    const real = await bcrypt.hash('some-real-password', 12);

    const timed = async (hash: string) => {
      const started = process.hrtime.bigint();
      await bcrypt.compare('attempted-password', hash);
      return Number(process.hrtime.bigint() - started) / 1e6;
    };

    const realMs = await timed(real);
    const dummyMs = await timed(UNKNOWN_ADMIN_DUMMY_HASH);

    expect(dummyMs).toBeGreaterThan(realMs * 0.5);
  });
});
