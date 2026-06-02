import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import { getLegacyStaffDirectory } from "@/lib/server/local-auth-bridge";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = parseMockSessionCookieValue(
      cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value,
    );

    const normalizedRole = String(session?.role || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");

    if (!session?.staffId || normalizedRole !== "humas-admin") {
      return NextResponse.json(
        { ok: false, error: "Akses ditolak." },
        { status: 403 },
      );
    }

    const items = await getLegacyStaffDirectory();
    return NextResponse.json({
      ok: true,
      items,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat direktori staff.",
      },
      { status: 500 },
    );
  }
}
