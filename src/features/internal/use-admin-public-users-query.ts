"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuthSessionQuery } from "@/features/auth/hooks/use-auth-session-query";
import { getAdminPublicUsers } from "@/lib/api/admin-public-users";

export function useAdminPublicUsersQuery() {
  const sessionQuery = useAuthSessionQuery();
  const staffId = sessionQuery.data?.session?.staffId;
  const role = sessionQuery.data?.session?.role;
  const isHumasAdmin = role === "humas-admin";

  const query = useQuery({
    queryKey: ["admin-public-users", staffId],
    enabled: Boolean(staffId && isHumasAdmin),
    queryFn: getAdminPublicUsers,
  });

  return {
    ...query,
    staffId,
    role,
    isHumasAdmin,
  };
}
