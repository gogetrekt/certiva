import { NextResponse } from "next/server";

import { bffProxy, getApiBaseUrl } from "../../../../../lib/api";

export async function POST(request: Request) {
  const body = await request.json();
  return bffProxy(() =>
    fetch(`${getApiBaseUrl()}/verify/document/code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    }),
  );
}
