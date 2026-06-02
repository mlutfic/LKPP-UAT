"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppPageIntro } from "@/components/composite/app-page-intro";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppPagination } from "@/components/ui/app-pagination";
import { AppCard } from "@/components/ui/app-card";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import {
  AppTable,
  AppTableCell,
  AppTableHead,
  AppTableHeaderCell,
  AppTableRow,
} from "@/components/ui/app-table";
import { InternalPermissionFallback } from "@/features/internal/components/internal-permission-fallback";
import { InternalWorkspaceFilterBar } from "@/features/internal/components/internal-workspace-filter-bar";
import {
  resolveFrontdeskAttendanceTone,
  resolveFrontdeskQueueTone,
  type FrontdeskRow,
} from "@/features/internal/components/frontdesk-row-utils";
import { useFrontdeskSettings } from "@/features/internal/use-frontdesk-settings";
import { useStaffRolePermissions } from "@/features/internal/use-staff-role-permissions";
import { useFrontdeskWorkspace } from "@/features/internal/use-frontdesk-workspace";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { callAppointment, lobbyCheckin } from "@/lib/api/appointments";
import {
  describeStaffPermissionRequirement,
  getFirstAccessibleStaffPath,
  getMissingStaffPermissions,
  getStaffRoutePermissionRequirement,
} from "@/lib/internal-role-access";
import { STAFF_CANONICAL_ROUTES } from "@/lib/internal-role-policy";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";

