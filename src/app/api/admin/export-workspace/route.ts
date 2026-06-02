import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  isInternalRole,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import { getPublicEnv } from "@/lib/env";
import { resolveStaffPermissionsForRole } from "@/lib/internal-role-policy";
import {
  AdminExportWorkspaceError,
  readAdminExportWorkspace,
} from "@/lib/server/admin-export-workspace";
import { readAdminRolePermissionsSettings } from "@/lib/server/admin-role-permissions";

function normalizeDateQuery(value: string | null) {
  const normalized = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

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

    if (!permissions.canExportData) {
      return NextResponse.json(
        { ok: false, error: "Akses ekspor data ditolak." },
        { status: 403 },
      );
    }

    const requestUrl = new URL(request.url);
    const startDate = normalizeDateQuery(requestUrl.searchParams.get("startDate"));
    const endDate = normalizeDateQuery(requestUrl.searchParams.get("endDate"));

    if (!startDate || !endDate || startDate.localeCompare(endDate) > 0) {
      return NextResponse.json(
        { ok: false, error: "Rentang tanggal ekspor tidak valid." },
        { status: 400 },
      );
    }

    const result = await readAdminExportWorkspace({
      staffId: session.staffId,
      appUrl: resolveAppUrl(request),
      startDate,
      endDate,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status =
      error instanceof AdminExportWorkspaceError ? error.status : 500;

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat workspace ekspor admin.",
      },
      { status },
    );
  }
}
