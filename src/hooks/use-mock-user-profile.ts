"use client";

import * as React from "react";

import { updateUserProfile } from "@/lib/api/auth";
import { readMockSession } from "@/lib/mock-auth";
import {
  getMockUserProfile,
  getMockUserProfileCompletionStatus,
  MOCK_USER_PROFILE_EVENT,
  MOCK_USER_PROFILE_STORAGE_KEY,
  persistMockUserProfile,
  syncMockUserProfileFromLiveUser,
  type MockUserProfile,
} from "@/lib/mock-user-profile";

let liveUserProfileSyncVersion = 0;

type LiveProfileSyncStatus = "idle" | "loading" | "success" | "error";

function isLiveUserProfileSession(session: ReturnType<typeof readMockSession>) {
  return Boolean(
    session &&
      session.variant === "user" &&
      session.authMode === "live" &&
      session.userId &&
      session.userProfileToken,
  );
}

export function useMockUserProfile(enabled = true) {
  const session =
    enabled && typeof window !== "undefined" ? readMockSession() : null;
  const isLiveSession = isLiveUserProfileSession(session);
  const [profile, setProfile] = React.useState<MockUserProfile | null>(null);
  const [liveProfileSyncStatus, setLiveProfileSyncStatus] =
    React.useState<LiveProfileSyncStatus>(
      enabled && isLiveSession ? "loading" : "idle",
    );

  React.useEffect(() => {
    setLiveProfileSyncStatus(enabled && isLiveSession ? "loading" : "idle");
  }, [enabled, isLiveSession]);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    const syncProfile = () => {
      setProfile(getMockUserProfile());
    };

    syncProfile();

    const handleStorage = (event: StorageEvent) => {
      if (
        !event.key ||
        event.key === MOCK_USER_PROFILE_STORAGE_KEY
      ) {
        syncProfile();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(MOCK_USER_PROFILE_EVENT, syncProfile);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(MOCK_USER_PROFILE_EVENT, syncProfile);
    };
  }, [enabled]);

  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    if (!isLiveSession) {
      return;
    }

    let cancelled = false;
    const syncVersion = liveUserProfileSyncVersion;
    setLiveProfileSyncStatus("loading");

    void (async () => {
      try {
        const response = await fetch("/api/auth/user-profile", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          user?: unknown;
        };

        if (!response.ok || payload.ok === false || cancelled) {
          if (!cancelled && syncVersion === liveUserProfileSyncVersion) {
            setLiveProfileSyncStatus("error");
          }
          return;
        }

        const syncedProfile = syncMockUserProfileFromLiveUser(payload.user, {
          persist: false,
        });
        if (
          !cancelled &&
          syncVersion === liveUserProfileSyncVersion &&
          syncedProfile
        ) {
          persistMockUserProfile(syncedProfile);
          setProfile(syncedProfile);
          setLiveProfileSyncStatus("success");
        }
      } catch {
        if (!cancelled && syncVersion === liveUserProfileSyncVersion) {
          setLiveProfileSyncStatus("error");
        }
        // Keep local profile fallback when live sync is unavailable.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, isLiveSession]);

  const updateProfile = React.useCallback(
    async (nextProfile: MockUserProfile) => {
      const session = readMockSession();
      if (
        enabled &&
        session?.variant === "user" &&
        session.authMode === "live" &&
        session.userId
      ) {
        liveUserProfileSyncVersion += 1;
        const result = await updateUserProfile({
          name: nextProfile.name,
          phone: nextProfile.phone,
          asalInstansi: nextProfile.asalInstansi,
          namaInstansi: nextProfile.namaInstansi,
          nik: nextProfile.nik,
          provinsi: nextProfile.provinsi,
          kabupatenKota: nextProfile.kabupatenKota,
        });
        const savedProfile: MockUserProfile = {
          ...nextProfile,
          name: nextProfile.name.trim(),
          phone: nextProfile.phone.trim(),
          asalInstansi: nextProfile.asalInstansi.trim(),
          namaInstansi: nextProfile.namaInstansi.trim(),
          nik: nextProfile.nik.replace(/\D/g, "").slice(0, 16),
          provinsi: nextProfile.provinsi.trim(),
          kabupatenKota: nextProfile.kabupatenKota.trim(),
        };
        const syncedProfile =
          syncMockUserProfileFromLiveUser(
            {
              ...savedProfile,
              ...(result.user as Record<string, unknown> | null | undefined),
            },
            { persist: false },
          ) ?? savedProfile;
        const nextLocalProfile = getMockUserProfileCompletionStatus(syncedProfile).isComplete
          ? syncedProfile
          : savedProfile;
        persistMockUserProfile(nextLocalProfile);
        setProfile(nextLocalProfile);
        setLiveProfileSyncStatus("success");
        return;
      }

      persistMockUserProfile(nextProfile);
      setProfile(nextProfile);
    },
    [enabled],
  );

  const completionStatus = React.useMemo(
    () =>
      profile
        ? getMockUserProfileCompletionStatus(profile)
        : { isComplete: false, missingLabels: [] as string[] },
    [profile],
  );
  const isLiveProfileSyncPending =
    enabled && isLiveSession && liveProfileSyncStatus === "loading";
  const hasResolvedProfileCompletion =
    enabled &&
    (!isLiveSession ||
      liveProfileSyncStatus === "success" ||
      (liveProfileSyncStatus === "error" && completionStatus.isComplete));

  return {
    profile,
    updateProfile,
    completionStatus,
    liveProfileSyncStatus,
    isLiveProfileSyncPending,
    hasResolvedProfileCompletion,
  };
}
