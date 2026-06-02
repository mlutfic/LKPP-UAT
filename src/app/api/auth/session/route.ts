import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  getSessionRedirectPath,
  isInternalRole,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import { resolveStaffPermissionsForRole } from "@/lib/internal-role-policy";
import { readAdminRolePermissionsSettings } from "@/lib/server/admin-role-permissions";
import { readUnitOperationalSession } from "@/lib/server/unit-operational-session";

export async function GET() {
  const cookieStore = await cookies();
  const parsedSession = parseMockSessionCookieValue(
    cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value,
  );
  const unitSession =
    parsedSession?.variant === "staff" &&
    parsedSession.authMode === "live" &&
    parsedSession.role === "unit-organisasi"
      ? await readUnitOperationalSession().catch(() => null)
      : null;
  const session =
    parsedSession && unitSession
      ? {
          ...parsedSession,
          unitId: unitSession.unitId,
          assignedCounters: unitSession.assignedCounters,
          activeCounterId: unitSession.activeCounterId,
          activeCounterNumber: unitSession.activeCounterNumber,
          activeCounterLabel: unitSession.activeCounterLabel,
        }
      : parsedSession;
  let permissions: ReturnType<typeof resolveStaffPermissionsForRole> | null = null;

  if (session?.variant === "staff" && session.role && isInternalRole(session.role)) {
    try {
      const settings = await readAdminRolePermissionsSettings();
      permissions = resolveStaffPermissionsForRole(
        session.role,
        settings.settings.rolePermissions,
      );
    } catch {
      permissions = null;
    }
  }

  return NextResponse.json({
    ok: true,
    session,
    permissions,
    redirectTo: session ? getSessionRedirectPath(session) : null,
  });
}
