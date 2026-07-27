import type { Request } from 'express';

/**
 * The single client-IP resolver for the whole API.
 *
 * `x-forwarded-for` is client-supplied and therefore only trustworthy when a
 * proxy we control is known to overwrite it — which is what `trustProxy`
 * asserts. Reading it unconditionally lets any caller dictate the IP written to
 * the audit log or counted by the rate limiter, so the header is honoured only
 * behind that flag. Cloudflare's `cf-connecting-ip` is set by the edge and
 * cannot be forged by the client, so it wins outright.
 *
 * This lived in four copies before, two of which trusted `x-forwarded-for`
 * unconditionally. Keep it in one place: divergence here is silent, and the
 * failure mode is falsified audit records.
 */
export function resolveClientIp(req: Request, trustProxy: boolean): string {
  const cloudflareIp = req.headers['cf-connecting-ip'];
  if (typeof cloudflareIp === 'string' && cloudflareIp.trim()) {
    return cloudflareIp.trim();
  }

  if (trustProxy) {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
      return forwardedFor.split(',')[0]?.trim() || 'unknown';
    }
  }

  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}
