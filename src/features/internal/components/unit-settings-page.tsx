"use client";

import * as React from "react";
import { Bell, RotateCcw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { AppPageIntro } from "@/components/composite/app-page-intro";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppCard } from "@/components/ui/app-card";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { InternalSettingRow } from "@/features/internal/components/internal-setting-row";
import { getInternalPageConfig, getInternalPagePath } from "@/features/internal/internal-workspace-config";
import { buildUnitSettingsStats } from "@/features/internal/internal-settings-metrics";
import {
  defaultUnitSettings,
  type UnitSettingsState,
} from "@/features/internal/unit-settings";
import { useUnitSettings } from "@/features/internal/use-unit-settings";

export function UnitSettingsPage() {
  const config = getInternalPageConfig("unit-organisasi", "pengaturan");
  const { settings: savedSettings, activeCount, setSettings: setSavedSettings } = useUnitSettings();
  const [draft, setDraft] = React.useState<UnitSettingsState>(savedSettings);
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    setDraft(savedSettings);
  }, [savedSettings]);

  if (!config) {
    return null;
  }

  const stats = buildUnitSettingsStats(draft, savedSettings, activeCount);

  return (
    <DashboardShell
      role="unit-organisasi"
      currentPath={getInternalPagePath("unit-organisasi", "pengaturan")}
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
              <AppButton
                variant="outline"
                onClick={() => setResetConfirmOpen(true)}
              >
                <RotateCcw className="size-4" />
                Reset Default
              </AppButton>
              <AppButton
                loading={false}
                onClick={() => {
                  setSavedSettings(draft);
                  toast.success("Pengaturan unit berhasil disimpan.");
                }}
              >
                Simpan Pengaturan
              </AppButton>
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <AppCard padding="lg" className="space-y-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                Preferensi Unit
              </p>
              <h2 className="text-2xl font-bold tracking-tight">Atur ritme kerja unit</h2>
            </div>

            <InternalSettingRow
              title="Mode antrean ringkas"
              description="Jika aktif, tabel data antrean dibuat lebih rapat agar lebih banyak baris terlihat."
              checked={draft.compactRows}
              onChange={(next) => setDraft((current) => ({ ...current, compactRows: next }))}
              icon={SlidersHorizontal}
            />
            <InternalSettingRow
              title="Refresh otomatis"
              description="Jika aktif, data antrean disegarkan otomatis selama sesi unit masih berjalan."
              checked={draft.autoRefresh}
              onChange={(next) => setDraft((current) => ({ ...current, autoRefresh: next }))}
              icon={Bell}
            />
            <InternalSettingRow
              title="Sorot eskalasi"
              description="Jika aktif, antrean hasil eskalasi diberi sorotan visual di workspace unit."
              checked={draft.highlightEscalation}
              onChange={(next) =>
                setDraft((current) => ({ ...current, highlightEscalation: next }))
              }
              icon={ShieldCheck}
            />
            <InternalSettingRow
              title="Buka catatan otomatis"
              description="Jika aktif, panel catatan langsung terbuka saat layanan dimulai."
              checked={draft.autoOpenNotes}
              onChange={(next) => setDraft((current) => ({ ...current, autoOpenNotes: next }))}
              icon={ShieldCheck}
            />
          </AppCard>

          <div className="space-y-6">
            <AppCard padding="lg" className="space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                  Dampak Pengaturan
                </p>
                <h2 className="text-xl font-bold tracking-tight">Apa yang ikut berubah</h2>
              </div>
              <div className="space-y-3">
                <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <SlidersHorizontal className="size-4 text-role-accent" />
                    Workspace antrean
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Tabel bisa lebih rapat dan antrean eskalasi bisa tampil lebih menonjol.
                  </p>
                </div>
                <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Bell className="size-4 text-role-accent" />
                    Notifikasi internal
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Refresh otomatis dan panel catatan mempercepat perpindahan antar antrean.
                  </p>
                </div>
                <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="size-4 text-role-accent" />
                    Audit trail
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Pengaturan hanya mengubah cara tampilan kerja unit, bukan permission atau status layanan.
                  </p>
                </div>
              </div>
            </AppCard>
          </div>
        </div>

        <AppConfirmDialog
          open={resetConfirmOpen}
          onOpenChange={setResetConfirmOpen}
          title="Kembalikan pengaturan unit?"
          description="Tindakan ini akan mengembalikan seluruh preferensi unit ke nilai bawaan."
          confirmLabel="Kembalikan Default"
          confirmVariant="destructive"
          onConfirm={() => {
            setDraft(defaultUnitSettings);
            setSavedSettings(defaultUnitSettings);
            toast.success("Pengaturan unit dikembalikan ke default.");
            setResetConfirmOpen(false);
          }}
        />
      </div>
    </DashboardShell>
  );
}
