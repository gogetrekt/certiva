import { BadRequestException } from '@nestjs/common';

import {
  MAX_UPLOAD_SIZE_BYTES,
  PdfReferenceService,
} from './pdf-reference.service';

/**
 * This service is the first thing an unauthenticated upload touches, so its
 * guards are a trust boundary rather than input tidying. The reference parsing
 * matters for the same reason from the other direction: whatever it returns goes
 * straight into a database lookup.
 */
describe('PdfReferenceService', () => {
  const service = new PdfReferenceService();

  const upload = (
    overrides: Partial<{
      buffer: Buffer;
      size: number;
      mimetype: string;
      originalname: string;
    }> = {},
  ) => ({
    buffer: Buffer.from('%PDF-1.7\n...'),
    size: 12,
    mimetype: 'application/pdf',
    ...overrides,
  });

  describe('assertValidPdfUpload', () => {
    it('accepts a well-formed PDF upload', () => {
      expect(() => service.assertValidPdfUpload(upload())).not.toThrow();
    });

    it('rejects a missing file', () => {
      expect(() => service.assertValidPdfUpload(undefined)).toThrow(
        BadRequestException,
      );
    });

    it('rejects an empty body', () => {
      expect(() =>
        service.assertValidPdfUpload(upload({ buffer: Buffer.alloc(0) })),
      ).toThrow(/empty/i);
    });

    it('rejects anything over the size ceiling', () => {
      expect(() =>
        service.assertValidPdfUpload(
          upload({ size: MAX_UPLOAD_SIZE_BYTES + 1 }),
        ),
      ).toThrow(/10MB or smaller/);
    });

    it('rejects a non-PDF content type', () => {
      expect(() =>
        service.assertValidPdfUpload(upload({ mimetype: 'image/png' })),
      ).toThrow(/Only PDF uploads/);
    });

    it('rejects a PDF content type whose bytes are not a PDF', () => {
      // The declared mime type is attacker-controlled; only the magic header is
      // evidence. This is the case that keeps a renamed payload out of pdf-lib.
      expect(() =>
        service.assertValidPdfUpload(
          upload({ buffer: Buffer.from('not a pdf') }),
        ),
      ).toThrow(/Malformed PDF header/);
    });

    it('accepts the content type with a charset suffix and odd casing', () => {
      expect(() =>
        service.assertValidPdfUpload(
          upload({ mimetype: '  APPLICATION/PDF  ' }),
        ),
      ).not.toThrow();
    });
  });

  describe('assertReadablePdf', () => {
    it('rejects bytes with no PDF header', async () => {
      await expect(
        service.assertReadablePdf(Buffer.from('not a pdf')),
      ).rejects.toThrow(/Malformed PDF document/);
    });

    it('accepts a PDF header with a body it cannot fully parse', async () => {
      // Documents real pdf-lib behaviour rather than wishful thinking: it is
      // lenient here, so a file like this gets past this guard and is rejected
      // later by the extraction stages answering null. Worth pinning, because a
      // future stricter pdf-lib would change which error the caller sees.
      await expect(
        service.assertReadablePdf(
          Buffer.from('%PDF-1.4\ngarbage not a real pdf\n'),
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('reference extraction from a QR payload', () => {
    // Exercised through the private method on purpose: it is the whole decision
    // this service exists to make, and the public entry points around it need a
    // parsed PDF to reach it.
    const extract = (payload: string, kind?: 'document' | 'credential') =>
      service['extractReferenceFromPayload'](payload, kind);

    it('pulls the reference out of a /proof URL', () => {
      expect(extract('https://certiva.test/proof/dpf_a1b2c3d4e5f6a7')).toBe(
        'dpf_a1b2c3d4e5f6a7',
      );
    });

    it('pulls the reference out of a /verify URL', () => {
      expect(extract('https://certiva.test/verify/vrf_a1b2c3d4e5f6a7')).toBe(
        'vrf_a1b2c3d4e5f6a7',
      );
    });

    it('prefers the path segment over the token when both are acceptable', () => {
      expect(
        extract(
          'https://certiva.test/verify/vrf_pathwins123456?token=vrf_tokenlost123',
        ),
      ).toBe('vrf_pathwins123456');
    });

    it('falls back to the token when the path segment is the wrong kind', () => {
      expect(
        extract(
          'https://certiva.test/verify/unrelated?token=vrf_a1b2c3d4e5f6a7',
          'credential',
        ),
      ).toBe('vrf_a1b2c3d4e5f6a7');
    });

    it('reads a raw token that is not a URL at all', () => {
      expect(extract('dpf_a1b2c3d4e5f6a7')).toBe('dpf_a1b2c3d4e5f6a7');
    });

    it('normalises a DP- reference to upper case and a bare hash to lower', () => {
      expect(extract('dp-a1b2c3d4')).toBe('DP-A1B2C3D4');
      expect(extract('F'.repeat(64))).toBe('f'.repeat(64));
    });

    it('answers null for a payload with no reference in it', () => {
      expect(extract('https://certiva.test/about')).toBeNull();
      expect(extract('   ')).toBeNull();
      expect(extract('hello world')).toBeNull();
    });

    it('refuses a credential reference when a document one was expected', () => {
      // Cross-kind confusion would look up the wrong table and report a genuine
      // credential as an unknown document, or the reverse.
      expect(extract('vrf_a1b2c3d4e5f6a7', 'document')).toBeNull();
      expect(extract('dpf_a1b2c3d4e5f6a7', 'credential')).toBeNull();
      expect(extract('dpf_a1b2c3d4e5f6a7', 'document')).toBe(
        'dpf_a1b2c3d4e5f6a7',
      );
      expect(extract('vrf_a1b2c3d4e5f6a7', 'credential')).toBe(
        'vrf_a1b2c3d4e5f6a7',
      );
    });

    it('accepts a bare 64-char hash for either kind', () => {
      const hash = 'a'.repeat(64);
      expect(extract(hash, 'document')).toBe(hash);
      expect(extract(hash, 'credential')).toBe(hash);
    });

    it('ignores a token that is too short to be a real reference', () => {
      expect(extract('dpf_abc')).toBeNull();
    });
  });
});
