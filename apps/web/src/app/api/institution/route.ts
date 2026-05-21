import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getApiBaseUrl } from "../../../lib/api";

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get("certiva_access_token")?.value;
}

export async function GET() {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const response = await fetch(`${getApiBaseUrl()}/institution`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}

export async function PATCH(request: Request) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const response = await fetch(`${getApiBaseUrl()}/institution`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
