import { NextResponse } from "next/server";

import { getApiBaseUrl } from "../../../../../lib/api";

// Proxies the W3C VC 2.0 / Open Badges 3.0 export and forces a download.
// Mirrors the /proof route next door; the two are independent formats of the
// same credential, not replacements for each other.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ credentialId: string }> },
) {
  const { credentialId } = await params;

  let response: Response;
  try {
    response = await fetch(
      `${getApiBaseUrl()}/verification/${encodeURIComponent(credentialId)}/vc`,
      { cache: "no-store" },
    );
  } catch {
    return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
  }

  if (!response.ok) {
    // 410 is meaningful here: the credential exists but has been revoked.
    return NextResponse.json(
      {
        message:
          response.status === 410
            ? "This credential has been revoked"
            : "Verifiable credential not available for this credential",
      },
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
      "Content-Type": "application/vc+ld+json",
      "Content-Disposition": `attachment; filename="certiva-vc-${credentialId}.jsonld"`,
    },
  });
}
