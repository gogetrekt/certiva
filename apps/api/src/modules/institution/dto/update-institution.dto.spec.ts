import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { UpdateInstitutionDto } from './update-institution.dto';

/**
 * `domain` ends up inside `did:web:<domain>` and the `id` of every VC signed
 * after the edit, and a signed document cannot be corrected retroactively — so
 * these inputs have to be rejected before they are stored, not normalised
 * afterwards. The global ValidationPipe (whitelist + forbidNonWhitelisted) turns
 * every failure below into a 400 before the controller runs.
 */
function fieldsWithErrors(payload: Record<string, unknown>): string[] {
  return validateSync(plainToInstance(UpdateInstitutionDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);
}

describe('UpdateInstitutionDto', () => {
  it.each([
    ['empty string', ''],
    ['whitespace only', '   '],
    ['embedded path', 'x.ac.id/verify'],
    ['scheme prefix', 'https://x.ac.id'],
    ['internal space', 'foo bar'],
    ['no TLD', 'localhost'],
    ['too long', `${'a'.repeat(250)}.ac.id`],
  ])('rejects domain: %s', (_label, domain) => {
    expect(fieldsWithErrors({ domain })).toContain('domain');
  });

  it.each([
    ['plain host', 'verify.kampus.ac.id'],
    ['deep subdomain', 'verify.fti.kampus.ac.id'],
    ['hyphenated label', 'verify-ijazah.kampus.ac.id'],
    // What prisma/seed.ts and the dev database actually use — tightening the
    // rule past this would break local development.
    ['dev .local host', 'certiva.local'],
  ])('accepts domain: %s', (_label, domain) => {
    expect(fieldsWithErrors({ domain })).toEqual([]);
  });

  it.each([
    ['not hex', '0xZZZZ567890123456789012345678901234567890'],
    ['too short', '0x1234'],
    ['missing 0x', '1234567890123456789012345678901234567890'],
  ])('rejects wallet: %s', (_label, wallet) => {
    expect(fieldsWithErrors({ wallet })).toContain('wallet');
  });

  it('accepts a lowercase and a checksummed wallet address', () => {
    expect(
      fieldsWithErrors({
        wallet: '0xabcdef1234567890abcdef1234567890abcdef12',
      }),
    ).toEqual([]);
    expect(
      fieldsWithErrors({
        wallet: '0xAbCdEf1234567890abcdef1234567890aBcDeF12',
      }),
    ).toEqual([]);
  });

  it('rejects an over-long name or displayName but accepts a normal one', () => {
    const tooLong = 'x'.repeat(201);
    expect(fieldsWithErrors({ name: tooLong })).toContain('name');
    expect(fieldsWithErrors({ displayName: tooLong })).toContain('displayName');
    expect(fieldsWithErrors({ name: '' })).toContain('name');
    expect(
      fieldsWithErrors({
        name: 'Universitas Teknologi Nusantara',
        displayName: 'UTN',
      }),
    ).toEqual([]);
  });

  it('accepts an empty patch — every field stays optional', () => {
    expect(fieldsWithErrors({})).toEqual([]);
  });
});
