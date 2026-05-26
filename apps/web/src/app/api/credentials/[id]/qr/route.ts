import { NextResponse } from "next/server";

import { getApiBaseUrl } from "../../../../../lib/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/credentials/${encodeURIComponent(id)}/qr`, {
      cache: "no-store",
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }

  if (!response.ok) {
    return new NextResponse(null, { status: response.status });
  }

  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
