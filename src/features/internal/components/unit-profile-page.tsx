"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";

import { AppPageIntro } from "@/components/composite/app-page-intro";
import { MobileProfileLogoutSection } from "@/components/composite/mobile-profile-logout-section";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppFormField } from "@/components/ui/app-form-field";
import { AppNotice } from "@/components/ui/app-notice";
import { AppSelect } from "@/components/ui/app-select";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { getInternalPageConfig, getInternalPagePath } from "@/features/internal/internal-workspace-config";
import { useUnitPicDirectoryQuery } from "@/features/internal/use-unit-pic-directory-query";
import { useLiveStaffAppointments } from "@/features/internal/use-live-staff-appointments";
import { getUnitWorkspaceIdentity } from "@/features/internal/unit-organisasi-content";
import { normalizeBookingRuntimeData } from "@/features/services/runtime-data";
import { persistMockSession } from "@/lib/mock-auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function asBoolean(value: unknown) {
  return Boolean(value);
}

type StatTone = "role" | "info" | "warning" | "success" | "danger" | "neutral";

function resolveUnitStatusSummary({
  onBreak,
  serviceCount,
  hasFrozenQuota,
  dailyQuota,
}: {
  onBreak: boolean;
  serviceCount: number;
  hasFrozenQuota: boolean;
  dailyQuota: number | null;
}) {
  if (onBreak) {
    return {
      value: "Istirahat",
      description: "Unit sedang menutup antrean sementara dari workspace unit.",
      tone: "warning" as StatTone,
    };
  }

  if (serviceCount <= 0) {
    return {
      value: "Perlu Cek",
      description: "Belum ada layanan aktif yang terhubung ke unit ini.",
      tone: "warning" as StatTone,
    };
  }

  if (!hasFrozenQuota) {
    return {
      value: "Perlu Setel",
      description: "Kapasitas unit belum dibekukan di Humas Admin.",
      tone: "warning" as StatTone,
    };
  }

  if ((dailyQuota ?? 0) <= 0) {
    return {
      value: "Nonaktif",
      description: "Kapasitas harian unit saat ini masih 0 slot.",
      tone: "danger" as StatTone,
    };
  }

  return {
    value: "Aktif",
    description: "Unit tersedia untuk layanan.",
    tone: "success" as StatTone,
  };
}

