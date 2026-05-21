import { NextResponse } from "next/server";

/**
 * GET /api/session/clear
 *
 * Clears the auth cookie and redirects to /login.
 * Used by DashboardLayout when the backend returns 401/403 (stale or deleted
 * session). A redirect() inside a Server Component cannot also set cookies, so
 * we bounce through this edge route instead.
 */
export async function GET(request: Request) {
  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl);

  response.cookies.set("certiva_access_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });

  return response;
}
