import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getApiBaseUrl } from "../../../../lib/api";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("certiva_access_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = url.searchParams.get("limit");
  const response = await fetch(
    `${getApiBaseUrl()}/audit/logs${limit ? `?limit=${encodeURIComponent(limit)}` : ""}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
