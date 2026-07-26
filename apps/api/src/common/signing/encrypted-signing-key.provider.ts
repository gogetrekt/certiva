import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import {
  GeneratedSigningKey,
  SigningKeyProvider,
} from './signing-key.provider';
import {
  SignablePayload,
  decryptSecret,
  encryptSecret,
  generateEd25519KeyPair,
  signEd25519,
} from './signing-crypto.util';

/**
 * Encrypted-at-rest signing key provider. Private keys are AES-256-GCM
 * encrypted with SIGNING_KEY_ENCRYPTION_SECRET and decrypted in-memory only for
 * the duration of a signing call. Consistent with Certiva's existing env-secret
 * model (JWT_SECRET) and self-hosted, no-external-vendor posture.
 */
@Injectable()
export class EncryptedSigningKeyProvider implements SigningKeyProvider {
  readonly algorithm = 'Ed25519';

  constructor(private readonly config: AppConfigService) {}

  generateKeyPair(): Promise<GeneratedSigningKey> {
    const { publicKey, privateKey } = generateEd25519KeyPair();
    return Promise.resolve({
      publicKey,
      privateKeyStored: encryptSecret(
        privateKey,
        this.config.signingKeyEncryptionSecret,
      ),
    });
  }

  sign(payload: SignablePayload, privateKeyStored: string): Promise<string> {
    // Defer so a decrypt failure surfaces as a rejected promise (the async
    // contract) rather than a synchronous throw.
    return Promise.resolve().then(() => {
      const privateKey = decryptSecret(
        privateKeyStored,
        this.config.signingKeyEncryptionSecret,
      );
      return signEd25519(payload, privateKey);
    });
  }
}
