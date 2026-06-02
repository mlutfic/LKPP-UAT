import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import {
  getLegacyStaffDirectory,
  getLegacyUnitStaffDirectory,
} from "@/lib/server/local-auth-bridge";

const ALLOWED_ROLES = new Set([
  "unit-organisasi",
  "supervisor-monitoring",
  "petugas-level-2",
]);

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = parseMockSessionCookieValue(
      cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value,
    );

    if (
      session?.variant !== "staff" ||
      !session.staffId ||
      !session.role ||
      !ALLOWED_ROLES.has(session.role)
    ) {
      return NextResponse.json(
        { ok: false, error: "Akses direktori PIC ditolak." },
        { status: 403 },
      );
    }

    let unitId = String(session.unitId || "")
      .trim()
      .toUpperCase();

    if (!unitId) {
      const directory = await getLegacyStaffDirectory();
      unitId =
        directory.find((item) => item.id === session.staffId)?.unitId
          ?.trim()
          .toUpperCase() || "";
    }

    if (!unitId) {
      return NextResponse.json(
        { ok: false, error: "Unit aktif akun ini belum terbaca." },
        { status: 400 },
      );
    }

    const items = await getLegacyUnitStaffDirectory(unitId);

    return NextResponse.json({
      ok: true,
      unitId,
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
            : "Gagal memuat direktori PIC unit.",
      },
      { status: 500 },
    );
  }
}
