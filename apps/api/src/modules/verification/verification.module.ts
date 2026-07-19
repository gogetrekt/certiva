import { Module } from '@nestjs/common';

import { BlockchainModule } from '../blockchain/blockchain.module';
import { CredentialModule } from '../credential/credential.module';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  imports: [CredentialModule, BlockchainModule],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
