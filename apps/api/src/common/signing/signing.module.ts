import { Module } from '@nestjs/common';

import { AppConfigModule } from '../../config/app-config.module';
import { EncryptedSigningKeyProvider } from './encrypted-signing-key.provider';
import { SIGNING_KEY_PROVIDER } from './signing-key.provider';
import { SigningKeyService } from './signing-key.service';

@Module({
  imports: [AppConfigModule],
  providers: [
    EncryptedSigningKeyProvider,
    { provide: SIGNING_KEY_PROVIDER, useExisting: EncryptedSigningKeyProvider },
    SigningKeyService,
  ],
  exports: [SIGNING_KEY_PROVIDER, SigningKeyService],
})
export class SigningModule {}
