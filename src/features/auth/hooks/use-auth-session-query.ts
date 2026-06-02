"use client";

import { useQuery } from "@tanstack/react-query";

import { readMockSession } from "@/lib/mock-auth";
import type { StaffPermissionSet } from "@/lib/internal-role-policy";

type SessionResponse = {
  ok: boolean;
  session: ReturnType<typeof readMockSession>;
  permissions: StaffPermissionSet | null;
  redirectTo: string | null;
};

async function fetchAuthSession(): Promise<SessionResponse> {
  const fallbackSession = readMockSession();
  if (typeof window === "undefined") {
    return {
      ok: true,
      session: fallbackSession,
      permissions: null,
      redirectTo: fallbackSession?.redirectTo ?? null,
    };
  }

  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Tidak dapat membaca sesi saat ini.");
    }

    return response.json();
  } catch {
    return {
      ok: true,
      session: fallbackSession,
      permissions: null,
      redirectTo: fallbackSession?.redirectTo ?? null,
    };
  }
}

export function useAuthSessionQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["auth-session"],
    enabled: options?.enabled ?? true,
    queryFn: fetchAuthSession,
    placeholderData: {
      ok: true,
      session: readMockSession(),
      permissions: null,
      redirectTo: readMockSession()?.redirectTo ?? null,
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}
