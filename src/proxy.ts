import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  getSessionRedirectPath,
  isInternalRole,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import {
  getAllowedStaffPrefixes,
  resolveCanonicalStaffPath,
} from "@/lib/internal-role-policy";

const authOnlyPaths = ["/login", "/login/petugas", "/register"];
const userProtectedPrefixes = ["/dashboard", "/jadwal-saya", "/profil", "/pengaturan", "/layanan"];
const internalProtectedPrefixes = [
  "/lobby",
  "/offline-visitor",
  "/resepsionis",
  "/unit",
  "/unor",
  "/petugas-level-2",
  "/supervisor",
  "/humas-monitoring",
  "/humas-admin",
  "/admin",
];

function matchesPrefix(pathname: string, prefixes: ReadonlyArray<string>) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function getAllowedPrefixesForSession(session: ReturnType<typeof parseMockSessionCookieValue>) {
  if (session?.variant !== "staff") {
    return [];
  }

  if (session.role && isInternalRole(session.role)) {
    return getAllowedStaffPrefixes(session.role);
  }

  return [getSessionRedirectPath(session).replace("/dashboard", "")];
}

function buildUserLoginRedirectUrl(request: NextRequest) {
  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = "/login";
  nextUrl.search = "";

  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (requestedPath && requestedPath !== "/dashboard") {
    nextUrl.searchParams.set("next", requestedPath);
  }

  return nextUrl;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const forceAuthView = request.nextUrl.searchParams.get("force") === "1";
  const session = parseMockSessionCookieValue(
    request.cookies.get(MOCK_AUTH_COOKIE_NAME)?.value,
  );

  if (authOnlyPaths.includes(pathname) && session && !forceAuthView) {
    return NextResponse.redirect(new URL(getSessionRedirectPath(session), request.url));
  }

  if (!session && matchesPrefix(pathname, internalProtectedPrefixes)) {
    return NextResponse.redirect(new URL("/login/petugas", request.url));
  }

  if (!session && matchesPrefix(pathname, userProtectedPrefixes)) {
    return NextResponse.redirect(buildUserLoginRedirectUrl(request));
  }

  if (session?.variant === "user" && matchesPrefix(pathname, internalProtectedPrefixes)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (session?.variant === "staff" && matchesPrefix(pathname, userProtectedPrefixes)) {
    return NextResponse.redirect(new URL(getSessionRedirectPath(session), request.url));
  }

  if (
    session?.variant === "staff" &&
    matchesPrefix(pathname, internalProtectedPrefixes) &&
    !matchesPrefix(pathname, getAllowedPrefixesForSession(session))
  ) {
    return NextResponse.redirect(new URL(getSessionRedirectPath(session), request.url));
  }

  if (session?.variant === "staff") {
    const canonicalPath = resolveCanonicalStaffPath(pathname);
    if (canonicalPath) {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = canonicalPath;
      return NextResponse.redirect(nextUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/login/petugas",
    "/register",
    "/dashboard/:path*",
    "/jadwal-saya/:path*",
    "/profil/:path*",
    "/pengaturan/:path*",
    "/layanan/:path*",
    "/lobby/:path*",
    "/offline-visitor/:path*",
    "/resepsionis/:path*",
    "/unit/:path*",
    "/unor/:path*",
    "/petugas-level-2/:path*",
    "/supervisor/:path*",
    "/humas-monitoring/:path*",
    "/humas-admin/:path*",
    "/admin/:path*",
  ],
};
