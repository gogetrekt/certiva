// The DTOs use decorators, which read their metadata through this shim. Nest
// loads it at bootstrap; a plain unit test has to ask for it.
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { BulkDeleteCredentialsDto } from './bulk-delete-credentials.dto';
import {
  BulkIssueCredentialsDto,
  MAX_CSV_ROWS,
} from './bulk-issue-credentials.dto';
import { BulkRevokeCredentialsDto } from './bulk-revoke-credentials.dto';
import { MAX_BULK_IDS } from './bulk-limits';
import { parseCredentialCsv } from '../credential.bulk.utils';
import { VerifyCredentialCodeDto } from '../../verification/dto/verify-credential-code.dto';

const errorsFor = <T extends object>(cls: new () => T, payload: unknown) =>
  validateSync(plainToInstance(cls, payload) as object);

const ids = (n: number) => Array.from({ length: n }, (_, i) => `crd_${i}`);

/**
 * `@ArrayNotEmpty()` guarded the lower bound and nothing guarded the upper one,
 * so 50,000 ids passed validation and were then processed one at a time, each
 * in its own transaction. The ADMIN rate limit is no defence when a single
 * request is the whole problem.
 */
describe('bulk id arrays are bounded at both ends', () => {
  // A literal, not MAX_BULK_IDS + 1: deriving the input from the constant
  // under test makes the assertion move with the value and pass no matter how
  // high the limit is raised. 50,001 is the size the audit actually posted.
  it.each([
    ['BulkDeleteCredentialsDto', BulkDeleteCredentialsDto],
    ['BulkRevokeCredentialsDto', BulkRevokeCredentialsDto],
  ])('rejects 50,001 ids in %s', (_name, cls) => {
    const payload = { ids: ids(50_001), reason: 'DATA_CORRECTION' };

    expect(errorsFor(cls as new () => object, payload).length).toBeGreaterThan(
      0,
    );
  });

  it('keeps the limit within what the dashboard can actually select', () => {
    expect(MAX_BULK_IDS).toBeLessThanOrEqual(1000);
  });

  it('still accepts a batch at the limit', () => {
    const payload = { ids: ids(MAX_BULK_IDS), reason: 'DATA_CORRECTION' };

    expect(errorsFor(BulkRevokeCredentialsDto, payload)).toHaveLength(0);
  });
});

/**
 * The public, unauthenticated verify-by-code route took its input through
 * `@Body('verificationCode')`, which bypasses the global ValidationPipe
 * entirely: a 900 KB string was accepted, echoed back in full, and cost a
 * VerificationLog row.
 */
describe('verification code length', () => {
  it('rejects a 900 KB verification code', () => {
    const errors = errorsFor(VerifyCredentialCodeDto, {
      verificationCode: 'A'.repeat(900_000),
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts a real verification code', () => {
    expect(
      errorsFor(VerifyCredentialCodeDto, {
        verificationCode: 'CV-8E6D9AC1E050',
      }),
    ).toHaveLength(0);
  });
});

/**
 * A byte cap on the CSV does not bound the row count: single-character lines
 * fit by the million. Silently truncating would issue part of a batch and
 * report success, so the overflow has to surface as an error.
 */
describe('CSV row count', () => {
  it('reports an error instead of silently truncating', () => {
    const csv = Array.from(
      { length: MAX_CSV_ROWS + 5 },
      (_, i) => `Student ${i},SID${i},BSc`,
    ).join('\n');

    const result = parseCredentialCsv(csv);

    expect(result.rows.length).toBeLessThanOrEqual(MAX_CSV_ROWS);
    expect(result.errors.some((e) => e.message.includes('more than'))).toBe(
      true,
    );
  });

  it('leaves an ordinary CSV alone', () => {
    const result = parseCredentialCsv(
      'Ada Lovelace,SID1,BSc\nAlan Turing,SID2,MSc',
    );

    expect(result.rows).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('bounds the csv field itself', () => {
    const errors = errorsFor(BulkIssueCredentialsDto, {
      csv: 'x'.repeat(3 * 1024 * 1024),
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});