export function UnitProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const config = getInternalPageConfig("unit-organisasi", "profil");
  const live = useLiveStaffAppointments();
  const picDirectoryQuery = useUnitPicDirectoryQuery();
  const [picDialogOpen, setPicDialogOpen] = React.useState(false);
  const identity = getUnitWorkspaceIdentity(live.session, live.appointments);
  const runtimeData = React.useMemo(
    () => normalizeBookingRuntimeData(live.data),
    [live.data],
  );
  const unitId = identity.unitId;
  const runtimeServices = unitId
    ? (runtimeData?.services ?? []).filter(
        (service) => service.unorId === unitId && service.enabled,
      )
    : [];
  const unitConfig = unitId
    ? runtimeData?.unorConfigs.find((entry) => entry.unorId === unitId) ?? null
    : null;
  const currentStaff =
    live.data && Array.isArray(live.data.staff)
      ? live.data.staff.find((entry) => isRecord(entry)) ?? null
      : null;
  const onBreak = isRecord(currentStaff) ? asBoolean(currentStaff.onBreak) : false;
  const serviceCount = runtimeServices.length || identity.unitServices.length;
  const hasAnySchedule =
    picDirectoryQuery.data?.items.some((item) => item.hasSchedule) ?? false;
  const activePicCount =
    picDirectoryQuery.data?.items.filter((item) => item.active).length ?? 0;
  const activeScheduledPicCount =
    picDirectoryQuery.data?.items.filter(
      (item) => item.active && item.scheduledToday,
    ).length ?? 0;
  const picValue = picDirectoryQuery.isError
    ? "-"
    : picDirectoryQuery.isLoading
      ? "..."
      : hasAnySchedule
        ? activeScheduledPicCount
        : activePicCount;
  const picDescription = picDirectoryQuery.isError
    ? "Direktori PIC unit belum bisa dibaca dari sumber live."
    : hasAnySchedule
      ? "Petugas aktif yang memang terjadwal hari ini."
      : "Akun PIC aktif yang tercatat di unit ini.";
  const dailyQuotaValue = unitConfig ? unitConfig.dailyQuota : "Belum disetel";
  const dailyQuotaDescription = unitConfig
    ? "Batas slot harian unit dari pengaturan Humas Admin."
    : "Kapasitas unit belum dibekukan di Humas Admin.";
  const statusSummary = resolveUnitStatusSummary({
    onBreak,
    serviceCount,
    hasFrozenQuota: Boolean(unitConfig),
    dailyQuota: unitConfig?.dailyQuota ?? null,
  });
  const stats = [
    {
      label: "PIC Aktif",
      value: picValue,
      description: picDescription,
      tone: "role" as StatTone,
    },
    {
      label: "Layanan Dikelola",
      value: serviceCount,
      description: "Layanan aktif yang terhubung ke unit ini.",
      tone: "info" as StatTone,
    },
    {
      label: "Kapasitas Harian",
      value: dailyQuotaValue,
      description: dailyQuotaDescription,
      tone: unitConfig ? ("role" as StatTone) : ("warning" as StatTone),
    },
    {
      label: "Status",
      value: statusSummary.value,
      description: statusSummary.description,
      tone: statusSummary.tone,
    },
  ];
  const picItems = picDirectoryQuery.data?.items ?? [];
  const handleActiveCounterChange = React.useCallback(
    async (nextCounterId: string) => {
      const normalizedCounterId = nextCounterId.trim().toUpperCase();
      const nextCounter = identity.assignedCounters.find(
        (counter) => counter.id === normalizedCounterId,
      );

      if (!nextCounter || !live.session || live.session.variant !== "staff") {
        return;
      }

      persistMockSession({
        ...live.session,
        assignedCounters: identity.assignedCounters,
        activeCounterId: nextCounter.id,
        activeCounterNumber: nextCounter.counterNumber,
        activeCounterLabel: nextCounter.label,
      });
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
    },
    [identity.assignedCounters, live.session, queryClient],
  );

  if (!config) {
    return null;
  }

  return (
    <DashboardShell
      role="unit-organisasi"
      currentPath={getInternalPagePath("unit-organisasi", "profil")}
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
                loading={picDirectoryQuery.isLoading && !picDirectoryQuery.data}
                onClick={() => setPicDialogOpen(true)}
              >
                {config.heroSecondaryAction ?? "Lihat PIC"}
              </AppButton>
              <AppButton
                onClick={() =>
                  router.push(getInternalPagePath("unit-organisasi", "pengaturan"))
                }
              >
                Buka Pengaturan
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
          <AppCard padding="lg" className="space-y-5">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                Identitas Unit
              </p>
              <h2 className="text-2xl font-bold tracking-tight">{identity.unitEntry?.label || identity.unitId}</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <BriefcaseBusiness className="size-4 text-role-accent" />
                  Kode Unit
                </p>
                <p className="mt-2 text-lg font-bold tracking-tight">{identity.unitId}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {identity.unitEntry?.groupLabel || "Unit layanan aktif"}
                </p>
              </div>
              <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Mail className="size-4 text-role-accent" />
                  Akun Aktif
                </p>
                <p className="mt-2 text-lg font-bold tracking-tight">{identity.profileName}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{identity.profileEmail}</p>
              </div>
              <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="size-4 text-role-accent" />
                  Layanan Dikelola
                </p>
                <p className="mt-2 text-lg font-bold tracking-tight">{identity.unitServices.length}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Layanan aktif di unit ini.
                </p>
              </div>
              <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="size-4 text-role-accent" />
                  Loket Aktif
                </p>
                <p className="mt-2 text-lg font-bold tracking-tight">
                  {identity.activeCounterLabel || "Belum dipilih"}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {identity.assignedCounters.length > 0
                    ? "Loket operasional sesi saat ini."
                    : "Belum ada loket yang tersinkron ke akun unit ini."}
                </p>
              </div>
              <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="size-4 text-role-accent" />
                  Hak Akses
                </p>
                <p className="mt-2 text-lg font-bold tracking-tight">Unit Organisasi</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Akses operasional antrean unit.
                </p>
              </div>
            </div>
          </AppCard>

          <div className="space-y-6">
            <AppCard padding="lg" className="space-y-5">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                  Loket Operasional
                </p>
                <h2 className="text-xl font-bold tracking-tight">Sesi loket aktif</h2>
              </div>

              <AppFormField
                label="Loket aktif"
                description={
                  identity.assignedCounters.length > 0
                    ? "Ganti loket ini bila petugas berpindah meja layanan."
                    : "Belum ada loket yang di-assign ke akun unit ini."
                }
                density="compact"
                labelTone="quiet"
              >
                <AppSelect
                  value={identity.activeCounterId ?? ""}
                  onChange={(event) => {
                    void handleActiveCounterChange(event.target.value);
                  }}
                  disabled={identity.assignedCounters.length < 1}
                >
                  {identity.assignedCounters.length < 1 ? (
                    <option value="">Belum ada loket tersinkron</option>
                  ) : null}
                  {identity.assignedCounters.map((counter) => (
                    <option key={counter.id} value={counter.id}>
                      {counter.label} · Nomor {counter.counterNumber}
                    </option>
                  ))}
                </AppSelect>
              </AppFormField>

              {identity.assignedCounters.length < 1 ? (
                <AppNotice
                  icon={Users}
                  title="Assignment loket belum tersedia"
                  description="Humas Admin perlu menambahkan loket pada unit ini lalu mengaitkannya ke akun operator unit."
                  tone="warning"
                />
              ) : null}
            </AppCard>

            <AppCard padding="lg" className="space-y-5">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                  Layanan Aktif
                </p>
                <h2 className="text-xl font-bold tracking-tight">Cakupan layanan unit</h2>
              </div>
              <div className="space-y-3">
                {identity.unitServices.map((service) => (
                  <div key={service.id} className="rounded-[24px] bg-surface-container-low px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {service.id}
                    </p>
                    <h3 className="mt-2 text-base font-semibold tracking-tight">{service.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{service.description}</p>
                  </div>
                ))}
              </div>
            </AppCard>
          </div>
        </div>

        <AppDialog
          open={picDialogOpen}
          onOpenChange={setPicDialogOpen}
          title="PIC Unit"
          description="Daftar PIC yang tercatat pada unit ini. Jumlah kartu atas sekarang membaca daftar yang sama."
        >
          <div className="space-y-4">
            {picDirectoryQuery.isError ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Data PIC unit belum bisa dimuat.
              </p>
            ) : null}

            {!picDirectoryQuery.isError ? (
              <div className="grid gap-4 md:grid-cols-3">
                <AppStatCard
                  label="PIC Tercatat"
                  value={picItems.length}
                  description="Semua akun unit yang terhubung ke unit ini."
                  tone="info"
                />
                <AppStatCard
                  label="PIC Aktif"
                  value={activePicCount}
                  description="Akun yang saat ini masih aktif."
                  tone="role"
                />
                <AppStatCard
                  label="Bertugas Hari Ini"
                  value={hasAnySchedule ? activeScheduledPicCount : "-"}
                  description={
                    hasAnySchedule
                      ? "Mengikuti jadwal PIC yang tersimpan."
                      : "Jadwal PIC belum disetel, jadi hitungan hari ini belum dibekukan."
                  }
                  tone={hasAnySchedule ? "success" : "warning"}
                />
              </div>
            ) : null}

            {picDirectoryQuery.isLoading && !picItems.length ? (
              <AppNotice
                icon={Users}
                title="Memuat PIC unit"
                description="Daftar PIC unit sedang dimuat."
              />
            ) : null}

            {!picDirectoryQuery.isLoading && !picDirectoryQuery.isError && picItems.length === 0 ? (
              <AppNotice
                icon={Users}
                title="Belum ada PIC unit"
                description="Belum ada akun staff yang terhubung ke unit ini."
                tone="warning"
              />
            ) : null}

            {picItems.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {picItems.map((item) => (
                  <AppCard
                    key={item.id}
                    padding="md"
                    className="space-y-4 rounded-[24px] bg-surface-container-low"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold tracking-tight">
                          {item.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.loginName || item.id}
                        </p>
                      </div>
                      <AppStatusBadge
                        status={item.active ? "aktif" : "warning"}
                        label={item.active ? "Aktif" : "Nonaktif"}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] bg-surface-container-lowest px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Role
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {item.roleLabel}
                        </p>
                      </div>
                      <div className="rounded-[20px] bg-surface-container-lowest px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Layanan Ditugaskan
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {item.assignedServiceCount} layanan
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[20px] bg-surface-container-lowest px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Jadwal Hari Ini
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {item.todayShiftLabel ||
                              (item.hasSchedule
                                ? "Tidak terjadwal hari ini"
                                : "Jadwal belum disetel")}
                          </p>
                        </div>
                        <AppStatusBadge
                          status={item.scheduledToday ? "aktif" : "warning"}
                          label={item.scheduledToday ? "Bertugas" : "Belum aktif"}
                        />
                      </div>
                    </div>
                  </AppCard>
                ))}
              </div>
            ) : null}
          </div>
        </AppDialog>

        <MobileProfileLogoutSection description="Keluar dari sesi unit pada perangkat ini tanpa menambah tombol logout kedua di desktop." />
      </div>
    </DashboardShell>
  );
}