export function FrontdeskDashboardPage({
  page = "dashboard",
}: {
  page?: "dashboard" | "riwayat";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    live,
    config,
    rows,
    filteredRows,
    stats,
    section,
    setSection,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    unitFilter,
    setUnitFilter,
    serviceFilter,
    setServiceFilter,
    unitOptions,
    serviceOptions,
    showAdvancedFilters,
    setShowAdvancedFilters,
    allowProcessing,
    activeCount,
    historyCount,
    resetFilters,
  } = useFrontdeskWorkspace(page);
  const { settings } = useFrontdeskSettings();
  const permissionQuery = useStaffRolePermissions("resepsionis");
  const [confirmRow, setConfirmRow] = React.useState<FrontdeskRow | null>(null);
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);
  const [callingAppointmentId, setCallingAppointmentId] = React.useState<string | null>(null);
  const [isCallingNextReady, setIsCallingNextReady] = React.useState(false);
  const canCheckIn = permissionQuery.permissions?.canCheckIn ?? false;
  const canCallQueue = permissionQuery.permissions?.canCallQueue ?? false;
  const currentPath =
    page === "riwayat"
      ? STAFF_CANONICAL_ROUTES.resepsionis.history
      : STAFF_CANONICAL_ROUTES.resepsionis.dashboard;
  const routeRequirement = getStaffRoutePermissionRequirement("resepsionis", currentPath);
  const missingRoutePermissions = getMissingStaffPermissions(
    routeRequirement,
    permissionQuery.permissions,
  );
  const fallbackPath = getFirstAccessibleStaffPath(
    "resepsionis",
    permissionQuery.permissions,
    currentPath,
  );
  const nextReadyRow = React.useMemo(
    () =>
      rows.find(
        (row) =>
          row.section === "active" &&
          row.queueStatusLabel === "Menunggu Panggilan Unit",
      ) ?? null,
    [rows],
  );
  const pagination = useClientPagination(filteredRows, 10);

  async function handleConfirmCheckin() {
    if (!confirmRow) return;

    if (!canCheckIn) {
      toast.error("Akses check-in tidak aktif untuk role ini.");
      return;
    }

    if (!live.staffId) {
      toast.error("Sesi resepsionis belum aktif.");
      return;
    }

    setIsCheckingIn(true);
    try {
      await lobbyCheckin(confirmRow.appointmentId, { staffId: live.staffId });
      await queryClient.invalidateQueries({
        queryKey: ["staff-live-appointments", live.staffId],
      });
      toast.success("Check-in berhasil dicatat.");
      setConfirmRow(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memproses check-in.";
      toast.error(message);
    } finally {
      setIsCheckingIn(false);
    }
  }

  async function handleCallQueue(row: FrontdeskRow) {
    if (!canCallQueue) {
      toast.error("Akses panggil antrean tidak aktif untuk role ini.");
      return;
    }

    if (!allowProcessing) {
      toast.error("Panggilan antrean hanya bisa diproses untuk hari ini.");
      return;
    }

    if (!live.staffId) {
      toast.error("Sesi resepsionis belum aktif.");
      return;
    }

    setCallingAppointmentId(row.appointmentId);
    try {
      await callAppointment(row.appointmentId);
      await queryClient.invalidateQueries({
        queryKey: ["staff-live-appointments", live.staffId],
      });
      toast.success(`Antrean ${formatQueueNumberForDisplay(row.queueNumber)} berhasil dipanggil.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memanggil antrean.";
      toast.error(message);
    } finally {
      setCallingAppointmentId(null);
    }
  }

  if (missingRoutePermissions.length) {
    return (
      <InternalPermissionFallback
        role="resepsionis"
        currentPath={currentPath}
        title={config?.title ?? "Dashboard Resepsionis"}
        subtitle={config?.description ?? "Check-in tamu hari ini"}
        message={`Akses untuk ${describeStaffPermissionRequirement(routeRequirement)} belum tersedia pada akun resepsionis ini.`}
        primaryHref={fallbackPath}
        primaryLabel="Buka halaman lain"
        secondaryHref={STAFF_CANONICAL_ROUTES.resepsionis.profile}
        secondaryLabel="Lihat profil petugas"
      />
    );
  }

  return (
    <DashboardShell
      role="resepsionis"
      currentPath={currentPath}
      title={config?.title ?? "Dashboard Resepsionis"}
      subtitle={config?.description ?? "Check-in tamu hari ini"}
    >
      <div className="space-y-8">
        <AppPageIntro
          eyebrow={config?.heroEyebrow ?? "Area Frontdesk"}
          title={config?.heroTitle ?? "Check-in lobby hari ini"}
          description={
            config?.heroDescription ??
            "Resepsionis hanya mencatat kehadiran dan menyiapkan antrean untuk unit tujuan."
          }
          actions={
            <>
              {page === "riwayat" ? (
                <AppButton
                  variant="outline"
                  onClick={() => router.push(STAFF_CANONICAL_ROUTES.resepsionis.dashboard)}
                >
                  Dashboard
                </AppButton>
              ) : null}
              <AppButton
                variant="outline"
                onClick={() => router.push(STAFF_CANONICAL_ROUTES.resepsionis.offlineVisitor)}
              >
                Daftar Walk-in
              </AppButton>
              {canCallQueue ? (
                <AppButton
                  variant="outline"
                  loading={isCallingNextReady}
                  loadingLabel="Memanggil..."
                  onClick={() => {
                    if (!nextReadyRow) {
                      toast.message("Belum ada antrean hadir yang siap dipanggil.");
                      return;
                    }

                    setIsCallingNextReady(true);
                    void handleCallQueue(nextReadyRow).finally(() => {
                      setIsCallingNextReady(false);
                    });
                  }}
                >
                  Panggil Antrean
                </AppButton>
              ) : null}
              <AppButton onClick={() => router.push(`${STAFF_CANONICAL_ROUTES.resepsionis.lobby}?mode=scan`)}>
                <QrCode className="size-4" />
                Check-in Lobby
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

        {live.isLiveSession && live.isError ? (
          <p className="text-sm leading-6 text-muted-foreground">Data frontdesk belum bisa dimuat.</p>
        ) : null}

        {!canCheckIn ? (
          <p className="text-sm leading-6 text-muted-foreground">Akses check-in belum tersedia pada sesi ini.</p>
        ) : null}

        {canCallQueue ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Akses panggil antrean aktif. Resepsionis bisa memanggil tamu yang sudah check-in dari dashboard ini.
          </p>
        ) : null}

        <div className="space-y-4">
          <InternalWorkspaceFilterBar
            tabs={[
              { value: "active", label: `Aktif (${activeCount})` },
              { value: "history", label: `Riwayat (${historyCount})` },
            ]}
            activeTab={section}
            onTabChange={(value) => setSection(value as "active" | "history")}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            searchPlaceholder="Cari nomor antrean, nama tamu, NIK, layanan, atau unit"
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            unitFilter={unitFilter}
            onUnitFilterChange={(value) => {
              setUnitFilter(value);
              setServiceFilter("all");
            }}
            serviceFilter={serviceFilter}
            onServiceFilterChange={setServiceFilter}
            unitOptions={unitOptions}
            serviceOptions={serviceOptions}
            showAdvancedFilters={showAdvancedFilters}
            onToggleAdvancedFilters={() => setShowAdvancedFilters((value) => !value)}
            allowProcessing={allowProcessing}
            onResetFilters={resetFilters}
          />

          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {section === "active" ? "Antrean aktif" : "Riwayat antrean"}
          </p>

          <AppTable className="w-full table-fixed [&_th]:whitespace-normal">
            <AppTableHead>
              <tr>
                <AppTableHeaderCell className="w-[10%]">No. Antrean</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[10%]">Pengunjung</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[11%]">NIK</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[15%]">Layanan</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[12%]">Status Kehadiran</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[15%]">Status Antrian</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[14%]">Keterangan</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[13%] text-center">Aksi</AppTableHeaderCell>
              </tr>
            </AppTableHead>
            <tbody>
              {pagination.pageItems.length ? (
                pagination.pageItems.map((row) => {
                  const isCheckinRow =
                    row.attendanceStatusLabel === "Belum Check-in" &&
                    row.section === "active";
                  const isReadyRow =
                    row.queueStatusLabel === "Menunggu Panggilan Unit";
                  return (
                    <AppTableRow
                      key={row.appointmentId}
                      className={
                        settings.highlightReadyQueue && isReadyRow
                          ? "bg-role-accent-soft/35"
                          : undefined
                      }
                    >
                      <AppTableCell
                        className={`break-words font-semibold text-foreground ${
                          settings.compactQueueDensity ? "py-3" : ""
                        }`}
                      >
                        {formatQueueNumberForDisplay(row.queueNumber)}
                      </AppTableCell>
                      <AppTableCell className={settings.compactQueueDensity ? "py-3" : undefined}>
                        <p className="break-words font-semibold text-foreground">
                          {row.userName || "Pengunjung layanan"}
                        </p>
                      </AppTableCell>
                      <AppTableCell className={settings.compactQueueDensity ? "py-3" : undefined}>
                        <p className="break-all font-mono text-sm text-foreground">{row.userNik || "-"}</p>
                      </AppTableCell>
                      <AppTableCell className={settings.compactQueueDensity ? "py-3" : undefined}>
                        <div className="space-y-1">
                          <p className="break-words font-semibold text-foreground">{row.serviceTitle}</p>
                          <p className="break-words text-xs text-muted-foreground">{row.unitLabel}</p>
                        </div>
                      </AppTableCell>
                      <AppTableCell className={settings.compactQueueDensity ? "py-3" : undefined}>
                        <AppStatusBadge
                          status={resolveFrontdeskAttendanceTone(row.attendanceStatusLabel)}
                          label={row.attendanceStatusLabel}
                          className="max-w-full whitespace-normal break-words leading-4"
                        />
                      </AppTableCell>
                      <AppTableCell className={settings.compactQueueDensity ? "py-3" : undefined}>
                        <div className="min-w-0 space-y-1">
                          <AppStatusBadge
                            status={resolveFrontdeskQueueTone(row.queueStatusLabel)}
                            label={row.queueStatusLabel}
                            className="max-w-full whitespace-normal break-words leading-4"
                          />
                          {row.isEscalated && row.finalStatusLabel ? (
                            <AppStatusBadge
                              status={resolveFrontdeskQueueTone(row.finalStatusLabel)}
                              label={row.finalStatusLabel}
                              className="max-w-full whitespace-normal break-words leading-4"
                            />
                          ) : null}
                          {row.queueStatusCaption ? (
                            <p className="break-words text-xs text-muted-foreground">
                              {row.queueStatusCaption}
                            </p>
                          ) : null}
                        </div>
                      </AppTableCell>
                      <AppTableCell
                        className={`break-words whitespace-normal text-muted-foreground ${
                          settings.compactQueueDensity ? "py-3" : ""
                        }`}
                      >
                        {row.note}
                      </AppTableCell>
                      <AppTableCell
                        className={`px-4 break-words whitespace-normal text-center ${
                          settings.compactQueueDensity ? "py-3" : ""
                        }`}
                      >
                        {isCheckinRow && canCheckIn && allowProcessing ? (
                          <div className="mx-auto flex max-w-[7.5rem] flex-col items-stretch gap-2.5">
                            <AppButton
                              size="xs"
                              className="w-full justify-center whitespace-nowrap rounded-xl px-3"
                              onClick={() => setConfirmRow(row)}
                            >
                              <ArrowRight className="size-3.5" />
                              Check-in
                            </AppButton>
                            <AppButton
                              size="xs"
                              variant="outline"
                              className="w-full justify-center whitespace-nowrap rounded-xl px-3"
                              onClick={() =>
                                router.push(
                                  `${STAFF_CANONICAL_ROUTES.resepsionis.lobby}?mode=scan&appointmentId=${encodeURIComponent(row.appointmentId)}&reference=${encodeURIComponent(row.queueNumber)}`,
                                )
                              }
                            >
                              <QrCode className="size-3.5" />
                              Scan QR
                            </AppButton>
                          </div>
                        ) : isCheckinRow && !canCheckIn ? (
                          <span className="mx-auto block max-w-[8rem] break-words text-center text-xs font-medium text-muted-foreground">
                            Akses check-in tidak aktif
                          </span>
                        ) : isReadyRow && canCallQueue && allowProcessing ? (
                          <AppButton
                            size="xs"
                            className="mx-auto w-full max-w-[7.5rem] justify-center whitespace-nowrap rounded-xl px-3"
                            loading={callingAppointmentId === row.appointmentId}
                            loadingLabel="Memanggil..."
                            onClick={() => void handleCallQueue(row)}
                          >
                            Panggil
                          </AppButton>
                        ) : isReadyRow && !canCallQueue ? (
                          <span className="mx-auto block max-w-[8rem] break-words text-center text-xs font-medium text-muted-foreground">
                            Menunggu panggilan unit
                          </span>
                        ) : isReadyRow ? (
                          <span className="mx-auto block max-w-[8rem] break-words text-center text-xs font-medium text-muted-foreground">
                            Panggilan hanya bisa diproses untuk hari ini
                          </span>
                        ) : isCheckinRow ? (
                          <span className="mx-auto block max-w-[8rem] break-words text-center text-xs font-medium text-muted-foreground">
                            Hanya bisa check-in untuk hari ini
                          </span>
                        ) : row.isEscalated ? (
                          <span className="mx-auto block max-w-[8rem] break-words text-center text-xs font-medium text-muted-foreground">
                            Arahkan ke layanan tujuan
                          </span>
                        ) : (
                          <span className="mx-auto block max-w-[8rem] break-words text-center text-xs font-medium text-muted-foreground">
                            Pantau status
                          </span>
                        )}
                      </AppTableCell>
                    </AppTableRow>
                  );
                })
              ) : (
                <AppTableRow>
                  <AppTableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    {section === "active"
                      ? "Belum ada antrean aktif yang cocok dengan filter."
                      : "Belum ada riwayat antrean untuk filter ini."}
                  </AppTableCell>
                </AppTableRow>
              )}
            </tbody>
          </AppTable>

          {filteredRows.length ? (
            <AppPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={pagination.setPage}
              totalItems={pagination.totalItems}
              startItem={pagination.startItem}
              endItem={pagination.endItem}
              itemLabel={section === "history" ? "riwayat" : "antrean"}
            />
          ) : null}
        </div>
      </div>

      <AppDialog
        open={Boolean(confirmRow)}
        onOpenChange={(open) => {
          if (!open) setConfirmRow(null);
        }}
        title="Konfirmasi check-in"
        description="Tandai tamu ini sudah hadir di frontdesk agar unit bisa melihat antrean siap panggil."
      >
        {confirmRow ? (
          <div className="space-y-6">
            <AppCard padding="md" className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Nomor antrean
              </p>
              <p className="text-2xl font-bold text-foreground">
                {formatQueueNumberForDisplay(confirmRow.queueNumber)}
              </p>
              <p className="text-sm text-muted-foreground">{confirmRow.serviceTitle}</p>
            </AppCard>

            <div className="flex flex-wrap justify-end gap-3">
              <AppButton variant="ghost" onClick={() => setConfirmRow(null)}>
                Batal
              </AppButton>
              <AppButton
                loading={isCheckingIn}
                loadingLabel="Memproses..."
                onClick={() => void handleConfirmCheckin()}
              >
                Konfirmasi Check-in
              </AppButton>
            </div>
          </div>
        ) : null}
      </AppDialog>
    </DashboardShell>
  );
}
