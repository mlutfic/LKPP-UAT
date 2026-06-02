"use client";

import * as React from "react";
import { BarChart3, Clock3, Layers3, TimerReset } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  AppAnalyticsAreaChart,
  AppAnalyticsConcentricChart,
  AppAnalyticsDonutChart,
  AppAnalyticsMetricTiles,
  AppAnalyticsPanel,
  AppAnalyticsStackedAreaChart,
} from "@/components/composite/app-analytics-panels";
import { AppPageIntro } from "@/components/composite/app-page-intro";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { InternalPermissionFallback } from "@/features/internal/components/internal-permission-fallback";
import { UnitWorkspaceScopeCard } from "@/features/internal/components/unit-workspace-scope-card";
import { AppSearchSelect, type AppSearchSelectOption } from "@/components/ui/app-search-select";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { useActiveStaffRole } from "@/features/internal/use-active-staff-role";
import {
  AppDateFilter,
  createAppDateFilterValue,
  isDateWithinAppDateFilter,
  type AppDateFilterValue,
} from "@/components/ui/app-date-filter";
import { getBookingServiceById, getBookingServiceLevelLabel } from "@/content/service-booking-content";
import { getInternalPageConfig, getInternalPagePath } from "@/features/internal/internal-workspace-config";
import { useLiveStaffAppointments } from "@/features/internal/use-live-staff-appointments";
import { useUnitWorkspaceScope } from "@/features/internal/use-unit-workspace-scope";
import { useStaffRolePermissions } from "@/features/internal/use-staff-role-permissions";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  describeStaffPermissionRequirement,
  getFirstAccessibleStaffPath,
  getMissingStaffPermissions,
  getStaffRoutePermissionRequirement,
} from "@/lib/internal-role-access";
import {
  buildFallbackUnitRows,
  buildLiveUnitRows,
  groupUnitRows,
  isUnitCallingRow,
  isUnitCompletedRow,
  isUnitHandoffRow,
  isUnitInServiceRow,
  isUnitReadyRow,
  isUnitWaitingRow,
  scopeUnitRowsToUnit,
  type UnitWorkspaceRow,
} from "@/features/internal/unit/workspace";
import { getUnitWorkspaceIdentity } from "@/features/internal/unit-organisasi-content";

const HOUR_BUCKETS = ["08", "09", "10", "11", "12", "13", "14", "15", "16"] as const;
const WEEKDAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;

function getHourKey(startTime?: string) {
  const match = String(startTime || "").match(/^(\d{2})/);
  return match?.[1] ?? "09";
}

function getAverageWaitSignal(rows: UnitWorkspaceRow[]) {
  if (!rows.length) {
    return 0;
  }

  const total = rows.reduce((sum, row) => sum + Math.max(row.callCount ?? 0, 0), 0);
  return Math.round((total / rows.length) * 6 + 8);
}

function getWeekdayLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00+07:00`);
  const day = Number.isNaN(date.getTime()) ? 1 : date.getDay();
  return WEEKDAY_LABELS[day] ?? "Sen";
}

function buildServiceBreakdown(rows: UnitWorkspaceRow[]) {
  const serviceTotals = new Map<
    string,
    {
      id: string;
      label: string;
      count: number;
      level: 1 | 2;
    }
  >();

  for (const row of rows) {
    const serviceId = row.serviceId?.trim().toUpperCase();
    if (!serviceId) {
      continue;
    }
    const service = getBookingServiceById(serviceId);
    const current = serviceTotals.get(serviceId);
    serviceTotals.set(serviceId, {
      id: serviceId,
      label: row.title,
      count: (current?.count ?? 0) + 1,
      level: service?.serviceLevel ?? 1,
    });
  }

  return Array.from(serviceTotals.entries())
    .map(([serviceId, item]) => ({
      id: item.id,
      label: item.label,
      value: item.count,
      meta: `${serviceId} · ${getBookingServiceLevelLabel(item.level)}`,
      tone: item.level === 2 ? ("warning" as const) : ("role" as const),
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
}

function buildServiceTrendSeries(
  rows: UnitWorkspaceRow[],
  services: Array<{ id: string; label: string; tone?: "role" | "warning" }>,
) {
  return services.slice(0, 3).map((service, index) => ({
    label: service.label,
    tone:
      service.tone ??
      (index === 0 ? ("role" as const) : index === 1 ? ("info" as const) : ("warning" as const)),
    values: HOUR_BUCKETS.map(
      (hour) =>
        rows.filter(
          (row) => row.serviceId?.trim().toUpperCase() === service.id && getHourKey(row.startTime) === hour,
        ).length,
    ),
  }));
}

function buildStatusBreakdown(rows: UnitWorkspaceRow[]) {
  return [
    {
      label: "Menunggu",
      value: rows.filter(isUnitWaitingRow).length,
      tone: "neutral" as const,
    },
    {
      label: "Siap Dipanggil",
      value: rows.filter(isUnitReadyRow).length,
      tone: "info" as const,
    },
    {
      label: "Aktif di Meja",
      value: rows.filter((row) => isUnitCallingRow(row) || isUnitInServiceRow(row)).length,
      tone: "warning" as const,
    },
    {
      label: "Selesai",
      value: rows.filter(isUnitCompletedRow).length,
      tone: "success" as const,
    },
  ];
}

function buildHourlyBreakdown(rows: UnitWorkspaceRow[]) {
  return HOUR_BUCKETS.map((hour) => ({
    label: hour,
    value: rows.filter((row) => getHourKey(row.startTime) === hour).length,
    tone: "role" as const,
  }));
}

function buildWeekdayBreakdown(rows: UnitWorkspaceRow[]) {
  return WEEKDAY_LABELS.map((weekday) => ({
    label: weekday,
    value: rows.filter((row) => getWeekdayLabel(row.date) === weekday).length,
    tone: "role" as const,
  }));
}

function buildServiceLevelBreakdown(rows: UnitWorkspaceRow[]) {
  const level1Count = rows.filter((row) => {
    const service = getBookingServiceById(row.serviceId || "");
    return (service?.serviceLevel ?? 1) === 1;
  }).length;
  const level2Count = rows.filter((row) => {
    const service = getBookingServiceById(row.serviceId || "");
    return service?.serviceLevel === 2;
  }).length;

  return [
    {
      label: getBookingServiceLevelLabel(1),
      value: level1Count,
      tone: "role" as const,
      meta: "Reguler",
    },
    {
      label: getBookingServiceLevelLabel(2),
      value: level2Count,
      tone: "warning" as const,
      meta: "Lanjutan",
    },
  ].filter((item) => item.value > 0);
}

function getPeakHourLabel(items: { label: string; value: number }[]) {
  const busiest = items.reduce<{ label: string; value: number } | null>((current, item) => {
    if (!current || item.value > current.value) {
      return item;
    }

    return current;
  }, null);

  if (!busiest || busiest.value <= 0) {
    return "-";
  }

  return `${busiest.label}:00`;
}

function getSlaSignal(rows: UnitWorkspaceRow[]) {
  if (!rows.length) {
    return 0;
  }

  const onTrackCount = rows.filter((row) => !row.isEscalated && !isUnitWaitingRow(row)).length;
  return Math.round((onTrackCount / rows.length) * 100);
}

export function UnitAnalyticsPage() {
  const router = useRouter();
  const config = getInternalPageConfig("unit-organisasi", "analitik-unit");
  const hydrated = useHydrated();
  const { activeRole } = useActiveStaffRole("unit-organisasi");
  const live = useLiveStaffAppointments();
  const unitScope = useUnitWorkspaceScope(live.session);
  const permissionQuery = useStaffRolePermissions(activeRole);
  const currentPath = getInternalPagePath("unit-organisasi", "analitik-unit");
  const [dateFilter, setDateFilter] = React.useState<AppDateFilterValue>(() =>
    createAppDateFilterValue("today"),
  );
  const [serviceFilter, setServiceFilter] = React.useState("all");
  const isPermissionLoading =
    permissionQuery.isRuntimeSyncing && !permissionQuery.permissions;
  const canViewStatistics =
    !isPermissionLoading && (permissionQuery.permissions?.canViewStatistics ?? false);
  const routeRequirement = getStaffRoutePermissionRequirement(activeRole, currentPath);
  const missingRoutePermissions = getMissingStaffPermissions(
    routeRequirement,
    permissionQuery.permissions,
  );
  const fallbackPath = getFirstAccessibleStaffPath(
    activeRole,
    permissionQuery.permissions,
    currentPath,
  );
  const identity = getUnitWorkspaceIdentity(live.session, live.appointments, {
    overrideUnitId: unitScope.effectiveUnitId || undefined,
  });
  const isLivePending = live.isLiveSession && live.appointments === null && !live.isError;
  const currentRows =
    live.appointments
      ? scopeUnitRowsToUnit(buildLiveUnitRows(live.appointments), identity.unitId)
      : !live.isLiveSession
        ? scopeUnitRowsToUnit(buildFallbackUnitRows(config?.rows ?? []), identity.unitId)
        : [];

  const filteredRows = currentRows.filter((row) => {
    if (!isDateWithinAppDateFilter(row.date, dateFilter)) {
      return false;
    }

    return serviceFilter === "all" ? true : row.serviceId === serviceFilter;
  });
  const operationalRows = filteredRows.filter(
    (row) => !isUnitHandoffRow(row, identity.unitId),
  );

  const queueGroups = groupUnitRows(operationalRows);
  const serviceBreakdown = buildServiceBreakdown(filteredRows);
  const statusBreakdown = buildStatusBreakdown(operationalRows);
  const hourlyBreakdown = buildHourlyBreakdown(filteredRows);
  const weekdayBreakdown = buildWeekdayBreakdown(filteredRows);
  const serviceLevelBreakdown = buildServiceLevelBreakdown(filteredRows);
  const serviceTrendSeries = buildServiceTrendSeries(filteredRows, serviceBreakdown);
  const escalatedCount = filteredRows.filter((row) => row.isEscalated).length;
  const averageWaitSignal = getAverageWaitSignal(filteredRows);
  const busiestService = serviceBreakdown[0];
  const peakHourLabel = getPeakHourLabel(hourlyBreakdown);
  const slaSignal = getSlaSignal(filteredRows);

  const serviceOptions: AppSearchSelectOption[] = identity.unitServices.map((service) => ({
    value: service.id,
    label: service.title,
    keywords: [service.officialName, service.groupLabel, service.id],
  }));

  React.useEffect(() => {
    setServiceFilter("all");
  }, [identity.unitId]);

  if (!config) {
    return null;
  }

  if (
    !hydrated ||
    isLivePending ||
    (unitScope.isHumasAdmin && !unitScope.hasResolvedSelection)
  ) {
    return (
      <DashboardShell
        role={activeRole}
        currentPath={currentPath}
        title={config.title}
        subtitle={config.description}
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {["Aktif", "Selesai", "Eskalasi", "Layanan Terbaca"].map((label) => (
            <AppStatCard
              key={label}
              label={label}
              value="..."
              description="Memuat analitik unit."
            />
          ))}
        </div>
      </DashboardShell>
    );
  }

  if (isPermissionLoading) {
    return (
      <DashboardShell
        role={activeRole}
        currentPath={currentPath}
        title={config.title}
        subtitle={config.description}
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {["Aktif", "Selesai", "Eskalasi", "Layanan Terbaca"].map((label) => (
            <AppStatCard
              key={label}
              label={label}
              value="..."
              description="Memuat analitik unit."
            />
          ))}
        </div>
      </DashboardShell>
    );
  }

  if (missingRoutePermissions.length || !canViewStatistics) {
    return (
      <InternalPermissionFallback
        role={activeRole}
        currentPath={currentPath}
        title={config.title}
        subtitle={config.description}
        message={`Akses untuk ${describeStaffPermissionRequirement(routeRequirement)} belum tersedia pada akun ini.`}
        primaryHref={fallbackPath}
        primaryLabel="Buka halaman lain"
        secondaryHref={getInternalPagePath(activeRole, "profil")}
        secondaryLabel="Lihat profil"
      />
    );
  }

  if (unitScope.requiresSelection) {
    return (
      <DashboardShell
        role={activeRole}
        currentPath={currentPath}
        title={config.title}
        subtitle={config.description}
      >
        <div className="space-y-8">
          <AppPageIntro
            eyebrow={config.heroEyebrow}
            title={config.heroTitle}
            description={config.heroDescription}
          />
          <UnitWorkspaceScopeCard
            value={unitScope.selectedUnitId}
            onValueChange={unitScope.setSelectedUnitId}
            options={unitScope.options}
            blocking
          />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role={activeRole}
      currentPath={currentPath}
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
              <AppButton onClick={() => router.push(getInternalPagePath("unit-organisasi", "data-antrean"))}>
                {config.heroPrimaryAction}
              </AppButton>
              <AppButton
                variant="outline"
                onClick={() => router.push(getInternalPagePath("unit-organisasi", "dashboard"))}
              >
                {config.heroSecondaryAction}
              </AppButton>
            </>
          }
        />

        {unitScope.isHumasAdmin ? (
          <UnitWorkspaceScopeCard
            value={unitScope.selectedUnitId}
            onValueChange={unitScope.setSelectedUnitId}
            options={unitScope.options}
          />
        ) : null}

        <AppCard tone="soft" padding="md" className="space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              Filter Analitik
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              Pilih rentang waktu dan layanan.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto]">
            <AppDateFilter value={dateFilter} onChange={setDateFilter} />
            <AppSearchSelect
              value={serviceFilter}
              onValueChange={setServiceFilter}
              options={[{ value: "all", label: "Semua Layanan" }, ...serviceOptions]}
              placeholder="Semua Layanan"
              searchPlaceholder="Cari layanan"
              emptyMessage="Layanan tidak ditemukan."
              className="w-full"
            />
            <AppButton
              variant="outline"
              onClick={() => {
                setDateFilter(createAppDateFilterValue("today"));
                setServiceFilter("all");
              }}
            >
              Reset Filter
            </AppButton>
          </div>
        </AppCard>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <AppStatCard
            label="Rata-rata Tunggu"
            value={`${averageWaitSignal}m`}
            description="Rata-rata antrean aktif."
            tone="role"
            icon={Clock3}
          />
          <AppStatCard
            label="Selesai Hari Ini"
            value={queueGroups.completedRows.length.toString()}
            description="Antrean selesai pada rentang aktif."
            tone="success"
            icon={BarChart3}
          />
          <AppStatCard
            label="Puncak Antrean"
            value={peakHourLabel}
            description="Jam layanan paling padat."
            tone="warning"
            icon={Layers3}
          />
          <AppStatCard
            label="Stabil Hari Ini"
            value={`${slaSignal}%`}
            description="Antrean aktif tanpa atensi."
            tone="info"
            icon={TimerReset}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <AppAnalyticsPanel
            eyebrow="Distribusi Layanan"
            title="Volume per layanan"
            description="Layanan dengan volume tertinggi pada rentang aktif."
          >
            <div className="space-y-5">
              {serviceBreakdown.length ? (
                <AppAnalyticsMetricTiles items={serviceBreakdown} />
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-surface-container-low px-5 py-10 text-center">
                  <p className="text-sm font-semibold">Belum ada data layanan pada rentang ini.</p>
                </div>
              )}

              {serviceTrendSeries.length ? (
                <div className="space-y-3 border-t border-border/80 pt-5">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                      Tren Layanan
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Volume layanan utama per jam operasional.
                    </p>
                  </div>
                  <AppAnalyticsStackedAreaChart labels={[...HOUR_BUCKETS]} series={serviceTrendSeries} />
                </div>
              ) : null}

              {serviceLevelBreakdown.length ? (
                <div className="space-y-3 border-t border-border/80 pt-5">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                      Komposisi Level
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Perbandingan layanan reguler dan lanjutan.
                    </p>
                  </div>
                  <AppAnalyticsConcentricChart items={serviceLevelBreakdown} summaryLabel="Level" />
                </div>
              ) : null}
            </div>
          </AppAnalyticsPanel>

          <div className="space-y-6">
            <AppAnalyticsPanel
              eyebrow="Status Operasional"
              title="Komposisi antrean"
              description="Bagi antrean ke status utama."
            >
              <AppAnalyticsDonutChart items={statusBreakdown} summaryLabel="Total antrean" />
            </AppAnalyticsPanel>

            <AppAnalyticsPanel
              eyebrow="Bacaan Cepat"
              title="Ringkasan unit"
              description="Ringkasan fokus unit saat ini."
            >
              <div className="grid gap-3">
                <div className="rounded-[20px] bg-surface-container-low px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Layanan Tersibuk
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {busiestService?.label || "Belum ada layanan dominan"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {busiestService
                      ? `${busiestService.value} antrean.`
                      : "Belum ada layanan dominan."}
                  </p>
                </div>
                <div className="rounded-[20px] bg-surface-container-low px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Antrean Berikutnya
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {queueGroups.nextReadyRow?.title || "Belum ada antrean siap dipanggil"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {queueGroups.nextReadyRow
                      ? `${queueGroups.nextReadyRow.id} siap diproses berikutnya.`
                      : "Belum ada antrean siap proses."}
                  </p>
                </div>
                <div className="rounded-[20px] bg-surface-container-low px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Butuh Atensi
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {escalatedCount} antrean
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Eskalasi atau perpindahan layanan.
                  </p>
                </div>
              </div>
            </AppAnalyticsPanel>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <AppAnalyticsPanel
            eyebrow="Tempo Harian"
            title="Aktivitas per jam"
            description="Ritme antrean pada jam operasional."
          >
            <AppAnalyticsAreaChart items={hourlyBreakdown} />
          </AppAnalyticsPanel>

          <AppAnalyticsPanel
            eyebrow="Pola Mingguan"
            title="Sebaran hari layanan"
            description="Hari yang paling sering berisi antrean."
          >
            <AppAnalyticsAreaChart items={weekdayBreakdown} />
          </AppAnalyticsPanel>
        </div>
      </div>
    </DashboardShell>
  );
}
