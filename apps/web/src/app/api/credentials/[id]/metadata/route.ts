import { NextResponse } from "next/server";

import { getApiBaseUrl } from "../../../../../lib/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const response = await fetch(`${getApiBaseUrl()}/credentials/${encodeURIComponent(id)}/metadata`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return new NextResponse(null, { status: response.status });
  }

  const payload = await response.json();
  return NextResponse.json(payload, { status: 200 });
}
