"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { AppPageIntro } from "@/components/composite/app-page-intro";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { InternalPermissionFallback } from "@/features/internal/components/internal-permission-fallback";
import { UnitWorkspaceScopeCard } from "@/features/internal/components/unit-workspace-scope-card";
import { getInternalPagePath, getInternalPageConfig } from "@/features/internal/internal-workspace-config";
import { resolveWorkspaceStatusTone } from "@/features/internal/internal-workspace-actions";
import { useActiveStaffRole } from "@/features/internal/use-active-staff-role";
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
  buildDerivedUnitStats,
  buildFallbackUnitRows,
  buildLiveUnitRows,
  groupUnitRows,
  isUnitHandoffRow,
  scopeUnitRowsToUnit,
} from "@/features/internal/unit/workspace";
import { getUnitWorkspaceIdentity } from "@/features/internal/unit-organisasi-content";

export function UnitDashboardPage() {
  const router = useRouter();
  const config = getInternalPageConfig("unit-organisasi", "dashboard");
  const hydrated = useHydrated();
  const todayKey = React.useMemo(
    () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }),
    [],
  );
  const { activeRole } = useActiveStaffRole("unit-organisasi");
  const live = useLiveStaffAppointments({ refreshIntervalMs: false });
  const unitScope = useUnitWorkspaceScope(live.session);
  const permissionQuery = useStaffRolePermissions(activeRole);
  const currentPath = getInternalPagePath("unit-organisasi", "dashboard");
  const permissions = permissionQuery.permissions;
  const isPermissionLoading =
    permissionQuery.isRuntimeSyncing && !permissionQuery.permissions;
  const canViewStatistics =
    !isPermissionLoading &&
    (permissions?.canViewStatistics ?? false);
  const routeRequirement = getStaffRoutePermissionRequirement(activeRole, currentPath);
  const missingRoutePermissions = getMissingStaffPermissions(
    routeRequirement,
    permissions,
  );
  const fallbackPath = getFirstAccessibleStaffPath(
    activeRole,
    permissions,
    currentPath,
  );
  const identity = React.useMemo(
    () =>
      getUnitWorkspaceIdentity(live.session, live.appointments, {
        overrideUnitId: unitScope.effectiveUnitId || undefined,
      }),
    [live.appointments, live.session, unitScope.effectiveUnitId],
  );
  const activeCounterNumber = identity.activeCounterNumber;
  const fallbackRows = React.useMemo(() => buildFallbackUnitRows(config?.rows ?? []), [config?.rows]);
  const isLivePending = live.isLiveSession && live.appointments === null && !live.isError;
  const currentRows = React.useMemo(() => {
    if (live.appointments) {
      return scopeUnitRowsToUnit(buildLiveUnitRows(live.appointments), identity.unitId);
    }

    if (!live.isLiveSession) {
      return scopeUnitRowsToUnit(fallbackRows, identity.unitId);
    }

    return [];
  }, [fallbackRows, identity.unitId, live.appointments, live.isLiveSession]);
  const operationalRows = React.useMemo(
    () => currentRows.filter((row) => !isUnitHandoffRow(row, identity.unitId)),
    [currentRows, identity.unitId],
  );
  const todayOperationalRows = React.useMemo(
    () =>
      operationalRows.filter(
        (row) => row.date.trim().slice(0, 10) === todayKey,
      ),
    [operationalRows, todayKey],
  );
  const groupedRows = React.useMemo(() => groupUnitRows(operationalRows), [operationalRows]);
  const todayGroupedRows = React.useMemo(
    () => groupUnitRows(todayOperationalRows),
    [todayOperationalRows],
  );
  const todayOwnActiveRows = React.useMemo(
    () =>
      [...todayGroupedRows.calledRows, ...todayGroupedRows.inServiceRows].filter((row) => {
        if (
          typeof activeCounterNumber !== "number" ||
          !Number.isFinite(activeCounterNumber)
        ) {
          return false;
        }

        return typeof row.counterId === "number"
          ? row.counterId === activeCounterNumber
          : true;
      }),
    [activeCounterNumber, todayGroupedRows.calledRows, todayGroupedRows.inServiceRows],
  );
  const focusQueueRow = React.useMemo(
    () =>
      todayOwnActiveRows[0] ??
      todayGroupedRows.nextReadyRow ??
      todayGroupedRows.calledRows[0] ??
      todayGroupedRows.inServiceRows[0] ??
      null,
    [todayGroupedRows, todayOwnActiveRows],
  );
  const focusQueueMode = React.useMemo(() => {
    if (!focusQueueRow) {
      return "empty" as const;
    }

    if (todayGroupedRows.nextReadyRow?.id === focusQueueRow.id) {
      return "ready" as const;
    }

    if (todayGroupedRows.calledRows.some((row) => row.id === focusQueueRow.id)) {
      return "calling" as const;
    }

    if (todayGroupedRows.inServiceRows.some((row) => row.id === focusQueueRow.id)) {
      return "in-service" as const;
    }

    return "ready" as const;
  }, [focusQueueRow, todayGroupedRows]);
  const stats = React.useMemo(
    () => buildDerivedUnitStats(config?.stats ?? [], todayOperationalRows),
    [config?.stats, todayOperationalRows],
  );
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
          {["Menunggu", "Siap Dipanggil", "Sedang Dilayani", "Selesai"].map((label) => (
            <AppStatCard key={label} label={label} value="..." description="Memuat dashboard unit." />
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
          {["Menunggu", "Siap Dipanggil", "Sedang Dilayani", "Selesai"].map((label) => (
            <AppStatCard key={label} label={label} value="..." description="Memuat dashboard unit." />
          ))}
        </div>
      </DashboardShell>
    );
  }

  if (missingRoutePermissions.length) {
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
            <AppButton onClick={() => router.push(getInternalPagePath("unit-organisasi", "data-antrean"))}>
              {config.heroPrimaryAction}
            </AppButton>
          }
        />

        {unitScope.isHumasAdmin ? (
          <UnitWorkspaceScopeCard
            value={unitScope.selectedUnitId}
            onValueChange={unitScope.setSelectedUnitId}
            options={unitScope.options}
          />
        ) : null}

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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
          <AppCard padding="lg" className="space-y-5">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                Fokus Hari Ini
              </p>
              <h2 className="text-2xl font-bold tracking-tight">
                {focusQueueMode === "ready"
                  ? "Antrean berikutnya"
                  : focusQueueMode === "empty"
                    ? "Antrean berikutnya"
                    : "Antrean aktif saat ini"}
              </h2>
            </div>

            {focusQueueRow ? (
              <div className="space-y-4 rounded-[28px] bg-surface-container-low px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {focusQueueRow.id}
                    </p>
                    <h3 className="text-[1.55rem] font-bold leading-tight tracking-tight text-balance">
                      {focusQueueRow.title}
                    </h3>
                  </div>
                  <AppStatusBadge
                    status={resolveWorkspaceStatusTone(focusQueueRow.status)}
                    label={focusQueueRow.status}
                  />
                </div>

                <div className="max-h-24 overflow-y-auto rounded-[20px] bg-surface-container-lowest px-4 py-3 pr-3">
                  <p className="text-sm leading-6 text-muted-foreground break-all">
                    {focusQueueMode === "ready"
                      ? focusQueueRow.note
                      : focusQueueMode === "calling"
                        ? "Antrean ini sedang dipanggil unit. Lanjutkan ke melayani atau tindak lanjuti bila tamu belum hadir."
                        : "Layanan sedang berjalan di meja unit. Selesaikan dengan catatan saat proses sudah selesai."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0 rounded-[20px] bg-surface-container-lowest px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Pengunjung
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground break-words">
                      {focusQueueRow.userName || "Tamu"}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-[20px] bg-surface-container-lowest px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Layanan
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground break-words">
                      {focusQueueRow.serviceId}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-[20px] bg-surface-container-lowest px-4 py-3 sm:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Catatan
                    </p>
                    <div className="mt-1 max-h-24 overflow-y-auto pr-2">
                      <p className="text-sm font-semibold text-foreground break-all">
                        {focusQueueRow.complaint || focusQueueRow.note}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <AppButton
                    onClick={() => router.push(getInternalPagePath("unit-organisasi", "data-antrean"))}
                  >
                    Buka data antrean
                  </AppButton>
                  <AppButton
                    variant="outline"
                    disabled={!canViewStatistics}
                    onClick={() => router.push(getInternalPagePath("unit-organisasi", "analitik-unit"))}
                  >
                    Buka analitik
                  </AppButton>
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-border bg-surface-container-low px-5 py-10 text-center">
                <p className="text-sm font-semibold">Belum ada antrean siap dipanggil</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Belum ada antrean aktif maupun antrean siap panggil untuk hari ini.
                </p>
              </div>
            )}
          </AppCard>

          <div className="space-y-6">
            <AppCard padding="lg" className="space-y-5">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                  Kontrol Cepat
                </p>
                <h2 className="text-xl font-bold tracking-tight">Akses fitur utama</h2>
              </div>
              <div className="grid gap-3">
                <AppButton onClick={() => router.push(getInternalPagePath("unit-organisasi", "data-antrean"))}>
                  Data antrean
                </AppButton>
                <AppButton
                  variant="outline"
                  disabled={!canViewStatistics}
                  onClick={() => router.push(getInternalPagePath("unit-organisasi", "analitik-unit"))}
                >
                  Analitik unit
                </AppButton>
                <AppButton
                  variant="outline"
                  onClick={() => router.push(getInternalPagePath("unit-organisasi", "profil"))}
                >
                  Profil unit
                </AppButton>
              </div>
            </AppCard>

            <AppCard padding="lg" className="space-y-5">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                  Ringkasan Unit
                </p>
                <h2 className="text-xl font-bold tracking-tight">Konteks kerja hari ini</h2>
              </div>
              <div className="grid gap-3">
                <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Layanan aktif
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                    {identity.unitId || `${operationalRows.length} antrean`}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {identity.unitEntry?.label || "Semua layanan unit pada scope aktif."}
                  </p>
                </div>
                <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Kesiapan tamu
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                    {todayGroupedRows.readyRows.length} siap dipanggil
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Antrean yang sudah check-in dan siap dibaca unit.
                  </p>
                </div>
                <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Loket Aktif
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                    {identity.activeCounterLabel || "Belum dipilih"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {identity.assignedCounters.length > 0
                      ? "Loket ini yang dipakai sesi Anda untuk klaim antrean aktif."
                      : "Akun ini belum punya assignment loket operasional."}
                  </p>
                </div>
              </div>
            </AppCard>
          </div>
        </div>

        <AppCard padding="lg" className="space-y-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              Performa Minggu Ini
            </p>
            <h2 className="text-xl font-bold tracking-tight">Ritme layanan</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Menunggu
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{groupedRows.waitingRows.length}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Belum check-in.</p>
            </div>
            <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Siap Dipanggil
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{groupedRows.readyRows.length}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Sudah hadir.</p>
            </div>
            <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Dipanggil / Dilayani
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight">
                {groupedRows.calledRows.length + groupedRows.inServiceRows.length}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Sedang berjalan.</p>
            </div>
            <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Selesai Hari Ini
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{groupedRows.completedRows.length}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Sudah ditutup.</p>
            </div>
          </div>
        </AppCard>
      </div>
    </DashboardShell>
  );
}
