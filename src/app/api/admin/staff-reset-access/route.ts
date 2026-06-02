import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import {
  fetchLegacyStaffById,
  resolveLegacyStaffId,
  setStaffResetAccessState,
} from "@/lib/server/staff-reset-access";

function normalizeLoginName(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStaffId(value: unknown) {
  return String(value || "").trim();
}

export async function PUT(request: Request) {
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
        { ok: false, error: "Akses sinkron reset akses ditolak." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const loginName = normalizeLoginName(body.loginName);
    const requestPasswordReset = body.requestPasswordReset === true;
    const staffId = await resolveLegacyStaffId(
      normalizeStaffId(body.staffId),
      loginName,
    );

    if (!staffId) {
      return NextResponse.json(
        { ok: false, error: "Akun staff belum ditemukan untuk sinkron reset akses." },
        { status: 404 },
      );
    }

    const staff = await fetchLegacyStaffById(staffId);
    if (!staff) {
      return NextResponse.json(
        { ok: false, error: "Akun staff tidak ditemukan." },
        { status: 404 },
      );
    }

    await setStaffResetAccessState({
      staffId,
      loginName: loginName || String(staff.login_name || ""),
      requestedBy: session.staffId,
      enabled: requestPasswordReset,
    });

    return NextResponse.json({
      ok: true,
      staffId,
      loginName: normalizeLoginName(staff.login_name || loginName),
      mustChangePassword: requestPasswordReset,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyinkronkan reset akses akun staff.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "Metode tidak diizinkan. Gunakan PUT untuk sinkron reset akses staff.",
    },
    { status: 405, headers: { Allow: "PUT" } },
  );
}
