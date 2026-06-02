import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import {
  AdminRolePermissionsError,
  readAdminRolePermissionsSettings,
  updateAdminRolePermissionsSettings,
} from "@/lib/server/admin-role-permissions";

async function readStaffSession() {
  const cookieStore = await cookies();
  const session = parseMockSessionCookieValue(
    cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value,
  );

  if (session?.variant !== "staff" || !session.staffId) {
    return null;
  }

  const normalizedRole = String(session.role || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

  return {
    staffId: session.staffId,
    role: normalizedRole,
  };
}

export async function GET() {
  try {
    const session = await readStaffSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Sesi staff tidak aktif." },
        { status: 401 },
      );
    }

    const result = await readAdminRolePermissionsSettings();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status =
      error instanceof AdminRolePermissionsError ? error.status : 500;
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal membaca hak akses role.",
      },
      { status },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await readStaffSession();
    if (!session || session.role !== "humas-admin") {
      return NextResponse.json(
        { ok: false, error: "Akses perubahan hak akses role ditolak." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await updateAdminRolePermissionsSettings(body.rolePermissions);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status =
      error instanceof AdminRolePermissionsError ? error.status : 500;
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan hak akses role.",
      },
      { status },
    );
  }
}
