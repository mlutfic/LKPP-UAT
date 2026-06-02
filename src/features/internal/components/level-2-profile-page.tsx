"use client";

import * as React from "react";
import { Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppPageIntro } from "@/components/composite/app-page-intro";
import { MobileProfileLogoutSection } from "@/components/composite/mobile-profile-logout-section";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { getCanonicalInternalAccountByRole } from "@/features/internal/internal-canonical-staff-accounts";
import { buildDisabledLevel2CapabilitiesSummary } from "@/features/internal/level-2/workspace";
import {
  getInternalPageConfig,
  getInternalPagePath,
} from "@/features/internal/internal-workspace-config";
import { useLiveStaffAppointments } from "@/features/internal/use-live-staff-appointments";
import { useStaffRolePermissions } from "@/features/internal/use-staff-role-permissions";
import { useHydrated } from "@/hooks/use-hydrated";
import { getUnitWorkspaceIdentity } from "@/features/internal/unit-organisasi-content";

export function Level2ProfilePage() {
  const router = useRouter();
  const config = getInternalPageConfig("petugas-level-2", "profil");
  const hydrated = useHydrated();
  const live = useLiveStaffAppointments();
  const permissionQuery = useStaffRolePermissions("petugas-level-2");

  const identity = React.useMemo(
    () => getUnitWorkspaceIdentity(live.session, live.appointments),
    [live.appointments, live.session],
  );
  const canonicalAccount = getCanonicalInternalAccountByRole("petugas-level-2");
  const disabledCapabilitiesSummary = buildDisabledLevel2CapabilitiesSummary(
    permissionQuery.permissions,
  );
  const isLivePending = live.isLiveSession && live.appointments === null && !live.isError;
  const visibleServices = identity.unitServices;

  if (!config) {
    return null;
  }

  if (!hydrated || isLivePending) {
    return (
      <DashboardShell
        role="petugas-level-2"
        currentPath={getInternalPagePath("petugas-level-2", "profil")}
        title={config.title}
        subtitle={config.description}
      >
        <div className="rounded-[24px] border border-border bg-surface-container-low px-5 py-6 text-sm text-muted-foreground">
          Profil petugas level 2 sedang dimuat.
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role="petugas-level-2"
      currentPath={getInternalPagePath("petugas-level-2", "profil")}
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
                onClick={() => router.push(getInternalPagePath("petugas-level-2", "inbox-eskalasi"))}
              >
                Buka inbox
              </AppButton>
              <AppButton
                onClick={() => router.push(getInternalPagePath("petugas-level-2", "pengaturan"))}
              >
                {config.heroPrimaryAction}
              </AppButton>
            </>
          }
        />

        {disabledCapabilitiesSummary ? (
          <div className="rounded-[24px] border border-border bg-surface-container-low px-5 py-4">
            <p className="text-sm font-semibold text-foreground">
              Sebagian kemampuan belum tersedia
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {disabledCapabilitiesSummary} belum aktif untuk role ini.
            </p>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <AppCard padding="lg" className="space-y-5">
            <AppSectionHeader
              eyebrow="Identitas Petugas"
              title={identity.profileName || canonicalAccount?.displayName || "Petugas Level 2"}
              description="Informasi inti akun yang sedang dipakai."
            />
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  label: "Nama Tampilan",
                  value:
                    identity.profileName ||
                    canonicalAccount?.displayName ||
                    "Petugas Level 2",
                  icon: UserRound,
                },
                {
                  label: "Email Login",
                  value: identity.profileEmail || canonicalAccount?.loginName || "-",
                  icon: Mail,
                },
                {
                  label: "Unit Penugasan",
                  value: identity.unitId || canonicalAccount?.unitId || "-",
                  description: identity.unitEntry?.label || canonicalAccount?.unitLabel || "-",
                  icon: UserRound,
                },
                {
                  label: "Status Sesi",
                  value: live.isLiveSession ? "Live session" : "Fallback lokal",
                  description: live.isLiveSession
                    ? "Data akun dan inbox dibaca dari sesi aktif."
                    : "Mode cadangan dipakai sementara.",
                  icon: UserRound,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="rounded-[24px] bg-surface-container-low px-4 py-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Icon className="size-4 text-role-accent" />
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-bold tracking-tight">{item.value}</p>
                    {item.description ? (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </AppCard>

          <AppCard padding="lg" className="space-y-5">
            <AppSectionHeader
              eyebrow="Cakupan Layanan"
              title={
                identity.unitId
                  ? `Layanan ${identity.unitId} yang terbaca`
                  : "Layanan unit yang terbaca"
              }
              description="Semua layanan pada unit aktif ini ditampilkan sebagai cakupan akun level 2 yang bersangkutan."
            />
            <div className="space-y-3">
              {visibleServices.length ? (
                visibleServices.map((service) => (
                  <div
                    key={service.id}
                    className="rounded-[24px] bg-surface-container-low px-4 py-4"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {service.id}
                    </p>
                    <h3 className="mt-2 text-base font-semibold tracking-tight">
                      {service.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {service.description}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-surface-container-low px-4 py-8 text-center">
                  <p className="text-sm font-semibold">
                    Belum ada layanan unit yang terbaca
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Cek kembali unit aktif sesi petugas atau katalog layanan unit terkait.
                  </p>
                </div>
              )}
            </div>
          </AppCard>
        </div>

        <MobileProfileLogoutSection description="Keluar dari sesi petugas level 2 pada perangkat ini setelah penanganan eskalasi selesai." />
      </div>
    </DashboardShell>
  );
}
