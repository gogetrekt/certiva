import { NextResponse } from "next/server";

import { getApiBaseUrl } from "../../../../lib/api";

const cookieSecure =
  process.env.COOKIE_SECURE === "true" ||
  process.env.NODE_ENV === "production";

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
    sameSite: "strict",
    secure: cookieSecure,
    path: "/",
  });

  return nextResponse;
}
