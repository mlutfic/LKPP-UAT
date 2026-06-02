"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppPageIntro } from "@/components/composite/app-page-intro";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { InternalPermissionFallback } from "@/features/internal/components/internal-permission-fallback";
import { InternalWorkspaceUnavailable } from "@/features/internal/components/internal-workspace-unavailable";
import {
  buildFallbackLevel2Rows,
  buildLevel2Stats,
  getLevel2FocusRow,
  prioritizeLevel2Rows,
  scopeLevel2Rows,
} from "@/features/internal/level-2/workspace";
import {
  getInternalPageConfig,
  getInternalPagePath,
} from "@/features/internal/internal-workspace-config";
import { resolveWorkspaceStatusTone } from "@/features/internal/internal-workspace-actions";
import { getInternalUnavailableCopy } from "@/features/internal/internal-workspace-registry";
import { useLevel2Settings } from "@/features/internal/use-level-2-settings";
import { useLiveStaffAppointments } from "@/features/internal/use-live-staff-appointments";
import { useStaffRolePermissions } from "@/features/internal/use-staff-role-permissions";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  describeStaffPermissionRequirement,
  getFirstAccessibleStaffPath,
  getMissingStaffPermissions,
  getStaffRoutePermissionRequirement,
} from "@/lib/internal-role-access";
import {
  buildLiveUnitRows,
  groupUnitRows,
} from "@/features/internal/unit/workspace";
import { getUnitWorkspaceIdentity } from "@/features/internal/unit-organisasi-content";

function buildLevel2FocusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("sedang dilayani")) {
    return "Layanan Aktif";
  }
  if (normalized.includes("dipanggil")) {
    return "Siap Diambil Petugas";
  }
  if (normalized.includes("selesai")) {
    return "Tindak Lanjut Terakhir";
  }
  if (normalized.includes("tidak diproses")) {
    return "Penutupan Otomatis";
  }
  if (normalized.includes("eskalasi")) {
    return "Eskalasi Berikutnya";
  }
  return "Fokus Level 2";
}

function truncateLevel2Copy(value: string | null | undefined, maxLength = 160) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function buildLevel2RowSummary(args: {
  escalationReason?: string | null;
  note?: string | null;
}) {
  return (
    truncateLevel2Copy(args.escalationReason, 180) ||
    truncateLevel2Copy(args.note, 180) ||
    "Antrean level 2 siap ditindaklanjuti."
  );
}

