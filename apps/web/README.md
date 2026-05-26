# apps/web

Next.js 16 frontend for Certiva. Serves the operator dashboard and public verification surfaces.

## Role

- Operator dashboard: credential registry, issuance, secure documents, verification logs, audit trail, administrator management, institution settings.
- Public verification: credential check by code or URL, secure document check by code or file upload, public proof result pages.
- BFF layer: Next.js API routes act as a backend-for-frontend proxy between the browser and the NestJS API. Cookies are set and cleared server-side. API errors are sanitized before reaching the browser.

## Security notes

- The JWT is stored in an `httpOnly`, `secure`, `sameSite: lax` cookie (`certiva_access_token`). It is not accessible to client-side JavaScript.
- `COOKIE_SECURE=true` is required when serving over HTTPS.
- `NEXT_PUBLIC_` variables are exposed to the browser at build time. Only non-secret values (public base URL, public feature flags) use this prefix.
- BFF routes strip internal error details before returning responses to the browser.

## Key environment variables

```
INTERNAL_API_URL      Internal URL for server-to-server API calls (not exposed to browser)
NEXT_PUBLIC_API_URL   Public API base URL (used for public verification links and QR codes)
COOKIE_SECURE         true in staging/production (HTTPS required)
NODE_ENV              production in staging/production
```

See [../../.env.example](../../.env.example) for the full reference.
