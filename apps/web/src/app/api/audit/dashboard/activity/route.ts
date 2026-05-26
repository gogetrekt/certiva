import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { bffProxy, getApiBaseUrl } from "../../../../../lib/api";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("certiva_access_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  return bffProxy(() =>
    fetch(
      `${getApiBaseUrl()}/audit/dashboard/activity${qs ? `?${qs}` : ""}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    ),
  );
}
