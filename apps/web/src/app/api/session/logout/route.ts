import { NextResponse } from "next/server";

const cookieSecure = process.env.COOKIE_SECURE === "true";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("certiva_access_token", "", {
    httpOnly: true,
    sameSite: "strict",
    secure: cookieSecure,
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });

  return response;
}
