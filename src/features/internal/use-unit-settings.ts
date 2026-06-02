"use client";

import {
  defaultUnitSettings,
  UNIT_SETTINGS_STORAGE_KEY,
} from "@/features/internal/unit-settings";
import { usePersistentInternalSettings } from "@/features/internal/use-persistent-internal-settings";

export function useUnitSettings() {
  return usePersistentInternalSettings(
    UNIT_SETTINGS_STORAGE_KEY,
    defaultUnitSettings,
  );
}
