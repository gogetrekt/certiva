import { Module } from '@nestjs/common';

import { AppConfigModule } from '../../config/app-config.module';
import { StorageModule } from '../../common/storage/storage.module';
import { SigningModule } from '../../common/signing/signing.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { InstitutionModule } from '../institution/institution.module';
import { CredentialAssetsController } from './credential-assets.controller';
import { CredentialAssetsService } from './credential-assets.service';
import { BatchController, CredentialController } from './credential.controller';
import { CredentialIntegrityService } from './credential-integrity.service';
import { CredentialService } from './credential.service';

@Module({
  imports: [
    AppConfigModule,
    StorageModule,
    SigningModule,
    BlockchainModule,
    InstitutionModule,
  ],
  controllers: [
    CredentialController,
    BatchController,
    CredentialAssetsController,
  ],
  providers: [
    CredentialService,
    CredentialAssetsService,
    CredentialIntegrityService,
  ],
  exports: [CredentialService, CredentialAssetsService],
})
export class CredentialModule {}
