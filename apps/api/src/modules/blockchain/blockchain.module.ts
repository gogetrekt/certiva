import { Module } from "@nestjs/common";

import { PrismaModule } from "../../prisma/prisma.module";
import { BlockchainController } from "./blockchain.controller";
import { BlockchainQueueService } from "./blockchain-queue.service";
import { BlockchainService } from "./blockchain.service";

@Module({
  imports: [PrismaModule],
  controllers: [BlockchainController],
  providers: [BlockchainService, BlockchainQueueService],
  exports: [BlockchainService, BlockchainQueueService],
})
export class BlockchainModule {}
