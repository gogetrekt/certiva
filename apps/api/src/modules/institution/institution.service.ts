import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { IssuerStatus, type Issuer } from "@prisma/client";
import { getAddress } from "viem";

import { PrismaService } from "../../prisma/prisma.service";
import { UpdateInstitutionDto } from "./dto/update-institution.dto";
import type { JwtPayload } from "../auth/types/jwt-payload";

const SETUP_REQUIRED_CODE = "INSTITUTION_SETUP_REQUIRED";
const DEFAULT_ISSUER_NAME = "Example University";
const DEFAULT_ISSUER_DOMAIN = "example.edu";

@Injectable()
export class InstitutionService {
  constructor(private readonly prisma: PrismaService) {}

  async getInstitution() {
    const institution = await this.findActiveInstitution();

    if (!institution) {
      const seeded = await this.ensureDevelopmentInstitution();
      if (seeded) {
        return seeded;
      }

      throw new NotFoundException({
        message: "Institution configuration not found",
        code: SETUP_REQUIRED_CODE,
      });
    }

    return institution;
  }

  async updateInstitution(dto: UpdateInstitutionDto, adminId?: string) {
    const institution = await this.getInstitution();
    const wallet = this.normalizeWallet(dto.wallet);

    const updated = await this.prisma.issuer.update({
      where: {
        id: institution.id,
      },
      data: {
        name: dto.name?.trim() || undefined,
        displayName: dto.displayName?.trim() || null,
        domain: dto.domain?.trim() || undefined,
        logoUrl: dto.logoUrl?.trim() || null,
        websiteUrl: dto.websiteUrl?.trim() || null,
        wallet,
        status: dto.status ?? undefined,
      },
    });

    if (adminId) {
      await this.linkAdminToInstitution(adminId, updated.id);
    }

    return updated;
  }

  async resolveInstitutionForAdmin(admin: JwtPayload) {
    const linkedIssuer = admin.issuerId
      ? await this.prisma.issuer.findUnique({
          where: {
            id: admin.issuerId,
          },
        })
      : null;

    if (linkedIssuer?.status === IssuerStatus.ACTIVE) {
      return linkedIssuer;
    }

    let institution = await this.findActiveInstitution();
    if (!institution) {
      institution = await this.ensureDevelopmentInstitution();
    }

    if (!institution) {
      throw new BadRequestException({
        message: "Institution configuration is required for this request",
        code: SETUP_REQUIRED_CODE,
      });
    }

    if (admin.issuerId !== institution.id) {
      await this.linkAdminToInstitution(admin.sub, institution.id);
    }

    return institution;
  }

  async resolveInstitutionId(admin: JwtPayload) {
    const institution = await this.resolveInstitutionForAdmin(admin);
    return institution.id;
  }

  private async findActiveInstitution(): Promise<Issuer | null> {
    const withWallet = await this.prisma.issuer.findFirst({
      where: {
        status: IssuerStatus.ACTIVE,
        domain: {
          not: "",
        },
        wallet: {
          not: null,
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "asc" }],
    });

    if (withWallet?.wallet?.trim()) {
      return withWallet;
    }

    return this.prisma.issuer.findFirst({
      where: {
        status: IssuerStatus.ACTIVE,
        domain: {
          not: "",
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "asc" }],
    });
  }

  private async ensureDevelopmentInstitution() {
    if (!this.isDevelopment()) {
      return null;
    }

    const active = await this.findActiveInstitution();
    if (active) {
      return active;
    }

    const wallet = this.normalizeWallet(process.env.ISSUER_WALLET);
    return this.prisma.issuer.create({
      data: {
        name: DEFAULT_ISSUER_NAME,
        displayName: DEFAULT_ISSUER_NAME,
        domain: DEFAULT_ISSUER_DOMAIN,
        wallet,
        status: IssuerStatus.ACTIVE,
      },
    });
  }

  private isDevelopment() {
    return (process.env.NODE_ENV ?? "development") === "development";
  }

  private normalizeWallet(input?: string | null) {
    const trimmed = input?.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return getAddress(trimmed);
    } catch {
      return trimmed;
    }
  }

  private async linkAdminToInstitution(adminId: string, issuerId: string) {
    await this.prisma.admin.update({
      where: {
        id: adminId,
      },
      data: {
        issuerId,
      },
    });
  }
}
