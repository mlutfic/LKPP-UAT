"use client";

import { CalendarClock, QrCode, UserRound } from "lucide-react";

import { AppPageIntro } from "@/components/composite/app-page-intro";
import { MobileProfileLogoutSection } from "@/components/composite/mobile-profile-logout-section";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";
import { STAFF_CANONICAL_ROUTES } from "@/lib/internal-role-policy";
import { readMockSession } from "@/lib/mock-auth";

import { useFrontdeskSettings } from "@/features/internal/use-frontdesk-settings";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-border/70 py-3 last:border-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function FrontdeskProfilePage() {
  const session = readMockSession();
  const { settings } = useFrontdeskSettings();

  return (
    <DashboardShell
      role="resepsionis"
      currentPath={STAFF_CANONICAL_ROUTES.resepsionis.profile}
      title="Profil Resepsionis"
      subtitle="Ringkasan akun, penugasan, dan preferensi frontdesk"
    >
      <div className="space-y-8">
        <AppPageIntro
          eyebrow="Profil Petugas"
          title="Profil operasional resepsionis"
          description="Lihat akun aktif, penugasan lobby, dan preferensi frontdesk yang sedang dipakai."
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <AppCard padding="lg" className="space-y-2">
            <AppCardTitle className="text-2xl">Identitas dan akses</AppCardTitle>
            <AppCardDescription>Dipakai untuk membaca identitas dan penugasan shift.</AppCardDescription>

            <div className="pt-2">
              <InfoRow
                label="Nama Tampilan"
                value={session?.displayName || "Resepsionis LKPP"}
              />
              <InfoRow
                label="Email Login"
                value={session?.email || "resepsionis@lkpp.go.id"}
              />
              <InfoRow
                label="Staff ID"
                value={session?.staffId || "Belum terbaca"}
              />
              <InfoRow
                label="Area Tugas"
                value="Lobby utama dan check-in tamu hari ini"
              />
            </div>
          </AppCard>

          <div className="space-y-6">
            <AppCard padding="lg" className="space-y-4">
              <AppCardTitle className="text-xl">Preferensi frontdesk</AppCardTitle>
              <div className="space-y-3">
                <InfoRow
                  label="Sorot antrean siap"
                  value={settings.highlightReadyQueue ? "Aktif" : "Nonaktif"}
                />
                <InfoRow
                  label="Suara panggilan unit"
                  value={settings.playUnitCallTone ? "Aktif" : "Nonaktif"}
                />
                <InfoRow
                  label="Scanner lobby"
                  value={settings.autoStartScanner ? "Auto-start" : "Manual"}
                />
                <InfoRow
                  label="Kepadatan tabel"
                  value={settings.compactQueueDensity ? "Rapat" : "Normal"}
                />
              </div>
            </AppCard>

            <div className="rounded-[24px] border border-border bg-surface-container-low px-5 py-4">
              <p className="text-sm font-semibold text-foreground">Batas peran</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Resepsionis fokus pada check-in dan alur lobby.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <AppCard padding="md" className="space-y-2">
                <UserRound className="size-4 text-role-accent" />
                <p className="text-sm font-semibold">Akun petugas</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  Dipakai untuk login frontdesk.
                </p>
              </AppCard>
              <AppCard padding="md" className="space-y-2">
                <CalendarClock className="size-4 text-role-accent" />
                <p className="text-sm font-semibold">Shift harian</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  Menunjukkan penugasan lobby hari ini.
                </p>
              </AppCard>
              <AppCard padding="md" className="space-y-2">
                <QrCode className="size-4 text-role-accent" />
                <p className="text-sm font-semibold">Scanner</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  Dipakai di check-in lobby dan walk-in.
                </p>
              </AppCard>
            </div>
          </div>
        </div>

        <MobileProfileLogoutSection description="Keluar dari sesi resepsionis pada perangkat ini saat pergantian petugas atau setelah shift selesai." />
      </div>
    </DashboardShell>
  );
}
