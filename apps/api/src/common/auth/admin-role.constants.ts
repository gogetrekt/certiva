import type { AdminRole } from "@prisma/client";

export const OWNER_ROLE = "OWNER" as AdminRole;
export const SUPER_ADMIN_ROLE = "SUPER_ADMIN" as AdminRole;
export const ADMIN_ROLE = "ADMIN" as AdminRole;
export const AUDITOR_ROLE = "AUDITOR" as AdminRole;

export const ADMIN_ROLE_VALUES = [OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE] as const;

/** Roles with full elevated access (Owner kept for DB legacy; treated same as Super Admin) */
export const ELEVATED_ROLES = [OWNER_ROLE, SUPER_ADMIN_ROLE] as const;

/** Roles that can mutate credentials */
export const CREDENTIAL_MUTATOR_ROLES = [OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE] as const;

/** Roles that can revoke credentials */
export const CREDENTIAL_REVOKER_ROLES = [OWNER_ROLE, SUPER_ADMIN_ROLE] as const;

/** Roles that can manage admin accounts */
export const ADMIN_MANAGER_ROLES = [OWNER_ROLE, SUPER_ADMIN_ROLE] as const;

/** Roles with read-only access to audit/verification logs */
export const AUDIT_READER_ROLES = [OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE] as const;

/** Roles that can view credentials */
export const CREDENTIAL_READER_ROLES = [OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE] as const;
