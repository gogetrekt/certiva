import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { CredentialService } from './credential.service';

@Injectable()
export class CredentialIntegrityService implements OnModuleInit {
  private readonly logger = new Logger(CredentialIntegrityService.name);

  constructor(private readonly credentialService: CredentialService) {}

  async onModuleInit() {
    const updatedCount = await this.credentialService.backfillDocumentHashes();
    if (updatedCount > 0) {
      this.logger.log(`Backfilled document hashes for ${updatedCount} credential(s).`);
    }
  }
}
