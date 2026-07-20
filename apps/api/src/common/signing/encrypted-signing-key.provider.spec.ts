import { AppConfigService } from '../../config/app-config.service';
import { EncryptedSigningKeyProvider } from './encrypted-signing-key.provider';
import { verifyEd25519 } from './signing-crypto.util';

describe('EncryptedSigningKeyProvider', () => {
  const config = {
    signingKeyEncryptionSecret: 'unit-test-master-secret-at-least-32-chars',
  } as AppConfigService;
  const provider = new EncryptedSigningKeyProvider(config);

  it('generates a keypair whose stored private key never contains the raw key', async () => {
    const { publicKey, privateKeyStored } = await provider.generateKeyPair();
    expect(publicKey).toMatch(/^[A-Za-z0-9+/]+=*$/); // base64
    expect(privateKeyStored.startsWith('v1.')).toBe(true);
  });

  it('signs with the stored key such that the public key verifies it', async () => {
    const { publicKey, privateKeyStored } = await provider.generateKeyPair();
    const payload = 'credentialId:crd_x\nissuerDomain:kampus.ac.id';
    const sig = await provider.sign(payload, privateKeyStored);
    expect(verifyEd25519(payload, sig, publicKey)).toBe(true);
  });

  it('cannot sign if the master secret changed (blob undecryptable)', async () => {
    const { privateKeyStored } = await provider.generateKeyPair();
    const rotated = new EncryptedSigningKeyProvider({
      signingKeyEncryptionSecret: 'a-different-master-secret-32-chars-long!!',
    } as AppConfigService);
    await expect(rotated.sign('x', privateKeyStored)).rejects.toThrow();
  });
});
