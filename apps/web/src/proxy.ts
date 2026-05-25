import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "certiva_access_token";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE)?.value;

  // Only block unauthenticated access to /dashboard.
  // Do NOT redirect /login -> /dashboard here: the edge runtime cannot verify
  // whether a token is actually valid (no backend call possible), so redirecting
  // based on presence alone causes an infinite loop when the cookie is stale.
  // The login page's Server Component does a real backend check and redirects
  // to /dashboard only when the token is confirmed valid.
  if (pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
