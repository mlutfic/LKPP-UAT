"use client";

import {
  defaultLevel2Settings,
  LEVEL2_SETTINGS_STORAGE_KEY,
} from "@/features/internal/level-2-settings";
import { usePersistentInternalSettings } from "@/features/internal/use-persistent-internal-settings";

export function useLevel2Settings() {
  return usePersistentInternalSettings(
    LEVEL2_SETTINGS_STORAGE_KEY,
    defaultLevel2Settings,
  );
}
