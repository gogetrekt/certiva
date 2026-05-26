import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { bffProxy, getApiBaseUrl } from "../../../lib/api";

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get("certiva_access_token")?.value;
}

export async function GET() {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return bffProxy(() =>
    fetch(`${getApiBaseUrl()}/auth/admins`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
  );
}

export async function POST(request: Request) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  return bffProxy(() =>
    fetch(`${getApiBaseUrl()}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }),
  );
}
