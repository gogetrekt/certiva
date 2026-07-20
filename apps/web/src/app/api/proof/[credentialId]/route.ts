import { NextResponse } from "next/server";

import { getApiBaseUrl } from "../../../../lib/api";

// Proxies the public, DB-free proof bundle from the API and forces a download.
// Same-origin so the browser can save it without CORS gymnastics.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ credentialId: string }> },
) {
  const { credentialId } = await params;

  let response: Response;
  try {
    response = await fetch(
      `${getApiBaseUrl()}/verification/${encodeURIComponent(credentialId)}/proof`,
      { cache: "no-store" },
    );
  } catch {
    return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
  }

  if (!response.ok) {
    return NextResponse.json(
      { message: "Proof not available for this credential" },
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
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="certiva-proof-${credentialId}.json"`,
    },
  });
}
