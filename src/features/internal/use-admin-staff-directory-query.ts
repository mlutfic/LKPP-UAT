"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuthSessionQuery } from "@/features/auth/hooks/use-auth-session-query";

export type AdminStaffDirectoryItem = {
  id: string;
  name: string;
  loginName: string;
  role: string;
  active: boolean;
  assignedServiceCount: number;
  serviceIds: string[];
  counterIds: string[];
  counterLabels: string[];
  unitId: string;
  unitName: string;
  mustChangePassword: boolean;
};

type AdminStaffDirectoryPayload = {
  items: AdminStaffDirectoryItem[];
  generatedAt: string;
};

async function fetchAdminStaffDirectory() {
  const response = await fetch("/api/admin/staff-directory", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<AdminStaffDirectoryPayload> & {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Direktori staff belum bisa dimuat.");
  }

  return {
    items: Array.isArray(payload.items)
      ? payload.items
      : [],
    generatedAt:
      typeof payload.generatedAt === "string"
        ? payload.generatedAt
        : new Date().toISOString(),
  } satisfies AdminStaffDirectoryPayload;
}

export function useAdminStaffDirectoryQuery() {
  const sessionQuery = useAuthSessionQuery();
  const staffId = sessionQuery.data?.session?.staffId;
  const role = sessionQuery.data?.session?.role;
  const isHumasAdmin = role === "humas-admin";

  const query = useQuery({
    queryKey: ["admin-staff-directory", staffId],
    enabled: Boolean(staffId && isHumasAdmin),
    queryFn: fetchAdminStaffDirectory,
  });

  return {
    ...query,
    staffId,
    role,
    isHumasAdmin,
  };
}
