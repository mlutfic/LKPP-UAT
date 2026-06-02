"use client";

import { type MonitoringRole } from "@/features/internal/monitoring-workspace-content";
import {
  getDefaultMonitoringSettings,
  MONITORING_SETTINGS_STORAGE_KEYS,
} from "@/features/internal/monitoring-settings";
import { usePersistentInternalSettings } from "@/features/internal/use-persistent-internal-settings";

export function useMonitoringSettings(role: MonitoringRole) {
  return usePersistentInternalSettings(
    MONITORING_SETTINGS_STORAGE_KEYS[role],
    getDefaultMonitoringSettings(role),
  );
}
