"use client";

import * as React from "react";
import { Bell, QrCode, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { AppPageIntro } from "@/components/composite/app-page-intro";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import {
  AppCard,
  AppCardDescription,
  AppCardTitle,
} from "@/components/ui/app-card";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { InternalSettingRow } from "@/features/internal/components/internal-setting-row";
import { buildFrontdeskSettingsStats } from "@/features/internal/internal-settings-metrics";
import { useFrontdeskSettings } from "@/features/internal/use-frontdesk-settings";
import { STAFF_CANONICAL_ROUTES } from "@/lib/internal-role-policy";

export function FrontdeskSettingsPage() {
  const { settings, activeCount, updateSetting } = useFrontdeskSettings();
  const stats = buildFrontdeskSettingsStats(settings, activeCount);

  function handleSave() {
    toast.success("Pengaturan resepsionis disimpan.");
  }

  return (
    <DashboardShell
      role="resepsionis"
      currentPath={STAFF_CANONICAL_ROUTES.resepsionis.settings}
      title="Pengaturan Resepsionis"
      subtitle="Atur preferensi operasional frontdesk"
    >
      <div className="space-y-8">
        <AppPageIntro
          eyebrow="Preferensi Frontdesk"
          title="Pengaturan operasional resepsionis"
          description="Atur tampilan check-in, notifikasi panggilan unit, dan perilaku scanner lobby."
          actions={
            <AppButton onClick={handleSave}>Simpan Pengaturan</AppButton>
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <InternalSettingRow
              title="Sorot antrean yang siap dipanggil unit"
              description="Jika aktif, antrean berstatus siap dipanggil akan tampil lebih menonjol di dashboard resepsionis."
              checked={settings.highlightReadyQueue}
              onChange={(value) => updateSetting("highlightReadyQueue", value)}
              icon={SlidersHorizontal}
            />
            <InternalSettingRow
              title="Bunyikan notifikasi saat unit mulai memanggil"
              description="Jika aktif, suara notifikasi diputar saat unit mulai memanggil antrean yang sudah hadir."
              checked={settings.playUnitCallTone}
              onChange={(value) => updateSetting("playUnitCallTone", value)}
              icon={Bell}
            />
            <InternalSettingRow
              title="Buka scanner kamera otomatis"
              description="Jika aktif, kamera langsung dicoba menyala saat halaman check-in lobby dibuka."
              checked={settings.autoStartScanner}
              onChange={(value) => updateSetting("autoStartScanner", value)}
              icon={QrCode}
            />
            <InternalSettingRow
              title="Gunakan tabel antrean lebih rapat"
              description="Jika aktif, tinggi baris tabel antrean dipadatkan agar lebih banyak data terlihat sekaligus."
              checked={settings.compactQueueDensity}
              onChange={(value) => updateSetting("compactQueueDensity", value)}
              icon={ShieldCheck}
            />
          </div>

          <AppCard padding="lg" className="space-y-5">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Catatan
              </p>
              <AppCardTitle className="text-2xl">Yang berubah di halaman resepsionis</AppCardTitle>
              <AppCardDescription>
                Pengaturan ini hanya mengubah tampilan dan respons halaman frontdesk.
              </AppCardDescription>
            </div>

            <div className="rounded-[24px] border border-border bg-surface-container-low px-5 py-4">
              <p className="text-sm font-semibold text-foreground">Fokus operasional</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Resepsionis tetap fokus pada check-in, walk-in, dan riwayat lobby.
              </p>
            </div>
          </AppCard>
        </div>
      </div>
    </DashboardShell>
  );
}
