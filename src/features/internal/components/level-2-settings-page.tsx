"use client";

import * as React from "react";
import { Bell, RotateCcw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { AppPageIntro } from "@/components/composite/app-page-intro";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppCard } from "@/components/ui/app-card";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { InternalSettingRow } from "@/features/internal/components/internal-setting-row";
import {
  defaultLevel2Settings,
  type Level2SettingsState,
} from "@/features/internal/level-2-settings";
import { buildDisabledLevel2CapabilitiesSummary } from "@/features/internal/level-2/workspace";
import {
  getInternalPageConfig,
  getInternalPagePath,
} from "@/features/internal/internal-workspace-config";
import { useLevel2Settings } from "@/features/internal/use-level-2-settings";
import { useStaffRolePermissions } from "@/features/internal/use-staff-role-permissions";

export function Level2SettingsPage() {
  const config = getInternalPageConfig("petugas-level-2", "pengaturan");
  const { settings, updateSetting, resetSettings } = useLevel2Settings();
  const permissionQuery = useStaffRolePermissions("petugas-level-2");
  const [draft, setDraft] = React.useState<Level2SettingsState>(settings);
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    setDraft(settings);
  }, [settings]);

  if (!config) {
    return null;
  }

  const disabledCapabilitiesSummary = buildDisabledLevel2CapabilitiesSummary(
    permissionQuery.permissions,
  );
  const settingRows = [
    {
      title: "Gunakan inbox yang lebih rapat",
      description: "Daftar dibuat lebih rapat.",
      checked: draft.compactInboxDensity,
      onChange: (value: boolean) =>
        setDraft((current) => ({
          ...current,
          compactInboxDensity: value,
        })),
      icon: SlidersHorizontal,
    },
    {
      title: "Sorot antrean hasil eskalasi",
      description: "Eskalasi tampil menonjol.",
      checked: draft.highlightEscalationQueue,
      onChange: (value: boolean) =>
        setDraft((current) => ({
          ...current,
          highlightEscalationQueue: value,
        })),
      icon: ShieldCheck,
    },
    {
      title: "Buka catatan tindak lanjut otomatis",
      description: "Catatan terbuka saat layanan dimulai.",
      checked: draft.autoOpenClosingNotes,
      onChange: (value: boolean) =>
        setDraft((current) => ({
          ...current,
          autoOpenClosingNotes: value,
        })),
      icon: ShieldCheck,
    },
    {
      title: "Nyalakan alert saat eskalasi baru masuk",
      description: "Notifikasi muncul saat eskalasi baru masuk.",
      checked: draft.playEscalationAlert,
      onChange: (value: boolean) =>
        setDraft((current) => ({
          ...current,
          playEscalationAlert: value,
        })),
      icon: Bell,
    },
  ];

  function handleSave() {
    updateSetting("compactInboxDensity", draft.compactInboxDensity);
    updateSetting(
      "highlightEscalationQueue",
      draft.highlightEscalationQueue,
    );
    updateSetting("autoOpenClosingNotes", draft.autoOpenClosingNotes);
    updateSetting("playEscalationAlert", draft.playEscalationAlert);
    toast.success("Pengaturan petugas level 2 berhasil disimpan.");
  }

  function handleReset() {
    setDraft(defaultLevel2Settings);
    resetSettings();
    toast.success("Pengaturan level 2 dikembalikan ke default.");
    setResetConfirmOpen(false);
  }

  return (
    <DashboardShell
      role="petugas-level-2"
      currentPath={getInternalPagePath("petugas-level-2", "pengaturan")}
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

        {disabledCapabilitiesSummary ? (
          <div className="rounded-[24px] border border-border bg-surface-container-low px-5 py-4">
            <p className="text-sm font-semibold text-foreground">
              Sebagian pengaturan belum tersedia
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {disabledCapabilitiesSummary} belum aktif untuk role ini.
            </p>
          </div>
        ) : null}

        <AppCard padding="lg" className="space-y-5">
          <AppSectionHeader
            eyebrow="Kontrol Inbox"
            title="Preferensi kerja level 2"
            description="Tampilkan hanya pengaturan yang benar-benar dipakai saat menangani eskalasi."
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
        </AppCard>

        <AppConfirmDialog
          open={resetConfirmOpen}
          onOpenChange={setResetConfirmOpen}
          title="Kembalikan pengaturan level 2?"
          description="Semua preferensi inbox level 2 kembali ke default."
          confirmLabel="Kembalikan Default"
          confirmVariant="destructive"
          onConfirm={handleReset}
        />
      </div>
    </DashboardShell>
  );
}
