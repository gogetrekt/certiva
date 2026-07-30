import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AdminRole } from '@prisma/client';

import {
  ADMIN_ROLE,
  AUDITOR_ROLE,
  OWNER_ROLE,
  SUPER_ADMIN_ROLE,
} from '../../common/auth/admin-role.constants';
import type { AuditLogService } from '../audit/audit-log.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { InstitutionController } from './institution.controller';

/**
 * Key rotation retires the key every existing credential was signed with. Only
 * OWNER and SUPER_ADMIN may reach it, and reading the key list must stay open to
 * AUDITOR so an auditor can check key status without being able to change it.
 *
 * These tests run the real RolesGuard against the real decorator metadata on the
 * real controller methods. That is what makes them meaningful: a hand-written
 * list of "expected roles" would keep passing after someone edited the @Roles
 * decorator, which is precisely the change that would open rotation up.
 */

// A rejection now also writes a FORBIDDEN_ATTEMPT audit entry, so the guard
// takes the audit service. These tests care about the allow/deny decision, so
// the writer is a stub that records nothing.
const auditLog = { log: jest.fn().mockResolvedValue(undefined) };
const guard = new RolesGuard(
  new Reflector(),
  auditLog as unknown as AuditLogService,
);

/**
 * Indexed access, so the handler is only ever passed to Reflector as a metadata
 * target and never treated as a callable this-bound method.
 */
function handlerRef(name: keyof InstitutionController) {
  return InstitutionController.prototype[name];
}

function contextFor(handlerName: keyof InstitutionController, role: AdminRole) {
  const admin: JwtPayload = {
    sub: 'adm_1',
    username: 'user',
    email: 'user@example.test',
    role,
    issuerId: 'inst_1',
    tokenVersion: 0,
    active: true,
  };

  return {
    getHandler: () => handlerRef(handlerName),
    getClass: () => InstitutionController,
    switchToHttp: () => ({ getRequest: () => ({ user: admin }) }),
  } as unknown as ExecutionContext;
}

const ALL_ROLES: AdminRole[] = [
  OWNER_ROLE,
  SUPER_ADMIN_ROLE,
  ADMIN_ROLE,
  AUDITOR_ROLE,
];

describe('POST /institution/signing-keys/rotate — elevated roles only', () => {
  it.each([[OWNER_ROLE], [SUPER_ADMIN_ROLE]])('allows %s to rotate', (role) => {
    expect(guard.canActivate(contextFor('rotateSigningKey', role))).toBe(true);
  });

  it.each([[ADMIN_ROLE], [AUDITOR_ROLE]])(
    'refuses %s with a ForbiddenException',
    (role) => {
      expect(() =>
        guard.canActivate(contextFor('rotateSigningKey', role)),
      ).toThrow(ForbiddenException);
    },
  );

  it('refuses an unauthenticated request outright', () => {
    const context = {
      getHandler: () => handlerRef('rotateSigningKey'),
      getClass: () => InstitutionController,
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(false);
  });

  it('carries role metadata at all, so the guard cannot be a no-op here', () => {
    // RolesGuard returns true for any handler with no @Roles metadata. Asserting
    // the metadata exists is what stops a deleted decorator from reading as
    // "everyone allowed" while the tests above still pass.
    const roles = new Reflector().get<string[]>(
      'roles',
      handlerRef('rotateSigningKey'),
    );

    expect(roles).toEqual(
      expect.arrayContaining([OWNER_ROLE, SUPER_ADMIN_ROLE]),
    );
    expect(roles).toHaveLength(2);
  });
});

describe('PATCH /institution — elevated roles only', () => {
  it.each([[ADMIN_ROLE], [AUDITOR_ROLE]])(
    'refuses %s from editing institution settings',
    (role) => {
      expect(() =>
        guard.canActivate(contextFor('updateInstitution', role)),
      ).toThrow(ForbiddenException);
    },
  );

  it.each([[OWNER_ROLE], [SUPER_ADMIN_ROLE]])('allows %s', (role) => {
    expect(guard.canActivate(contextFor('updateInstitution', role))).toBe(true);
  });
});

describe('GET /institution/signing-keys — readable by every role', () => {
  it.each(ALL_ROLES.map((r) => [r]))('allows %s to read key status', (role) => {
    // An AUDITOR must be able to see which key signed what without gaining the
    // ability to retire it.
    expect(guard.canActivate(contextFor('listSigningKeys', role))).toBe(true);
  });

  it('is strictly more permissive than rotation', () => {
    const readable = ALL_ROLES.filter((role) =>
      guard.canActivate(contextFor('listSigningKeys', role)),
    );
    const rotatable = ALL_ROLES.filter((role) => {
      try {
        return guard.canActivate(contextFor('rotateSigningKey', role));
      } catch {
        return false;
      }
    });

    expect(rotatable.length).toBeLessThan(readable.length);
    expect(readable).toEqual(expect.arrayContaining(rotatable));
  });
});
