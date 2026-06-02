"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuthSessionQuery } from "@/features/auth/hooks/use-auth-session-query";
import {
  getAdminUnitCounters,
  type AdminUnitCounterItem,
} from "@/lib/api/admin-unit-counters";

type AdminUnitCounterPayload = {
  items: AdminUnitCounterItem[];
  generatedAt: string;
};

export function useAdminUnitCountersQuery() {
  const sessionQuery = useAuthSessionQuery();
  const session = sessionQuery.data?.session;
  const staffId = session?.staffId;
  const isHumasAdmin =
    session?.variant === "staff" &&
    session.role === "humas-admin" &&
    session.authMode === "live";

  const query = useQuery({
    queryKey: ["admin-unit-counters", staffId ?? "anonymous"],
    enabled: Boolean(staffId && isHumasAdmin),
    staleTime: 60_000,
    queryFn: async () => {
      const payload = await getAdminUnitCounters();
      return {
        items: Array.isArray(payload.items) ? payload.items : [],
        generatedAt:
          typeof payload.generatedAt === "string"
            ? payload.generatedAt
            : new Date().toISOString(),
      } satisfies AdminUnitCounterPayload;
    },
  });

  return {
    ...query,
    session,
    staffId,
    isHumasAdmin,
  };
}
