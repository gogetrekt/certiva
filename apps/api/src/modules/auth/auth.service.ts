import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { type Admin } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import {
  ADMIN_ROLE,
  OWNER_ROLE,
  SUPER_ADMIN_ROLE,
} from '../../common/auth/admin-role.constants';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogService,
  type AuditContext,
} from '../audit/audit-log.service';
import { InstitutionService } from '../institution/institution.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import type { JwtPayload } from './types/jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
    private readonly institutionService: InstitutionService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async register(dto: RegisterDto, actor?: JwtPayload, context?: AuditContext) {
    const requestedRole = dto.role ?? ADMIN_ROLE;

    // Enforce role creation hierarchy:
    // - Only OWNER can create OWNER or SUPER_ADMIN
    // - SUPER_ADMIN can create ADMIN or AUDITOR only
    if (actor) {
      if (
        (requestedRole === OWNER_ROLE || requestedRole === SUPER_ADMIN_ROLE) &&
        actor.role !== OWNER_ROLE
      ) {
        throw new ForbiddenException(
          'Only an OWNER can create OWNER or SUPER_ADMIN accounts',
        );
      }
    }

    const username = this.normalizeUsername(dto.username);
    const email = this.buildCompatibilityEmail(username);
    const existing = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (existing) {
      throw new ConflictException('Admin with this username already exists');
    }

    const institution = await this.institutionService.getInstitution();

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const admin = await this.prisma.admin.create({
      data: {
        username,
        email,
        password: passwordHash,
        role: requestedRole,
        active: true,
        issuerId: institution.id,
      },
    });

    await this.auditLogService.log({
      action: 'ADMIN_CREATED',
      context: {
        ...(context ?? {}),
        actorAdminId: actor?.sub,
        actorUsername: actor?.username ?? undefined,
      },
      targetType: 'Admin',
      targetId: admin.id,
      metadata: { username: admin.username, role: admin.role },
    });

    return this.buildAuthResponse(admin);
  }

  async login(dto: LoginDto, context?: AuditContext) {
    const identifier = this.normalizeLoginIdentifier(
      dto.username ?? dto.email ?? '',
    );
    if (!identifier) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const admin = await this.prisma.admin.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
      },
    });

    // Use constant-time comparison path regardless of whether admin exists
    // to avoid leaking username existence via timing
    const dummyHash = '$2b$12$invalidhashforunknownuseraccount000000000000000000000000';
    const passwordValid = await bcrypt.compare(
      dto.password,
      admin?.password ?? dummyHash,
    );

    if (!admin || !passwordValid) {
      await this.auditLogService.log({
        action: 'LOGIN_FAILURE',
        context: context ?? {},
        metadata: { identifier },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!admin.active) {
      await this.auditLogService.log({
        action: 'LOGIN_FAILURE',
        context: context ?? {},
        metadata: { identifier, reason: 'ACCOUNT_INACTIVE' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.auditLogService.log({
      action: 'LOGIN_SUCCESS',
      context: {
        ...(context ?? {}),
        actorAdminId: admin.id,
        actorUsername: admin.username ?? undefined,
      },
      targetType: 'Admin',
      targetId: admin.id,
    });

    return this.buildAuthResponse(admin);
  }

  async getProfile(adminId: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        issuer: true,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin account no longer exists');
    }

    let issuer = admin.issuer;
    if (!issuer) {
      try {
        issuer = await this.institutionService.resolveInstitutionForAdmin({
          sub: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          issuerId: admin.issuerId,
          tokenVersion: admin.tokenVersion,
          active: admin.active,
        });
      } catch {
        issuer = null;
      }
    }

    return {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      issuerId: issuer?.id ?? admin.issuerId,
      active: admin.active,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      issuer: issuer
        ? {
            id: issuer.id,
            name: issuer.name,
            displayName: issuer.displayName,
            domain: issuer.domain,
            logoUrl: issuer.logoUrl,
            websiteUrl: issuer.websiteUrl,
            status: issuer.status,
          }
        : null,
    };
  }

  async listAdmins() {
    const admins = await this.prisma.admin.findMany({
      include: {
        issuer: true,
      },
      orderBy: [
        {
          role: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });

    return admins.map((admin) => ({
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      active: admin.active,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      institution: admin.issuer
        ? {
            id: admin.issuer.id,
            name: admin.issuer.name,
            displayName: admin.issuer.displayName,
          }
        : null,
    }));
  }

  async updateAdmin(actor: JwtPayload, adminId: string, dto: UpdateAdminDto) {
    if (actor.sub === adminId && typeof dto.active === 'boolean' && !dto.active) {
      throw new ForbiddenException('Cannot disable your own admin account');
    }

    const existing = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!existing) {
      throw new NotFoundException('Admin not found');
    }

    // Non-OWNER actors cannot modify OWNER accounts
    if (
      existing.role === OWNER_ROLE &&
      actor.role !== OWNER_ROLE
    ) {
      throw new ForbiddenException('Cannot modify an OWNER account');
    }

    // Prevent demotion of last OWNER
    if (
      existing.role === OWNER_ROLE &&
      dto.role &&
      dto.role !== OWNER_ROLE
    ) {
      await this.assertNotLastOwner(adminId);
    }

    // Prevent disabling last OWNER
    if (
      existing.role === OWNER_ROLE &&
      typeof dto.active === 'boolean' &&
      !dto.active
    ) {
      await this.assertNotLastOwner(adminId);
    }

    // Only OWNER can assign OWNER or SUPER_ADMIN roles
    if (
      (dto.role === OWNER_ROLE || dto.role === SUPER_ADMIN_ROLE) &&
      actor.role !== OWNER_ROLE
    ) {
      throw new ForbiddenException(
        'Only an OWNER can assign the OWNER or SUPER_ADMIN role',
      );
    }

    const isDisabling =
      typeof dto.active === 'boolean' && !dto.active && existing.active;
    const isRoleChange = dto.role && dto.role !== existing.role;

    const updated = await this.prisma.admin.update({
      where: { id: adminId },
      data: {
        role: dto.role ?? undefined,
        active: typeof dto.active === 'boolean' ? dto.active : undefined,
        // Increment tokenVersion when disabling or changing role to invalidate existing sessions
        ...(isDisabling || isRoleChange
          ? { tokenVersion: { increment: 1 } }
          : {}),
      },
    });

    const auditAction = isDisabling
      ? 'ADMIN_DISABLED'
      : isRoleChange
        ? 'ADMIN_ROLE_CHANGED'
        : 'ADMIN_UPDATED';

    await this.auditLogService.log({
      action: auditAction,
      context: { actorAdminId: actor.sub, actorUsername: actor.username ?? undefined },
      targetType: 'Admin',
      targetId: adminId,
      metadata: {
        ...(dto.role ? { newRole: dto.role, previousRole: existing.role } : {}),
        ...(isDisabling ? { disabled: true } : {}),
      },
    });

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      active: updated.active,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  private async assertNotLastOwner(excludeAdminId: string) {
    const ownerCount = await this.prisma.admin.count({
      where: {
        role: OWNER_ROLE,
        active: true,
        id: { not: excludeAdminId },
      },
    });

    if (ownerCount === 0) {
      throw new ForbiddenException(
        'Cannot remove or demote the last active OWNER account',
      );
    }
  }

  async deleteAdmin(actor: JwtPayload, adminId: string, context?: AuditContext) {
    if (actor.sub === adminId) {
      throw new ForbiddenException('Cannot delete your own admin account');
    }

    const existing = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!existing) {
      throw new NotFoundException('Admin not found');
    }

    // Non-OWNER actors cannot delete OWNER accounts
    if (existing.role === OWNER_ROLE && actor.role !== OWNER_ROLE) {
      throw new ForbiddenException('Cannot delete an OWNER account');
    }

    if (existing.active) {
      throw new BadRequestException('Deactivate account before deleting');
    }

    const hasActivity = await this.adminHasActivity([
      existing.email,
      existing.username,
    ]);
    if (hasActivity) {
      throw new ConflictException(
        'Cannot delete account with existing activity',
      );
    }

    await this.prisma.admin.delete({
      where: { id: adminId },
    });

    await this.auditLogService.log({
      action: 'ADMIN_DELETED',
      context: {
        ...(context ?? {}),
        actorAdminId: actor.sub,
        actorUsername: actor.username ?? undefined,
      },
      targetType: 'Admin',
      targetId: adminId,
      metadata: { username: existing.username, role: existing.role },
    });

    return {
      id: adminId,
      deleted: true,
    };
  }

  private async adminHasActivity(identifiers: Array<string | null>) {
    const values = identifiers.filter((value): value is string =>
      Boolean(value),
    );
    const [
      uploadedBatches,
      revokedCredentials,
      registeredCredentialProofs,
      createdDocumentProofs,
      revokedDocumentProofs,
    ] = await this.prisma.$transaction([
      this.prisma.issuanceBatch.count({
        where: {
          uploadedBy: { in: values },
        },
      }),
      this.prisma.credential.count({
        where: {
          revokedBy: { in: values },
        },
      }),
      this.prisma.credentialDocumentProof.count({
        where: {
          registeredBy: { in: values },
        },
      }),
      this.prisma.secureDocumentProof.count({
        where: {
          createdBy: { in: values },
        },
      }),
      this.prisma.secureDocumentProof.count({
        where: {
          revokedBy: { in: values },
        },
      }),
    ]);

    return (
      uploadedBatches +
        revokedCredentials +
        registeredCredentialProofs +
        createdDocumentProofs +
        revokedDocumentProofs >
      0
    );
  }

  private buildAuthResponse(
    admin: Pick<Admin, 'id' | 'username' | 'email' | 'role' | 'issuerId' | 'tokenVersion'>,
  ) {
    const payload: JwtPayload = {
      sub: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      issuerId: admin.issuerId,
      tokenVersion: admin.tokenVersion,
    };

    return {
      accessToken: this.jwtService.sign(payload, {
        expiresIn: this.configService.jwtExpiresIn as never,
      }),
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        issuerId: admin.issuerId,
      },
    };
  }

  private normalizeUsername(username: string) {
    return username.trim().toLowerCase();
  }

  private normalizeLoginIdentifier(identifier: string) {
    return identifier.trim().toLowerCase();
  }

  private buildCompatibilityEmail(username: string) {
    return `${username}@certiva.local`;
  }
}
