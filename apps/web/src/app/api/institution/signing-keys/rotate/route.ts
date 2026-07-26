import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { bffProxy, getApiBaseUrl } from "../../../../../lib/api";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("certiva_access_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return bffProxy(() =>
    fetch(`${getApiBaseUrl()}/institution/signing-keys/rotate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
}
