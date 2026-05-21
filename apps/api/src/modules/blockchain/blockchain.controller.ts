import { Controller, Get } from "@nestjs/common";

import { BlockchainService } from "./blockchain.service";

@Controller("blockchain")
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get("health")
  healthCheck() {
    return this.blockchainService.healthCheck();
  }
}
