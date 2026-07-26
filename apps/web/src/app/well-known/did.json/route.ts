import { NextResponse } from "next/server";

import { getApiBaseUrl } from "../../../lib/api";

// did:web resolvers fetch https://<domain>/.well-known/did.json. Nest runs under
// a global `api` prefix and is not exposed publicly (docs/DEPLOY.md), so the web
// container owns that path and proxies here. The literal /.well-known/... URL is
// mapped onto this route by a rewrite in next.config.ts — a dot-prefixed app
// directory is not something the router is guaranteed to pick up.
export async function GET() {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/institution/did.json`, {
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
  }

  if (!response.ok) {
    return NextResponse.json(
      { message: "DID document not available" },
      { status: response.status },
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid response from service" },
      { status: 502 },
    );
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/did+json",
      // Short TTL so a key rotation becomes visible quickly.
      "Cache-Control": "public, max-age=300",
    },
  });
}
