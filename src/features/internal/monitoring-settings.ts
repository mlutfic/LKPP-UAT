import type { MonitoringRole } from "@/features/internal/monitoring-workspace-content";

export type MonitoringSettingsState = {
  prioritizeAttention: boolean;
  compactDensity: boolean;
  autoRefresh: boolean;
  playAlerts: boolean;
  includeCompletedRows: boolean;
  showTrendPanels: boolean;
};

export const defaultSupervisorMonitoringSettings: MonitoringSettingsState = {
  prioritizeAttention: true,
  compactDensity: false,
  autoRefresh: true,
  playAlerts: true,
  includeCompletedRows: true,
  showTrendPanels: true,
};

export const defaultHumasMonitoringSettings: MonitoringSettingsState = {
  prioritizeAttention: true,
  compactDensity: true,
  autoRefresh: true,
  playAlerts: true,
  includeCompletedRows: true,
  showTrendPanels: true,
};

export const MONITORING_SETTINGS_STORAGE_KEYS: Record<MonitoringRole, string> = {
  "supervisor-monitoring": "lkpp-supervisor-monitoring-settings",
  "humas-monitoring": "lkpp-humas-monitoring-settings",
  "humas-admin": "lkpp-humas-admin-monitoring-settings",
};

export function getDefaultMonitoringSettings(role: MonitoringRole) {
  return role === "supervisor-monitoring"
    ? defaultSupervisorMonitoringSettings
    : defaultHumasMonitoringSettings;
}
