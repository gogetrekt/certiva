import type { Request } from 'express';
import { resolveClientIp } from './resolve-client-ip';

/**
 * Locks the one behaviour that matters: `x-forwarded-for` is attacker-controlled
 * unless a proxy we control is known to rewrite it. Two of the four call sites
 * this util replaced read the header unconditionally, which let any client
 * choose the IP written to the audit log — an audit trail that records the
 * attacker's chosen value is worse than one with no IP at all.
 */
describe('resolveClientIp', () => {
  const request = (
    headers: Record<string, string | undefined>,
    ip?: string,
    remoteAddress?: string,
  ) =>
    ({
      headers,
      ip,
      socket: { remoteAddress },
    }) as unknown as Request;

  it('ignores x-forwarded-for when the proxy is not trusted', () => {
    // The spoofing case: a client claims 9.9.9.9 while connecting from
    // 203.0.113.7. Without trustProxy the socket address must win.
    const req = request({ 'x-forwarded-for': '9.9.9.9' }, '203.0.113.7');

    expect(resolveClientIp(req, false)).toBe('203.0.113.7');
  });

  it('honours x-forwarded-for when the proxy is trusted', () => {
    const req = request({ 'x-forwarded-for': '9.9.9.9' }, '10.0.0.1');

    expect(resolveClientIp(req, true)).toBe('9.9.9.9');
  });

  it('takes the left-most hop from a trusted x-forwarded-for chain', () => {
    const req = request(
      { 'x-forwarded-for': '9.9.9.9, 10.0.0.5, 10.0.0.6' },
      '10.0.0.1',
    );

    expect(resolveClientIp(req, true)).toBe('9.9.9.9');
  });

  it('prefers cf-connecting-ip over everything, even untrusted', () => {
    // Cloudflare sets this at the edge and a client cannot forge it through CF,
    // so it outranks both the header and the socket.
    const req = request(
      { 'cf-connecting-ip': '198.51.100.4', 'x-forwarded-for': '9.9.9.9' },
      '203.0.113.7',
    );

    expect(resolveClientIp(req, false)).toBe('198.51.100.4');
    expect(resolveClientIp(req, true)).toBe('198.51.100.4');
  });

  it('falls back to the socket address, then to "unknown"', () => {
    expect(resolveClientIp(request({}, undefined, '203.0.113.9'), true)).toBe(
      '203.0.113.9',
    );
    expect(resolveClientIp(request({}), true)).toBe('unknown');
  });

  it('ignores a blank or whitespace-only forwarded header', () => {
    const req = request({ 'x-forwarded-for': '   ' }, '203.0.113.7');

    expect(resolveClientIp(req, true)).toBe('203.0.113.7');
  });
});
