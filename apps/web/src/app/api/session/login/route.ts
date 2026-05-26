import { NextResponse } from "next/server";

import { getApiBaseUrl } from "../../../../lib/api";

const cookieSecure = process.env.COOKIE_SECURE === "true";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    email?: string;
    password?: string;
  };

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: body.username?.trim() || body.email,
        password: body.password,
      }),
    });
  } catch {
    return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid response from service" }, { status: 502 });
  }

  if (!response.ok) {
    // Deliberately allowlist fields — never forward path, timestamp, or stack details
    const safeError = {
      message: typeof payload.message === "string" ? payload.message : "Login failed",
    };
    return NextResponse.json(safeError, { status: response.status });
  }

  if (typeof payload.accessToken !== "string" || !payload.accessToken) {
    return NextResponse.json({ message: "Authentication error" }, { status: 502 });
  }

  // Strip the access token from the browser-visible response body.
  // It lives only in the httpOnly cookie.
  const { accessToken: _token, ...publicPayload } = payload;

  const nextResponse = NextResponse.json(publicPayload);
  nextResponse.cookies.set("certiva_access_token", _token, {
    httpOnly: true,
    sameSite: "strict",
    secure: cookieSecure,
    path: "/",
  });

  return nextResponse;
}
