import type { AppRole } from "@/design-system/roles";
import {
  type InternalStaffRole,
  getStaffHomeRoute,
} from "@/lib/internal-role-policy";

export const MOCK_AUTH_COOKIE_NAME = "lkpp-auth-mock";
export const MOCK_AUTH_SESSION_MAX_AGE = 60 * 60 * 8;

export type UnitCounterSessionEntry = {
  id: string;
  unitId: string;
  counterNumber: number;
  label: string;
  active: boolean;
};

export type MockSession = {
  authMode?: "mock" | "live";
  variant: "user" | "staff";
  email: string;
  displayName?: string;
  userId?: string;
  userProfileToken?: string;
  staffId?: string;
  unitId?: string;
  assignedCounters?: UnitCounterSessionEntry[];
  activeCounterId?: string;
  activeCounterNumber?: number;
  activeCounterLabel?: string;
  role?: AppRole;
  redirectTo: string;
  signedInAt: string;
};

export type InternalAuthRole = InternalStaffRole;

const staffRoleKeywords: Record<InternalAuthRole, string[]> = {
  resepsionis: ["resepsionis", "frontdesk", "lobi", "reception"],
  "unit-organisasi": ["unit", "organisasi", "direktorat"],
  "petugas-level-2": ["level2", "level-2", "petugas-level-2", "eskalasi", "lvl2"],
  "humas-monitoring": ["humas-monitoring", "humas.monitoring", "monitor-humas"],
  "supervisor-monitoring": ["supervisor-monitoring", "supervisor", "monitor"],
  "humas-admin": ["humas-admin", "humas.admin", "admin-humas", "admin"],
};

const staffRoleInferenceOrder: InternalAuthRole[] = [
  "humas-monitoring",
  "humas-admin",
  "supervisor-monitoring",
  "petugas-level-2",
  "resepsionis",
  "unit-organisasi",
];

export function isInternalRole(value: string | null | undefined): value is InternalAuthRole {
  return Boolean(
    value &&
      [
        "resepsionis",
        "unit-organisasi",
        "petugas-level-2",
        "supervisor-monitoring",
        "humas-monitoring",
        "humas-admin",
      ].includes(value),
  );
}

export function inferStaffRoleFromEmail(email: string): InternalAuthRole | undefined {
  const normalizedEmail = email.trim().toLowerCase();

  for (const role of staffRoleInferenceOrder) {
    const keywords = staffRoleKeywords[role];
    if (keywords.some((keyword) => normalizedEmail.includes(keyword))) {
      return role;
    }
  }

  return undefined;
}

export function getStaffRedirectPath(role: InternalAuthRole) {
  return getStaffHomeRoute(role);
}

export function getSessionRedirectPath(session: MockSession) {
  if (session.variant === "staff" && session.role && isInternalRole(session.role)) {
    return getStaffRedirectPath(session.role);
  }

  return "/dashboard";
}

function normalizeMockSessionPayload(parsed: Partial<MockSession>): MockSession | null {
  if (!parsed.variant || !parsed.email) {
    return null;
  }

  const normalizedAssignedCounters = Array.isArray(parsed.assignedCounters)
    ? parsed.assignedCounters
        .map((entry) => {
          const rawCounterNumber = (entry as { counterNumber?: unknown } | null | undefined)
            ?.counterNumber;
          const counterNumber =
            typeof rawCounterNumber === "number" && Number.isFinite(rawCounterNumber)
              ? Math.trunc(rawCounterNumber)
              : typeof rawCounterNumber === "string" && rawCounterNumber.trim()
                ? Math.trunc(Number(rawCounterNumber))
                : 0;
          const unitId = String(entry?.unitId || "")
            .trim()
            .toUpperCase();
          const id = String(entry?.id || "")
            .trim()
            .toUpperCase();

          if (!id || !unitId || counterNumber < 1) {
            return null;
          }

          return {
            id,
            unitId,
            counterNumber,
            label: String(entry?.label || "").trim() || `Loket ${counterNumber}`,
            active: entry?.active !== false,
          } satisfies UnitCounterSessionEntry;
        })
        .filter((entry): entry is UnitCounterSessionEntry => entry !== null)
        .sort((left, right) => left.counterNumber - right.counterNumber)
    : [];
  const normalizedActiveCounterId = String(parsed.activeCounterId || "")
    .trim()
    .toUpperCase();
  const matchedActiveCounter =
    normalizedAssignedCounters.find((entry) => entry.id === normalizedActiveCounterId) ||
    normalizedAssignedCounters.find((entry) =>
      typeof parsed.activeCounterNumber === "number" &&
      Number.isFinite(parsed.activeCounterNumber) &&
      entry.counterNumber === Math.trunc(parsed.activeCounterNumber),
    ) ||
    normalizedAssignedCounters.find((entry) => entry.active) ||
    normalizedAssignedCounters[0];

  const staffRedirectTo =
    parsed.variant === "staff" && parsed.role && isInternalRole(parsed.role)
      ? getStaffRedirectPath(parsed.role)
      : null;
  const redirectTo = staffRedirectTo || parsed.redirectTo || "/dashboard";

  return {
    authMode: parsed.authMode === "live" ? "live" : "mock",
    variant: parsed.variant,
    email: parsed.email,
    displayName:
      typeof parsed.displayName === "string" ? parsed.displayName : undefined,
    userId: typeof parsed.userId === "string" ? parsed.userId : undefined,
    userProfileToken:
      typeof parsed.userProfileToken === "string"
        ? parsed.userProfileToken
        : undefined,
    staffId: typeof parsed.staffId === "string" ? parsed.staffId : undefined,
    unitId: typeof parsed.unitId === "string" ? parsed.unitId : undefined,
    assignedCounters: normalizedAssignedCounters.length > 0 ? normalizedAssignedCounters : undefined,
    activeCounterId: matchedActiveCounter?.id,
    activeCounterNumber: matchedActiveCounter?.counterNumber,
    activeCounterLabel: matchedActiveCounter?.label,
    role: parsed.role,
    redirectTo,
    signedInAt: parsed.signedInAt || new Date(0).toISOString(),
  };
}

export function serializeMockSessionCookieValue(session: MockSession) {
  return encodeURIComponent(JSON.stringify(session));
}

export function parseMockSessionCookieValue(value: string | null | undefined): MockSession | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<MockSession>;
    return normalizeMockSessionPayload(parsed);
  } catch {
    return null;
  }
}

export function normalizeMockSession(session: Partial<MockSession>) {
  return normalizeMockSessionPayload(session);
}
