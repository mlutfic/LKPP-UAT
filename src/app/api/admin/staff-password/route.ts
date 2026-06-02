import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import { isStrongPassword } from "@/lib/password-policy";
import {
  clearStaffResetAccessState,
  fetchLegacyStaffById,
  patchLegacyStaffPassword,
  resolveLegacyStaffId,
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
        { ok: false, error: "Akses ganti password akun staff ditolak." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const loginName = normalizeLoginName(body.loginName);
    const newPassword = String(body.newPassword || "").trim();
    const staffId = await resolveLegacyStaffId(
      normalizeStaffId(body.staffId),
      loginName,
    );

    if (!staffId) {
      return NextResponse.json(
        { ok: false, error: "Akun staff belum ditemukan untuk ganti password." },
        { status: 404 },
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        { ok: false, error: "Password baru wajib diisi." },
        { status: 400 },
      );
    }

    if (!isStrongPassword(newPassword)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Password baru minimal 8 karakter serta mengandung huruf besar, huruf kecil, dan karakter khusus.",
        },
        { status: 400 },
      );
    }

    const staff = await fetchLegacyStaffById(staffId);
    if (!staff) {
      return NextResponse.json(
        { ok: false, error: "Akun staff tidak ditemukan." },
        { status: 404 },
      );
    }

    if (String(staff.pin_code || "").trim() === newPassword) {
      return NextResponse.json(
        {
          ok: false,
          error: "Password baru harus berbeda dari password sebelumnya.",
        },
        { status: 409 },
      );
    }

    const updatedStaff = await patchLegacyStaffPassword(staffId, newPassword);
    await clearStaffResetAccessState(staffId);

    return NextResponse.json({
      ok: true,
      staffId,
      loginName: normalizeLoginName(updatedStaff?.login_name || staff.login_name || loginName),
      mustChangePassword: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan password akun staff.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "Metode tidak diizinkan. Gunakan PUT untuk memperbarui password staff.",
    },
    { status: 405, headers: { Allow: "PUT" } },
  );
}
