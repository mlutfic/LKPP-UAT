"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuthSessionQuery } from "@/features/auth/hooks/use-auth-session-query";

export type UnitPicDirectoryItem = {
  id: string;
  name: string;
  loginName: string;
  role: string;
  roleLabel: string;
  active: boolean;
  assignedServiceCount: number;
  counterIds: string[];
  counterLabels: string[];
  unitId: string;
  unitName: string;
  mustChangePassword: boolean;
  scheduledToday: boolean;
  hasSchedule: boolean;
  todayShiftLabel: string | null;
};

type UnitPicDirectoryPayload = {
  unitId: string;
  items: UnitPicDirectoryItem[];
  generatedAt: string;
};

async function fetchUnitPicDirectory() {
  const response = await fetch("/api/internal/unit-pic", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<UnitPicDirectoryPayload> & {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Direktori PIC unit belum bisa dimuat.");
  }

  return {
    unitId: typeof payload.unitId === "string" ? payload.unitId : "",
    items: Array.isArray(payload.items) ? payload.items : [],
    generatedAt:
      typeof payload.generatedAt === "string"
        ? payload.generatedAt
        : new Date().toISOString(),
  } satisfies UnitPicDirectoryPayload;
}

export function useUnitPicDirectoryQuery() {
  const sessionQuery = useAuthSessionQuery();
  const session = sessionQuery.data?.session;
  const staffId = session?.staffId;
  const isAllowedRole =
    session?.variant === "staff" &&
    (session.role === "unit-organisasi" ||
      session.role === "supervisor-monitoring" ||
      session.role === "petugas-level-2");

  const query = useQuery({
    queryKey: ["unit-pic-directory", staffId],
    enabled: Boolean(staffId && isAllowedRole),
    staleTime: 60_000,
    queryFn: fetchUnitPicDirectory,
  });

  return {
    ...query,
    session,
    isAllowedRole,
  };
}