export function Level2DashboardPage() {
  const router = useRouter();
  const dashboardConfig = getInternalPageConfig("petugas-level-2", "dashboard");
  const hydrated = useHydrated();
  const live = useLiveStaffAppointments();
  const permissionQuery = useStaffRolePermissions("petugas-level-2");
  const { settings } = useLevel2Settings();
  const currentPath = getInternalPagePath("petugas-level-2", "dashboard");
  const permissions = permissionQuery.permissions;
  const isPermissionLoading =
    permissionQuery.isRuntimeSyncing && !permissionQuery.permissions;
  const routeRequirement = getStaffRoutePermissionRequirement("petugas-level-2", currentPath);
  const missingRoutePermissions = getMissingStaffPermissions(
    routeRequirement,
    permissions,
  );
  const fallbackPath = getFirstAccessibleStaffPath(
    "petugas-level-2",
    permissions,
    currentPath,
  );
  const identity = React.useMemo(
    () => getUnitWorkspaceIdentity(live.session, live.appointments),
    [live.appointments, live.session],
  );
  const fallbackRows = React.useMemo(() => buildFallbackLevel2Rows(), []);
  const isLivePending = live.isLoading && live.appointments === null && !live.isError;
  const sourceRows = React.useMemo(
    () =>
      live.appointments
        ? buildLiveUnitRows(live.appointments)
        : !live.isLiveSession
          ? fallbackRows
          : [],
    [fallbackRows, live.appointments, live.isLiveSession],
  );
  const scopedRows = React.useMemo(
    () => scopeLevel2Rows(sourceRows, identity.unitId),
    [identity.unitId, sourceRows],
  );
  const groupedRows = React.useMemo(() => groupUnitRows(scopedRows), [scopedRows]);
  const stats = React.useMemo(
    () => buildLevel2Stats(groupedRows),
    [groupedRows],
  );
  const focusRow = React.useMemo(
    () => getLevel2FocusRow(groupedRows, settings.highlightEscalationQueue),
    [groupedRows, settings.highlightEscalationQueue],
  );
  const highlightRows = React.useMemo(() => {
    const activeRows = prioritizeLevel2Rows(
      [
        ...groupedRows.readyRows,
        ...groupedRows.calledRows,
        ...groupedRows.inServiceRows,
      ],
      settings.highlightEscalationQueue,
    );

    if (activeRows.length) {
      return activeRows.slice(0, 3);
    }

    return prioritizeLevel2Rows(
      [...groupedRows.completedRows, ...groupedRows.unprocessedRows],
      settings.highlightEscalationQueue,
    ).slice(0, 3);
  }, [groupedRows, settings.highlightEscalationQueue]);
  const escalationCount = React.useMemo(
    () => scopedRows.filter((row) => row.isEscalated).length,
    [scopedRows],
  );
  const dashboardStatusCards = [
    {
      label: "Unit Aktif",
      value: identity.unitId,
      description: identity.unitEntry?.label || "Unit aktif level 2.",
    },
    {
      label: "Layanan Unit",
      value: String(identity.unitServices.length),
      description: identity.unitId
        ? `Semua layanan prefix ${identity.unitId} yang terbaca.`
        : "Semua layanan unit aktif yang terbaca.",
    },
    {
      label: "Sinkronisasi",
      value: live.isLiveSession ? "Otomatis" : "Fallback",
      description: live.isLiveSession
        ? "Dashboard diperbarui otomatis tanpa refresh manual."
        : "Mode lokal dipakai saat sesi live tidak tersedia.",
    },
  ];

  if (!dashboardConfig) {
    const fallback = getInternalUnavailableCopy("petugas-level-2");
    return (
      <DashboardShell
        role="petugas-level-2"
        currentPath={currentPath}
        title={fallback.title}
        subtitle={fallback.description}
      >
        <InternalWorkspaceUnavailable {...fallback} />
      </DashboardShell>
    );
  }

  if (isPermissionLoading) {
    return (
      <DashboardShell
        role="petugas-level-2"
        currentPath={currentPath}
        title={dashboardConfig.title}
        subtitle={dashboardConfig.description}
      >
        <div className="space-y-6">
          <p className="text-sm leading-6 text-muted-foreground">Dashboard sedang dimuat.</p>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {["Inbox Aktif", "Siap Ditangani", "Sedang Dilayani", "Selesai", "Tidak Diproses"].map((label) => (
              <AppStatCard
                key={label}
                label={label}
                value="..."
                description="Memuat ringkasan level 2"
              />
            ))}
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!hydrated || isLivePending) {
    return (
      <DashboardShell
        role="petugas-level-2"
        currentPath={currentPath}
        title={dashboardConfig.title}
        subtitle={dashboardConfig.description}
      >
        <div className="space-y-6">
          <p className="text-sm leading-6 text-muted-foreground">Dashboard sedang dimuat.</p>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {["Inbox Aktif", "Siap Ditangani", "Sedang Dilayani", "Selesai"].map((label) => (
              <AppStatCard
                key={label}
                label={label}
                value="..."
                description="Memuat ringkasan level 2"
              />
            ))}
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (missingRoutePermissions.length) {
    return (
      <InternalPermissionFallback
        role="petugas-level-2"
        currentPath={currentPath}
        title={dashboardConfig.title}
        subtitle={dashboardConfig.description}
        message={`Akses untuk ${describeStaffPermissionRequirement(routeRequirement)} belum tersedia pada akun petugas level 2 ini.`}
        primaryHref={fallbackPath}
        primaryLabel="Buka halaman lain"
        secondaryHref={getInternalPagePath("petugas-level-2", "profil")}
        secondaryLabel="Lihat profil petugas"
      />
    );
  }

  return (
    <DashboardShell
      role="petugas-level-2"
      currentPath={currentPath}
      title={dashboardConfig.title}
      subtitle={dashboardConfig.description}
    >
      <div className="space-y-8">
        <AppPageIntro
          eyebrow={dashboardConfig.heroEyebrow}
          title={dashboardConfig.heroTitle}
          description={dashboardConfig.heroDescription}
          actions={
            <AppButton
              onClick={() => router.push(getInternalPagePath("petugas-level-2", "inbox-eskalasi"))}
            >
              {dashboardConfig.heroPrimaryAction}
            </AppButton>
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <AppCard padding="lg" className="space-y-5">
            <AppSectionHeader
              eyebrow="Fokus Hari Ini"
              title="Antrean level 2 berikutnya"
              description="Ringkasan antrean yang paling perlu ditindaklanjuti."
            />

            {focusRow ? (
              <div className="space-y-4 rounded-[28px] bg-surface-container-low px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {buildLevel2FocusLabel(focusRow.status)}
                    </p>
                    <h3 className="text-[1.55rem] font-bold leading-tight tracking-tight text-balance">
                      {focusRow.title}
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground">
                      {focusRow.id}
                    </p>
                  </div>
                  <AppStatusBadge
                    status={resolveWorkspaceStatusTone(focusRow.status)}
                    label={focusRow.status}
                  />
                </div>

                <p className="text-sm leading-6 text-muted-foreground">
                  {buildLevel2RowSummary(focusRow)}
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      label: "Pengunjung",
                      value: focusRow.userName || "Pengunjung layanan",
                    },
                    {
                      label: "Asal Eskalasi",
                      value:
                        truncateLevel2Copy(
                          focusRow.escalationOriginLabel || "Layanan level 2 langsung",
                          88,
                        ) || "Layanan level 2 langsung",
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[20px] bg-surface-container-lowest px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>

                {focusRow.escalationReason ? (
                  <div className="rounded-[20px] bg-surface-container-lowest px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Alasan Eskalasi
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {focusRow.escalationReason}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <AppButton
                    onClick={() => router.push(getInternalPagePath("petugas-level-2", "inbox-eskalasi"))}
                  >
                    Lanjutkan di inbox
                  </AppButton>
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-border bg-surface-container-low px-5 py-10 text-center">
                <p className="text-sm font-semibold">Belum ada antrean level 2 aktif</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Inbox eskalasi sedang kosong atau semua tindak lanjut hari ini sudah ditutup.
                </p>
              </div>
            )}
          </AppCard>

          <div className="space-y-6">
            <AppCard padding="lg" className="space-y-5">
              <AppSectionHeader
                eyebrow="Ringkasan Kerja"
                title="Konteks yang perlu terlihat"
                description="Hanya info inti yang dipakai petugas level 2."
              />
              <div className="grid gap-3">
                {dashboardStatusCards.map((item) => (
                  <div key={item.label} className="rounded-[24px] bg-surface-container-low px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                      {item.value}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {escalationCount} antrean eskalasi sedang terbaca pada dashboard ini.
              </p>
            </AppCard>
          </div>
        </div>

        <AppCard padding="lg" className="space-y-5">
          <AppSectionHeader
            eyebrow="Inbox Dalam Fokus"
            title="Antrean yang paling perlu perhatian"
            description="Daftar singkat agar petugas bisa langsung masuk ke antrean yang aktif."
          />
          {highlightRows.length ? (
            <div className="grid gap-4 xl:grid-cols-3">
              {highlightRows.map((row) => (
                <div
                  key={`${row.source}-${row.appointmentId ?? row.id}`}
                  className="rounded-[24px] bg-surface-container-low px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {row.displayQueueNumber || row.id}
                      </p>
                      <h3 className="text-base font-semibold tracking-tight text-foreground">
                        {row.title}
                      </h3>
                    </div>
                    <AppStatusBadge
                      status={resolveWorkspaceStatusTone(row.status)}
                      label={row.status}
                    />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {row.userName || "Pengunjung layanan"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {buildLevel2RowSummary(row)}
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-role-accent"
                    onClick={() => router.push(getInternalPagePath("petugas-level-2", "inbox-eskalasi"))}
                  >
                    Buka di inbox
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border bg-surface-container-low px-5 py-10 text-center">
              <p className="text-sm font-semibold">Belum ada antrean yang perlu sorotan</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Saat antrean level 2 baru masuk, daftar fokus ini akan otomatis terisi.
              </p>
            </div>
          )}
        </AppCard>
      </div>
    </DashboardShell>
  );
}
