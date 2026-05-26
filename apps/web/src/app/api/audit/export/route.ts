import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getApiBaseUrl } from "../../../../lib/api";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("certiva_access_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/audit/dashboard/export`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
  }

  if (!response.ok) {
    return NextResponse.json({ message: "Export failed" }, { status: response.status });
  }

  const blob = await response.blob();
  const date = new Date().toISOString().slice(0, 10);

  return new Response(blob, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="certiva-credentials-${date}.csv"`,
    },
  });
}
