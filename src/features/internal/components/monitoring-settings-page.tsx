"use client";

import * as React from "react";
import {
  Bell,
  LayoutList,
  LineChart,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { AppPageIntro } from "@/components/composite/app-page-intro";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppCard } from "@/components/ui/app-card";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { InternalSettingRow } from "@/features/internal/components/internal-setting-row";
import {
  buildMonitoringSettingsStats,
} from "@/features/internal/internal-settings-metrics";
import {
  getInternalPageConfig,
  getInternalPagePath,
} from "@/features/internal/internal-workspace-config";
import { type MonitoringRole } from "@/features/internal/monitoring-workspace-content";
import {
  getDefaultMonitoringSettings,
  type MonitoringSettingsState,
} from "@/features/internal/monitoring-settings";
import { buildDisabledMonitoringCapabilitiesSummary } from "@/features/internal/monitoring/workspace";
import { useMonitoringSettings } from "@/features/internal/use-monitoring-settings";
import { useStaffRolePermissions } from "@/features/internal/use-staff-role-permissions";

function getMonitoringSettingsRows(
  role: MonitoringRole,
  draft: MonitoringSettingsState,
  setDraft: React.Dispatch<React.SetStateAction<MonitoringSettingsState>>,
) {
  const isSupervisor = role === "supervisor-monitoring";

  return [
    {
      title: isSupervisor
        ? "Prioritaskan unit dan antrean kritis"
        : "Prioritaskan item follow-up publik",
      description: isSupervisor
        ? "Unit dan antrean dengan status Perlu Tinjau naik ke urutan atas pada monitoring dan ekspor."
        : "Item yang perlu klarifikasi atau update naik ke urutan atas pada monitoring dan ekspor.",
      checked: draft.prioritizeAttention,
      onChange: (value: boolean) =>
        setDraft((current) => ({ ...current, prioritizeAttention: value })),
      icon: ShieldCheck,
    },
    {
      title: "Gunakan tampilan yang lebih rapat",
      description:
        "Tabel ekspor dibuat lebih padat agar lebih banyak baris terlihat pada satu layar.",
      checked: draft.compactDensity,
      onChange: (value: boolean) =>
        setDraft((current) => ({ ...current, compactDensity: value })),
      icon: LayoutList,
    },
    {
      title: "Muat ulang data monitoring otomatis",
      description:
        "Saat sesi live aktif, data monitoring disegarkan berkala tanpa klik tombol refresh.",
      checked: draft.autoRefresh,
      onChange: (value: boolean) =>
        setDraft((current) => ({ ...current, autoRefresh: value })),
      icon: RefreshCcw,
    },
    {
      title: isSupervisor
        ? "Nyalakan alert saat bottleneck bertambah"
        : "Nyalakan alert saat follow-up bertambah",
      description: isSupervisor
        ? "Toast muncul saat unit kritis atau antrean prioritas baru masuk ke radar supervisor."
        : "Toast muncul saat item publik yang perlu klarifikasi atau update bertambah.",
      checked: draft.playAlerts,
      onChange: (value: boolean) =>
        setDraft((current) => ({ ...current, playAlerts: value })),
      icon: Bell,
    },
    {
      title: isSupervisor
        ? "Sertakan antrean selesai di paket data"
        : "Sertakan status selesai di paket data",
      description: isSupervisor
        ? "Jika dimatikan, ekspor fokus ke baris yang masih perlu tindakan atau pemantauan."
        : "Jika dimatikan, ekspor fokus ke item yang belum aman atau masih perlu follow-up.",
      checked: draft.includeCompletedRows,
      onChange: (value: boolean) =>
        setDraft((current) => ({ ...current, includeCompletedRows: value })),
      icon: SlidersHorizontal,
    },
    {
      title: isSupervisor
        ? "Tampilkan panel tren dan kualitas"
        : "Tampilkan panel tren dan ritme",
      description: isSupervisor
        ? "Panel ritme mingguan dan kualitas layanan tetap muncul di dashboard dan monitoring."
        : "Panel ritme layanan dan panel pelengkap tetap muncul di dashboard dan monitoring.",
      checked: draft.showTrendPanels,
      onChange: (value: boolean) =>
        setDraft((current) => ({ ...current, showTrendPanels: value })),
      icon: LineChart,
    },
  ];
}

function getMonitoringEffectsCopy(
  role: MonitoringRole,
  draft: MonitoringSettingsState,
) {
  const isSupervisor = role === "supervisor-monitoring";

  return [
    draft.prioritizeAttention
      ? isSupervisor
        ? "Unit dan antrean kritis selalu naik ke urutan atas."
        : "Item follow-up publik selalu naik ke urutan atas."
      : "Urutan data mengikuti hasil monitoring apa adanya.",
    draft.includeCompletedRows
      ? "Baris selesai tetap ikut masuk ke paket data."
      : "Paket data hanya fokus ke baris yang masih perlu perhatian.",
    draft.autoRefresh
      ? "Data live disegarkan otomatis saat sesi monitoring aktif."
      : "Refresh hanya berjalan saat tombol segarkan dipakai.",
    draft.showTrendPanels
      ? "Panel tren pelengkap tetap ditampilkan di workspace."
      : "Workspace dibuat lebih ringkas dengan panel tren pelengkap disembunyikan.",
  ];
}

