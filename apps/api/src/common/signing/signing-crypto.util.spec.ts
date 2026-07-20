import {
  decryptSecret,
  encryptSecret,
  generateEd25519KeyPair,
  signEd25519,
  verifyEd25519,
} from './signing-crypto.util';

describe('signing-crypto.util', () => {
  describe('Ed25519 sign/verify', () => {
    it('verifies a signature it produced', () => {
      const { publicKey, privateKey } = generateEd25519KeyPair();
      const payload = 'credentialId:crd_abc\nstudentName:Ada Lovelace';
      const sig = signEd25519(payload, privateKey);
      expect(verifyEd25519(payload, sig, publicKey)).toBe(true);
    });

    it('rejects a tampered payload', () => {
      const { publicKey, privateKey } = generateEd25519KeyPair();
      const payload = 'degree:BSc\ngraduationYear:2020';
      const sig = signEd25519(payload, privateKey);
      expect(
        verifyEd25519('degree:BSc\ngraduationYear:2021', sig, publicKey),
      ).toBe(false);
    });

    it('rejects a signature under the wrong public key', () => {
      const a = generateEd25519KeyPair();
      const b = generateEd25519KeyPair();
      const payload = 'x:1';
      const sig = signEd25519(payload, a.privateKey);
      expect(verifyEd25519(payload, sig, b.publicKey)).toBe(false);
    });

    it('returns false (never throws) on malformed inputs', () => {
      expect(verifyEd25519('x', 'not-base64!!', 'also-garbage')).toBe(false);
    });
  });

  describe('encryptSecret/decryptSecret', () => {
    const master = 'a'.repeat(48);

    it('round-trips a plaintext secret', () => {
      const secret = generateEd25519KeyPair().privateKey;
      const blob = encryptSecret(secret, master);
      expect(blob).not.toContain(secret);
      expect(decryptSecret(blob, master)).toBe(secret);
    });

    it('produces different ciphertext for identical input (random salt/iv)', () => {
      expect(encryptSecret('same', master)).not.toBe(
        encryptSecret('same', master),
      );
    });

    it('fails to decrypt with the wrong master secret', () => {
      const blob = encryptSecret('top secret', master);
      expect(() => decryptSecret(blob, 'b'.repeat(48))).toThrow();
    });

    it('rejects a malformed blob', () => {
      expect(() => decryptSecret('v1.only.three.parts', master)).toThrow(
        'Invalid encrypted secret format',
      );
    });
  });
});
