"use client";

import * as React from "react";

import {
  bookingUnitEntries,
  getBookingUnitEntryById,
} from "@/content/service-booking-content";
import type { MockSession } from "@/lib/auth-session";

const HUMAS_ADMIN_UNIT_SCOPE_KEY = "lkpp-humas-admin-unit-scope-v1";
const HUMAS_ADMIN_UNIT_SCOPE_EVENT = "lkpp-humas-admin-unit-scope-change";

function normalizeUnitId(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

function sanitizeSelectedUnitId(value: string | null | undefined) {
  const normalized = normalizeUnitId(value);
  return getBookingUnitEntryById(normalized) ? normalized : "";
}

function readStoredSelectedUnitId() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return sanitizeSelectedUnitId(
      window.localStorage.getItem(HUMAS_ADMIN_UNIT_SCOPE_KEY),
    );
  } catch {
    return "";
  }
}

function persistSelectedUnitId(unitId: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (unitId) {
      window.localStorage.setItem(HUMAS_ADMIN_UNIT_SCOPE_KEY, unitId);
    } else {
      window.localStorage.removeItem(HUMAS_ADMIN_UNIT_SCOPE_KEY);
    }
  } catch {
    // Ignore storage failures.
  }

  window.dispatchEvent(
    new CustomEvent(HUMAS_ADMIN_UNIT_SCOPE_EVENT, {
      detail: { unitId },
    }),
  );
}

export function useUnitWorkspaceScope(session: MockSession | null) {
  const isHumasAdmin =
    session?.variant === "staff" && session.role === "humas-admin";
  const [selectedUnitId, setSelectedUnitId] = React.useState(() =>
    readStoredSelectedUnitId(),
  );
  const [hasResolvedSelection, setHasResolvedSelection] = React.useState(
    !isHumasAdmin,
  );

  React.useEffect(() => {
    if (!isHumasAdmin) {
      setHasResolvedSelection(true);
      return;
    }

    setSelectedUnitId(readStoredSelectedUnitId());
    setHasResolvedSelection(true);

    const handleSelectionChange = (event: Event) => {
      const detail = (event as CustomEvent<{ unitId?: string }>).detail;
      setSelectedUnitId(sanitizeSelectedUnitId(detail?.unitId));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== HUMAS_ADMIN_UNIT_SCOPE_KEY) {
        return;
      }

      setSelectedUnitId(sanitizeSelectedUnitId(event.newValue));
    };

    window.addEventListener(
      HUMAS_ADMIN_UNIT_SCOPE_EVENT,
      handleSelectionChange as EventListener,
    );
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        HUMAS_ADMIN_UNIT_SCOPE_EVENT,
        handleSelectionChange as EventListener,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, [isHumasAdmin]);

  const updateSelectedUnitId = React.useCallback((nextUnitId: string) => {
    const normalized = sanitizeSelectedUnitId(nextUnitId);
    setSelectedUnitId(normalized);
    persistSelectedUnitId(normalized);
  }, []);

  const options = React.useMemo(
    () =>
      bookingUnitEntries.map((unit) => ({
        value: unit.id,
        label: `${unit.id} · ${unit.label}`,
        keywords: [unit.groupLabel, unit.description],
      })),
    [],
  );

  const effectiveUnitId = isHumasAdmin ? selectedUnitId : "";

  return {
    isHumasAdmin,
    hasResolvedSelection,
    selectedUnitId,
    effectiveUnitId,
    selectedUnitEntry: getBookingUnitEntryById(selectedUnitId),
    requiresSelection: isHumasAdmin && !selectedUnitId,
    options,
    setSelectedUnitId: updateSelectedUnitId,
  };
}
