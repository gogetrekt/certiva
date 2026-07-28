import type { AppConfigService } from '../../config/app-config.service';
import { BlockchainService } from './blockchain.service';

/**
 * On-chain writes cannot be undone, so the two things worth pinning here are the
 * guard that decides whether we are allowed to write at all, and the conversion
 * that decides *what* gets written. A malformed proof hash reaching the contract
 * would be anchored permanently against the wrong value.
 */
describe('BlockchainService', () => {
  const build = (overrides: Record<string, unknown> = {}) =>
    new BlockchainService({
      blockchainRpcUrl: 'https://rpc.example',
      blockchainPrivateKey: `0x${'1'.repeat(64)}`,
      blockchainContractAddress: '0x34FEb3321bc0326652776D44CD3208B10F3b527D',
      ...overrides,
    } as unknown as AppConfigService);

  describe('toBytes32ProofHash', () => {
    const service = build();

    it('prefixes a valid 64-char hash', () => {
      expect(service.toBytes32ProofHash('A'.repeat(64))).toBe(
        `0x${'a'.repeat(64)}`,
      );
    });

    it('tolerates surrounding whitespace and mixed case', () => {
      expect(service.toBytes32ProofHash(`  ${'aB'.repeat(32)}  `)).toBe(
        `0x${'ab'.repeat(32)}`,
      );
    });

    it.each([
      ['null', null],
      ['empty', ''],
      ['too short', 'a'.repeat(63)],
      ['too long', 'a'.repeat(65)],
      ['non-hex characters', 'z'.repeat(64)],
      ['already 0x-prefixed', `0x${'a'.repeat(64)}`],
    ])('refuses a proof hash that is %s', (_label, value) => {
      // Refusing is the point: anything that slipped through would be written to
      // the chain and could not be taken back.
      expect(() => service.toBytes32ProofHash(value)).toThrow(
        /not a valid bytes32/,
      );
    });
  });

  describe('isConfigured', () => {
    it('is true only when rpc url, key and contract address are all present', () => {
      expect(build().isConfigured()).toBe(true);
    });

    it.each([
      'blockchainRpcUrl',
      'blockchainPrivateKey',
      'blockchainContractAddress',
    ])('is false when %s is missing', (missing) => {
      expect(build({ [missing]: undefined }).isConfigured()).toBe(false);
    });
  });
});
