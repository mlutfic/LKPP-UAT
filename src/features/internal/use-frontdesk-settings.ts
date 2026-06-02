"use client";

import {
  defaultFrontdeskSettings,
  FRONTDESK_SETTINGS_STORAGE_KEY,
} from "@/features/internal/frontdesk-settings";
import { usePersistentInternalSettings } from "@/features/internal/use-persistent-internal-settings";

export function useFrontdeskSettings() {
  return usePersistentInternalSettings(
    FRONTDESK_SETTINGS_STORAGE_KEY,
    defaultFrontdeskSettings,
  );
}
