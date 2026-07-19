import type { AdminRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  username: string | null;
  email: string;
  role: AdminRole;
  issuerId: string | null;
  tokenVersion: number;
  active?: boolean;
}
