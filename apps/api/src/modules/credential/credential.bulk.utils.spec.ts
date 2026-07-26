import { parseCredentialCsv } from './credential.bulk.utils';

/**
 * The batch CSV is the one place where an operator hands the system a file and
 * every row becomes a signed, anchored credential. A parser that silently drops
 * a row issues fewer credentials than the operator counted; one that silently
 * mis-splits a row signs the wrong student's name. Both fail quietly, so the
 * tests below concentrate on rejection and on exact field boundaries.
 */

const HASH = 'a'.repeat(64);

describe('parseCredentialCsv — header handling', () => {
  it('treats a recognised header row as a header, not as a student', () => {
    const result = parseCredentialCsv(
      'studentName,studentId,degree\nSiti,2021,Teknik',
    );

    expect(result.hasHeader).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].studentName).toBe('Siti');
  });

  it.each([
    ['Student Name,Student ID,Degree'],
    ['student_name,student_id,degree'],
    ['student-name,student-id,degree'],
    ['STUDENTNAME,STUDENTID,DEGREE'],
    ['  studentName , studentId , degree  '],
  ])('recognises %j as a header', (header) => {
    const result = parseCredentialCsv(`${header}\nSiti,2021,Teknik`);

    expect(result.hasHeader).toBe(true);
    expect(result.rows).toHaveLength(1);
  });

  it('does not treat a data row as a header just because it is first', () => {
    const result = parseCredentialCsv('Siti,2021,Teknik\nBudi,2022,Hukum');

    expect(result.hasHeader).toBe(false);
    expect(result.rows).toHaveLength(2);
  });

  it('only considers the first non-empty line as a possible header', () => {
    // A second header-looking line is a data row, and should be issued or
    // rejected as such rather than silently skipped.
    const result = parseCredentialCsv(
      'studentName,studentId,degree\nSiti,2021,Teknik\nstudentName,studentId,degree',
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rows[1].studentName).toBe('studentName');
  });

  it('ignores a UTF-8 BOM before the header', () => {
    const result = parseCredentialCsv(
      '﻿studentName,studentId,degree\nSiti,2021,Teknik',
    );

    expect(result.hasHeader).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toEqual([]);
  });
});

describe('parseCredentialCsv — row shape is enforced', () => {
  it('rejects a row with fewer than three columns instead of defaulting them', () => {
    const result = parseCredentialCsv('Siti,2021');

    expect(result.rows).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      rowNumber: 1,
      message: 'Expected at least 3 columns (studentName, studentId, degree).',
    });
  });

  it('rejects a row with a fifth populated column', () => {
    // An unexpected column usually means the operator's column order is not the
    // one the parser assumes, so the safe response is to refuse the row.
    const result = parseCredentialCsv(`Siti,2021,Teknik,${HASH},extra`);

    expect(result.rows).toEqual([]);
    expect(result.errors[0].message).toMatch(/Too many columns/);
  });

  it('tolerates trailing empty columns from a spreadsheet export', () => {
    const result = parseCredentialCsv('Siti,2021,Teknik,,,');

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].documentHash).toBeUndefined();
  });

  it('skips blank and whitespace-only lines without reporting an error', () => {
    const result = parseCredentialCsv(
      'Siti,2021,Teknik\n\n   \n\nBudi,2022,Hukum\n',
    );

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
  });

  it('numbers rows by their line in the file, so errors point at the right line', () => {
    const result = parseCredentialCsv(
      'studentName,studentId,degree\nSiti,2021,Teknik\n\nBudi,2022',
    );

    expect(result.rows[0].rowNumber).toBe(2);
    expect(result.errors[0].rowNumber).toBe(4);
  });

  it('reports every bad row rather than stopping at the first', () => {
    const result = parseCredentialCsv('Siti,2021\nBudi,2022\nAni,2023');

    expect(result.errors).toHaveLength(3);
    expect(result.errors.map((e) => e.rowNumber)).toEqual([1, 2, 3]);
  });

  it('keeps good rows while rejecting bad ones in the same file', () => {
    const result = parseCredentialCsv(
      'Siti,2021,Teknik\nBudi,2022\nAni,2023,Hukum',
    );

    expect(result.rows.map((r) => r.studentName)).toEqual(['Siti', 'Ani']);
    expect(result.errors.map((e) => e.rowNumber)).toEqual([2]);
  });
});