export function MonitoringSettingsPage({ role }: { role: MonitoringRole }) {
  const config = getInternalPageConfig(role, "pengaturan");
  const {
    settings,
    setSettings,
    resetSettings,
  } = useMonitoringSettings(role);
  const permissionQuery = useStaffRolePermissions(role);
  const [draft, setDraft] = React.useState<MonitoringSettingsState>(settings);
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    setDraft(settings);
  }, [settings]);

  if (!config) {
    return null;
  }

  const defaults = getDefaultMonitoringSettings(role);
  const draftActiveCount = Object.values(draft).filter(Boolean).length;
  const stats = buildMonitoringSettingsStats(role, draft, settings, draftActiveCount);
  const settingRows = getMonitoringSettingsRows(role, draft, setDraft);
  const disabledCapabilitiesSummary = buildDisabledMonitoringCapabilitiesSummary(
    role,
    permissionQuery.permissions,
  );
  const effects = getMonitoringEffectsCopy(role, draft);
  const isSupervisor = role === "supervisor-monitoring";

  function handleSave() {
    setSettings(draft);
    toast.success(
      isSupervisor
        ? "Pengaturan supervisor berhasil disimpan."
        : "Pengaturan humas monitoring berhasil disimpan.",
    );
  }

  function handleReset() {
    setDraft(defaults);
    resetSettings();
    toast.success("Pengaturan monitoring dikembalikan ke default.");
    setResetConfirmOpen(false);
  }

  return (
    <DashboardShell
      role={role}
      currentPath={getInternalPagePath(role, "pengaturan")}
      title={config.title}
      subtitle={config.description}
    >
      <div className="space-y-8">
        <AppPageIntro
          eyebrow={config.heroEyebrow}
          title={config.heroTitle}
          description={config.heroDescription}
          actions={
            <>
              <AppButton variant="outline" onClick={() => setResetConfirmOpen(true)}>
                <RotateCcw className="size-4" />
                Reset Default
              </AppButton>
              <AppButton onClick={handleSave}>Simpan Pengaturan</AppButton>
            </>
          }
        />

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <AppStatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              description={stat.description}
              tone={stat.tone}
            />
          ))}
        </div>

        <div className="rounded-[24px] border border-border bg-surface-container-low px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Preferensi perangkat ini</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Pengaturan monitoring tersimpan di browser dan tidak mengubah akses role.
          </p>
        </div>

        {disabledCapabilitiesSummary ? (
          <div className="rounded-[24px] border border-border bg-surface-container-low px-5 py-4">
            <p className="text-sm font-semibold text-foreground">
              Sebagian fitur belum tersedia
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {disabledCapabilitiesSummary} belum aktif untuk role ini.
            </p>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <AppSectionHeader
              eyebrow={isSupervisor ? "Kontrol Supervisor" : "Kontrol Humas"}
              title={isSupervisor ? "Preferensi kerja supervisor" : "Preferensi kerja humas monitoring"}
              description={
                isSupervisor
                  ? "Pengaturan ini memengaruhi prioritas bottleneck, refresh live, alert, dan susunan paket data supervisor."
                  : "Pengaturan ini memengaruhi prioritas follow-up publik, refresh live, alert, dan susunan paket data humas."
              }
            />
            <div className="space-y-4">
              {settingRows.map((row) => (
                <InternalSettingRow
                  key={row.title}
                  title={row.title}
                  description={row.description}
                  checked={row.checked}
                  onChange={row.onChange}
                  icon={row.icon}
                />
              ))}
            </div>
          </div>

          <AppCard padding="lg" className="space-y-5">
            <AppSectionHeader
              eyebrow="Dampak"
              title={isSupervisor ? "Yang berubah di control room" : "Yang berubah di workspace humas"}
              description={
                isSupervisor
                  ? "Ringkasan ini membantu memastikan toggle yang dinyalakan memang sesuai ritme kerja supervisor."
                  : "Ringkasan ini membantu memastikan toggle yang dinyalakan memang sesuai ritme kerja humas."
              }
            />

            <div className="space-y-3">
              {effects.map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] bg-surface-container-low px-4 py-4 text-sm leading-6 text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </AppCard>
        </div>

        <AppConfirmDialog
          open={resetConfirmOpen}
          onOpenChange={setResetConfirmOpen}
          title="Kembalikan pengaturan monitoring?"
          description="Tindakan ini akan mengembalikan preferensi monitoring ke nilai bawaan."
          confirmLabel="Kembalikan Default"
          confirmVariant="destructive"
          onConfirm={handleReset}
        />
      </div>
    </DashboardShell>
  );
}
