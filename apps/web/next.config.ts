import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    // Allow camera/microphone only on same origin if ever needed; disable risky APIs.
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      // Default: same-origin only
      "default-src 'self'",
      // Scripts: Next.js requires 'unsafe-inline' and 'unsafe-eval' for its runtime
      // chunks in development. In production builds unsafe-eval is not needed but
      // nonce-based CSP requires Next.js middleware integration; unsafe-inline is
      // still required for Next.js inline bootstrap script.
      "script-src 'self' 'unsafe-inline'",
      // Styles: Tailwind v4 injects a runtime <style> tag, requiring unsafe-inline.
      "style-src 'self' 'unsafe-inline'",
      // Images: allow same-origin, data: URIs (QR code canvas exports), and blob:
      "img-src 'self' data: blob:",
      // Fonts: same-origin only (no Google Fonts or CDN)
      "font-src 'self'",
      // Connect: only reach the BFF itself (same-origin); no external XHR/fetch
      "connect-src 'self'",
      // Frames: none
      "frame-src 'none'",
      "frame-ancestors 'none'",
      // Objects/embeds: none
      "object-src 'none'",
      // Workers (QR library may spawn workers): same-origin
      "worker-src 'self' blob:",
      // Form actions: same-origin
      "form-action 'self'",
      // Base URI: lock to self so injected <base> tags cannot redirect
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@certiva/ui", "@certiva/types"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
