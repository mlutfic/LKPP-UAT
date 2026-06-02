import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  isInternalRole,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import { getPublicEnv } from "@/lib/env";
import { resolveStaffPermissionsForRole } from "@/lib/internal-role-policy";
import { readAdminRolePermissionsSettings } from "@/lib/server/admin-role-permissions";
import {
  AdminActivityLogsError,
  readAdminActivityLogs,
} from "@/lib/server/admin-activity-logs";

async function readStaffSession() {
  const cookieStore = await cookies();
  const session = parseMockSessionCookieValue(
    cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value,
  );

  if (
    session?.variant !== "staff" ||
    !session.staffId ||
    !session.role ||
    !isInternalRole(session.role)
  ) {
    return null;
  }

  return {
    staffId: session.staffId,
    role: session.role,
  };
}

function resolveAppUrl(request: Request) {
  for (const headerName of ["origin", "referer"]) {
    const raw = String(request.headers.get(headerName) || "").trim();
    if (!raw) continue;

    try {
      return new URL(raw).origin;
    } catch {
      // Ignore malformed origin/referer.
    }
  }

  return getPublicEnv().appUrl;
}

export async function GET(request: Request) {
  try {
    const session = await readStaffSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Sesi staff tidak aktif." },
        { status: 401 },
      );
    }

    const settings = await readAdminRolePermissionsSettings();
    const permissions = resolveStaffPermissionsForRole(
      session.role,
      settings.settings.rolePermissions,
    );

    if (!permissions.canViewAudit) {
      return NextResponse.json(
        { ok: false, error: "Akses log aktivitas ditolak." },
        { status: 403 },
      );
    }

    const result = await readAdminActivityLogs({
      staffId: session.staffId,
      appUrl: resolveAppUrl(request),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status =
      error instanceof AdminActivityLogsError ? error.status : 500;

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal membaca log aktivitas.",
      },
      { status },
    );
  }
}
