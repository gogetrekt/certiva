import { AuditAction as PrismaAuditAction } from '@prisma/client';
import { AUDIT_ACTION } from '@certiva/types';

/**
 * packages/types described the audit contract for every consumer, including the
 * web app, but nothing checked it against the schema it claims to mirror. It
 * had drifted: SIGNING_KEY_GENERATED and SIGNING_KEY_ROTATED were missing even
 * though both are written by production code (lazy key init and
 * rotateActiveKey). The same class of drift was found once before with
 * BlockchainOperation.
 *
 * The API is the only place both definitions are visible at once, so the check
 * belongs here. It compares values, not names — the Prisma enum and the const
 * object use different key styles on purpose.
 */
describe('AuditAction parity between packages/types and schema.prisma', () => {
  const fromPrisma = Object.values(PrismaAuditAction).sort();
  const fromContract = Object.values(AUDIT_ACTION).sort();

  it('lists exactly the same actions on both sides', () => {
    expect(fromContract).toEqual(fromPrisma);
  });

  it('covers the signing key actions that had gone missing', () => {
    expect(fromContract).toContain('SIGNING_KEY_GENERATED');
    expect(fromContract).toContain('SIGNING_KEY_ROTATED');
  });
});
