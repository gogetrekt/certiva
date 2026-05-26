import { NextResponse } from "next/server";

import { getApiBaseUrl } from "../../../../../lib/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/credentials/${encodeURIComponent(id)}/metadata`, {
      cache: "no-store",
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }

  if (!response.ok) {
    return new NextResponse(null, { status: response.status });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return new NextResponse(null, { status: 502 });
  }

  return NextResponse.json(payload, { status: 200 });
}
