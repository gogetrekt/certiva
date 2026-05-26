import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminRole } from "@prisma/client";

import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { BlockchainService } from "./blockchain.service";

@Controller("blockchain")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.OWNER, AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.AUDITOR)
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get("health")
  healthCheck() {
    return this.blockchainService.healthCheck();
  }
}
