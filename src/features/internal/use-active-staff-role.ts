"use client";

import { useAuthSessionQuery } from "@/features/auth/hooks/use-auth-session-query";
import { isInternalRole } from "@/lib/auth-session";
import type { InternalStaffRole } from "@/lib/internal-role-policy";

export function useActiveStaffRole(fallbackRole: InternalStaffRole) {
  const sessionQuery = useAuthSessionQuery();
  const session = sessionQuery.data?.session;
  const activeRole =
    session?.variant === "staff" && session.role && isInternalRole(session.role)
      ? session.role
      : fallbackRole;

  return {
    activeRole,
    session,
    sessionQuery,
  };
}
