import { NextResponse } from "next/server";

import { getApiBaseUrl } from "../../../../../lib/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const response = await fetch(`${getApiBaseUrl()}/verify/${encodeURIComponent(id)}/certificate`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return new NextResponse(null, { status: response.status });
  }

  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificate-${id}.pdf"`,
    },
  });
}
