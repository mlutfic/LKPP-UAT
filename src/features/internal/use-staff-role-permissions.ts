"use client";

import { useAuthSessionQuery } from "@/features/auth/hooks/use-auth-session-query";
import {
  getBaselineStaffPermissions,
  type InternalStaffRole,
} from "@/lib/internal-role-policy";

function shouldSkipRuntimePermissionSync() {
  return false;
}

export function useStaffRolePermissions(
  roleOverride?: InternalStaffRole,
  options?: { enabled?: boolean },
) {
  if (options?.enabled === false) {
    const role = roleOverride;
    return {
      role,
      isLoading: false,
      isError: false,
      error: null,
      data: undefined,
      fetchStatus: "idle" as const,
      status: "success" as const,
      permissions: role ? getBaselineStaffPermissions(role) : null,
      isRuntimeSyncing: false,
      hasRuntimeFallback: false,
    };
  }

  const loadRuntimeSession = options?.enabled ?? true;
  const sessionQuery = useAuthSessionQuery({ enabled: loadRuntimeSession });
  const session = sessionQuery.data?.session;
  const role = roleOverride ?? sessionQuery.data?.session?.role;
  const internalRole = role && role !== "user" ? role : undefined;
  const skipRuntimeSync = shouldSkipRuntimePermissionSync();
  const shouldPreferRuntimePermissions =
    Boolean(internalRole) && !skipRuntimeSync && loadRuntimeSession;
  const runtimePermissions =
    shouldPreferRuntimePermissions &&
    session?.variant === "staff" &&
    session.role === internalRole
      ? sessionQuery.data?.permissions ?? null
      : null;
  const hasRuntimePermissions = Boolean(runtimePermissions);
  const isServerRender = typeof window === "undefined";
  const isRuntimeSyncing =
    Boolean(internalRole) &&
    shouldPreferRuntimePermissions &&
    !hasRuntimePermissions &&
    (isServerRender ||
      sessionQuery.fetchStatus === "fetching" ||
      sessionQuery.isLoading);
  const hasRuntimeFallback =
    Boolean(internalRole) &&
    shouldPreferRuntimePermissions &&
    !isRuntimeSyncing &&
    !hasRuntimePermissions;
  const permissions = internalRole
    ? hasRuntimePermissions
      ? runtimePermissions
      : shouldPreferRuntimePermissions
        ? hasRuntimeFallback
          ? getBaselineStaffPermissions(internalRole)
          : null
        : getBaselineStaffPermissions(internalRole)
    : null;

  return {
    role: internalRole,
    data: runtimePermissions,
    error: sessionQuery.error,
    fetchStatus: sessionQuery.fetchStatus,
    isError: sessionQuery.isError,
    isLoading: sessionQuery.isLoading,
    isRuntimeSyncing,
    hasRuntimeFallback,
    permissions,
    status: sessionQuery.status,
  };
}
