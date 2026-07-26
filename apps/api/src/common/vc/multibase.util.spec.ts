import { generateEd25519KeyPair } from '../signing/signing-crypto.util';
import {
  base58btcDecode,
  base58btcEncode,
  multibaseToSignatureBase64,
  publicKeyMultibase,
  rawEd25519PublicKey,
  signatureToMultibase,
} from './multibase.util';

describe('base58btc', () => {
  it('matches known vectors', () => {
    expect(base58btcEncode(Buffer.from('hello world', 'utf8'))).toBe(
      'StV1DL6CwTryKyV',
    );
    // One leading zero byte encodes as one leading '1'.
    expect(base58btcEncode(Uint8Array.from([0x00, 0x00, 0x01]))).toBe('112');
    expect(base58btcEncode(Uint8Array.from([]))).toBe('');
  });

  it('round-trips arbitrary bytes, leading zeros included', () => {
    const cases = [
      Uint8Array.from([0]),
      Uint8Array.from([0, 0, 0]),
      Uint8Array.from([0, 0, 255, 1, 128]),
      Uint8Array.from({ length: 64 }, (_, i) => (i * 37) % 256),
    ];
    for (const bytes of cases) {
      expect(base58btcDecode(base58btcEncode(bytes))).toEqual(bytes);
    }
  });

  it('rejects characters outside the alphabet', () => {
    expect(() => base58btcDecode('0OIl')).toThrow(/base58btc/);
  });
});

describe('Ed25519 multibase encoding', () => {
  it('exposes the raw 32-byte public key out of SPKI DER', () => {
    const { publicKey } = generateEd25519KeyPair();
    expect(rawEd25519PublicKey(publicKey)).toHaveLength(32);
  });

  it('encodes a Multikey with the Ed25519 multicodec prefix', () => {
    const { publicKey } = generateEd25519KeyPair();
    const multikey = publicKeyMultibase(publicKey);

    // 0xed01 followed by 32 bytes always base58-encodes to a "z6Mk" prefix —
    // the property every did:key Ed25519 identifier shares.
    expect(multikey.startsWith('z6Mk')).toBe(true);
    expect(base58btcDecode(multikey.slice(1)).slice(0, 2)).toEqual(
      Uint8Array.from([0xed, 0x01]),
    );
    expect(base58btcDecode(multikey.slice(1))).toHaveLength(34);
  });

  it('rejects a key that is not Ed25519', () => {
    expect(() => rawEd25519PublicKey('not-a-key')).toThrow();
  });

  it('round-trips a signature between base64 and multibase', () => {
    const signatureB64 = Buffer.alloc(64, 7).toString('base64');
    const proofValue = signatureToMultibase(signatureB64);

    expect(proofValue.startsWith('z')).toBe(true);
    expect(multibaseToSignatureBase64(proofValue)).toBe(signatureB64);
  });

  it('rejects a proofValue that is not base58btc multibase', () => {
    expect(() => multibaseToSignatureBase64('uAAAA')).toThrow(/multibase/);
  });
});
