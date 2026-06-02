import { cookies } from "next/headers";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
  type UnitCounterSessionEntry,
} from "@/lib/auth-session";
import { getLegacyStaffDirectory } from "@/lib/server/local-auth-bridge";
import { listStaffAssignedCounters } from "@/lib/server/unit-counter-storage";

export type UnitOperationalSession = {
  staffId: string;
  unitId: string;
  assignedCounters: UnitCounterSessionEntry[];
  activeCounterId?: string;
  activeCounterNumber?: number;
  activeCounterLabel?: string;
};

function normalizeCounterEntries(
  entries: Array<{
    id: string;
    unitId: string;
    counterNumber: number;
    label: string;
    active: boolean;
  }>,
) {
  return entries
    .map((entry) => ({
      id: String(entry.id || "").trim().toUpperCase(),
      unitId: String(entry.unitId || "").trim().toUpperCase(),
      counterNumber: Number.isFinite(entry.counterNumber)
        ? Math.trunc(entry.counterNumber)
        : 0,
      label: String(entry.label || "").trim(),
      active: entry.active !== false,
    }))
    .filter((entry) => entry.id && entry.unitId && entry.counterNumber > 0)
    .sort((left, right) => left.counterNumber - right.counterNumber);
}

export async function readUnitOperationalSession() {
  const cookieStore = await cookies();
  const session = parseMockSessionCookieValue(
    cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value,
  );

  if (
    session?.variant !== "staff" ||
    session.authMode !== "live" ||
    !session.staffId ||
    session.role !== "unit-organisasi"
  ) {
    return null;
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

  const assignedCounters =
    session.assignedCounters && session.assignedCounters.length > 0
      ? normalizeCounterEntries(session.assignedCounters)
      : normalizeCounterEntries(
          await listStaffAssignedCounters(session.staffId).catch(() => []),
        );

  const preferredCounter =
    assignedCounters.find((entry) => entry.id === session.activeCounterId) ||
    assignedCounters.find((entry) =>
      typeof session.activeCounterNumber === "number" &&
      Number.isFinite(session.activeCounterNumber) &&
      entry.counterNumber === Math.trunc(session.activeCounterNumber),
    ) ||
    assignedCounters.find((entry) => entry.active) ||
    assignedCounters[0];

  return {
    staffId: session.staffId,
    unitId,
    assignedCounters,
    activeCounterId: preferredCounter?.id,
    activeCounterNumber: preferredCounter?.counterNumber,
    activeCounterLabel: preferredCounter?.label,
  } satisfies UnitOperationalSession;
}
