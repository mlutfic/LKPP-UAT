import type { WorkspaceStat } from "@/features/internal/internal-workspace-config";
import type { FrontdeskSettingsState } from "@/features/internal/frontdesk-settings";
import type { Level2SettingsState } from "@/features/internal/level-2-settings";
import type { MonitoringSettingsState } from "@/features/internal/monitoring-settings";
import type { MonitoringRole } from "@/features/internal/monitoring-workspace-content";
import type { UnitSettingsState } from "@/features/internal/unit-settings";

export function buildFrontdeskSettingsStats(
  settings: FrontdeskSettingsState,
  activeCount: number,
): WorkspaceStat[] {
  return [
    {
      label: "Preset Frontdesk",
      value: "Aktif",
      description: "Mode operasional lobby sedang dipakai.",
      tone: "success",
    },
    {
      label: "Preferensi Aktif",
      value: String(activeCount),
      description: "Pengaturan yang sedang dinyalakan.",
      tone: "info",
    },
    {
      label: "Scanner",
      value: settings.autoStartScanner ? "Auto" : "Manual",
      description: "Perilaku awal check-in lobby.",
      tone: "role",
    },
    {
      label: "Kepadatan Tabel",
      value: settings.compactQueueDensity ? "Rapat" : "Normal",
      description: "Tampilan antrean saat operasional.",
      tone: "neutral",
    },
  ];
}

export function buildLevel2SettingsStats(
  draft: Level2SettingsState,
  savedSettings: Level2SettingsState,
  activeCount: number,
): WorkspaceStat[] {
  const dirty =
    draft.compactInboxDensity !== savedSettings.compactInboxDensity ||
    draft.highlightEscalationQueue !== savedSettings.highlightEscalationQueue ||
    draft.autoOpenClosingNotes !== savedSettings.autoOpenClosingNotes ||
    draft.playEscalationAlert !== savedSettings.playEscalationAlert;

  return [
    {
      label: "Preset Inbox",
      value: "Aktif",
      description: `${activeCount} preferensi aktif.`,
      tone: "success",
    },
    {
      label: "Notifikasi",
      value: draft.playEscalationAlert ? "Aktif" : "Nonaktif",
      description: "Alert eskalasi baru.",
      tone: "info",
    },
    {
      label: "Sorotan Eskalasi",
      value: draft.highlightEscalationQueue ? "On" : "Off",
      description: "Eskalasi ditonjolkan.",
      tone: "role",
    },
    {
      label: "Perlu Review",
      value: dirty ? "1" : "0",
      description: "Belum disimpan.",
      tone: dirty ? "warning" : "neutral",
    },
  ];
}

export function buildUnitSettingsStats(
  draft: UnitSettingsState,
  savedSettings: UnitSettingsState,
  activeCount: number,
): WorkspaceStat[] {
  const dirty =
    draft.compactRows !== savedSettings.compactRows ||
    draft.autoRefresh !== savedSettings.autoRefresh ||
    draft.highlightEscalation !== savedSettings.highlightEscalation ||
    draft.autoOpenNotes !== savedSettings.autoOpenNotes;

  return [
    {
      label: "Preset Unit",
      value: "Aktif",
      description: `${activeCount} preferensi kerja sedang digunakan.`,
      tone: "success",
    },
    {
      label: "Refresh Otomatis",
      value: draft.autoRefresh ? "Aktif" : "Manual",
      description: "Penyegaran antrean saat sesi kerja berjalan.",
      tone: "info",
    },
    {
      label: "Sorot Eskalasi",
      value: draft.highlightEscalation ? "On" : "Off",
      description: "Menonjolkan antrean hasil pindah layanan.",
      tone: "role",
    },
    {
      label: "Perlu Review",
      value: dirty ? "1" : "0",
      description: "Perubahan lokal yang belum disimpan.",
      tone: dirty ? "warning" : "neutral",
    },
  ];
}

export function buildMonitoringSettingsStats(
  role: MonitoringRole,
  draft: MonitoringSettingsState,
  savedSettings: MonitoringSettingsState,
  activeCount: number,
): WorkspaceStat[] {
  const dirty = Object.keys(draft).some(
    (key) =>
      draft[key as keyof MonitoringSettingsState] !==
      savedSettings[key as keyof MonitoringSettingsState],
  );
  const roleLabel =
    role === "supervisor-monitoring" ? "Supervisor" : "Humas";

  return [
    {
      label: `Preset ${roleLabel}`,
      value: "Aktif",
      description: `${activeCount} preferensi lokal sedang aktif.`,
      tone: "success",
    },
    {
      label: "Refresh Data",
      value: draft.autoRefresh ? "Auto" : "Manual",
      description: "Muat ulang data live saat sesi kerja berjalan.",
      tone: "info",
    },
    {
      label: "Tampilan",
      value: draft.compactDensity ? "Rapat" : "Standar",
      description:
        role === "supervisor-monitoring"
          ? "Kepadatan daftar monitoring dan ekspor."
          : "Kepadatan rekap komunikasi dan ekspor.",
      tone: "role",
    },
    {
      label: "Perlu Review",
      value: dirty ? "1" : "0",
      description: "Perubahan lokal yang belum disimpan.",
      tone: dirty ? "warning" : "neutral",
    },
  ];
}
