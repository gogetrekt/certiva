import { NextResponse } from "next/server";

import { getApiBaseUrl } from "../../../../lib/api";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    email?: string;
    password?: string;
  };

  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: body.username?.trim() || body.email,
      password: body.password,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status });
  }

  const nextResponse = NextResponse.json(payload);
  nextResponse.cookies.set("certiva_access_token", payload.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return nextResponse;
}