describe('parseCredentialCsv — quoting', () => {
  it('keeps a comma inside quotes as part of one field', () => {
    // "Sarjana Ekonomi, S.E." must not become two columns and trip the
    // too-many-columns check.
    const result = parseCredentialCsv('Siti,2021,"Sarjana Ekonomi, S.E."');

    expect(result.errors).toEqual([]);
    expect(result.rows[0].degree).toBe('Sarjana Ekonomi, S.E.');
  });

  it('unescapes a doubled quote inside a quoted field', () => {
    const result = parseCredentialCsv('"Siti ""Ita"" Rahma",2021,Teknik');

    expect(result.errors).toEqual([]);
    expect(result.rows[0].studentName).toBe('Siti "Ita" Rahma');
  });

  it('rejects a row with an unclosed quote instead of guessing where it ends', () => {
    const result = parseCredentialCsv('Siti,2021,"Sarjana Teknik');

    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toEqual({
      rowNumber: 1,
      message: 'Unclosed quote in CSV line.',
    });
  });

  it('does not let a quoted field swallow the rest of the file', () => {
    const result = parseCredentialCsv('Siti,2021,"Teknik\nBudi,2022,Hukum');

    // Each physical line is parsed on its own, so the unclosed quote costs one
    // row, not everything after it.
    expect(result.errors.map((e) => e.rowNumber)).toEqual([1]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].studentName).toBe('Budi');
  });
});

describe('parseCredentialCsv — documentHash validation', () => {
  it('accepts a 64-char hex hash and lowercases it', () => {
    const result = parseCredentialCsv(`Siti,2021,Teknik,${'AB'.repeat(32)}`);

    expect(result.errors).toEqual([]);
    expect(result.rows[0].documentHash).toBe('ab'.repeat(32));
  });

  it.each([
    ['too short', 'a'.repeat(63)],
    ['too long', 'a'.repeat(65)],
    ['non-hex characters', 'g'.repeat(64)],
    ['a 0x prefix', `0x${'a'.repeat(62)}`],
    ['internal whitespace', `${'a'.repeat(32)} ${'a'.repeat(31)}`],
  ])('rejects a documentHash that is %s', (_, hash) => {
    const result = parseCredentialCsv(`Siti,2021,Teknik,${hash}`);

    expect(result.rows).toEqual([]);
    expect(result.errors[0].message).toBe(
      'documentHash must be a 64-character SHA-256 hex value.',
    );
  });

  it('treats an empty or whitespace documentHash column as absent, not invalid', () => {
    const result = parseCredentialCsv('Siti,2021,Teknik,   ');

    expect(result.errors).toEqual([]);
    expect(result.rows[0].documentHash).toBeUndefined();
  });
});

describe('parseCredentialCsv — line endings and trimming', () => {
  it('handles CRLF line endings', () => {
    const result = parseCredentialCsv(
      'studentName,studentId,degree\r\nSiti,2021,Teknik\r\nBudi,2022,Hukum\r\n',
    );

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    // A stray \r must not survive into a field that gets signed.
    expect(result.rows[0].degree).toBe('Teknik');
    expect(result.rows[1].degree).toBe('Hukum');
  });

  it('trims surrounding whitespace from every field', () => {
    const result = parseCredentialCsv('  Siti  ,  2021  ,  Teknik  ');

    expect(result.rows[0]).toMatchObject({
      studentName: 'Siti',
      studentId: '2021',
      degree: 'Teknik',
    });
  });

  it('returns an empty result for empty input rather than a phantom row', () => {
    for (const input of ['', '\n', '   ', '\r\n\r\n']) {
      const result = parseCredentialCsv(input);
      expect(result.rows).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.hasHeader).toBe(false);
    }
  });

  it('does not treat a header-only file as containing a credential', () => {
    const result = parseCredentialCsv('studentName,studentId,degree\n');

    expect(result.hasHeader).toBe(true);
    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
