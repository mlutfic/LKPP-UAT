import { NextResponse } from "next/server";

import { MOCK_AUTH_COOKIE_NAME } from "@/lib/auth-session";

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(MOCK_AUTH_COOKIE_NAME, "", {
    expires: new Date(0),
    path: "/",
    sameSite: "lax",
  });
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}

export async function GET(request: Request) {
  const nextPath = new URL(request.url).searchParams.get("next");
  const redirectUrl = new URL(
    typeof nextPath === "string" && nextPath.startsWith("/") ? nextPath : "/login",
    request.url,
  );
  const response = NextResponse.redirect(redirectUrl);
  clearSessionCookie(response);
  return response;
}
