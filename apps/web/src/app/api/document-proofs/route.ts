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
    fetch(`${getApiBaseUrl()}/document-proofs`, {
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

  const incomingFormData = await request.formData();
  const outboundFormData = new FormData();

  for (const [key, value] of incomingFormData.entries()) {
    outboundFormData.set(key, value);
  }

  return bffProxy(() =>
    fetch(`${getApiBaseUrl()}/document-proofs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: outboundFormData,
      cache: "no-store",
    }),
  );
}
