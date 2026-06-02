"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppPageIntro } from "@/components/composite/app-page-intro";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppFormField } from "@/components/ui/app-form-field";
import { AppInput } from "@/components/ui/app-input";
import { AppPagination } from "@/components/ui/app-pagination";
import {
  AppSearchSelect,
  type AppSearchSelectOption,
} from "@/components/ui/app-search-select";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppTextarea } from "@/components/ui/app-textarea";
import { InternalPermissionFallback } from "@/features/internal/components/internal-permission-fallback";
import { UnitAntreanTableSection } from "@/features/internal/components/unit-antrean-table-section";
import { InternalWorkspaceUnavailable } from "@/features/internal/components/internal-workspace-unavailable";
import {
  buildFallbackLevel2Rows,
  buildLevel2Stats,
  decorateLevel2HistoryRows,
  isLevel2ReadOnlyHistoryRow,
  prioritizeLevel2Rows,
  scopeLevel2Rows,
} from "@/features/internal/level-2/workspace";
import {
  getInternalPageConfig,
  getInternalPagePath,
} from "@/features/internal/internal-workspace-config";
import { useLevel2Settings } from "@/features/internal/use-level-2-settings";
import {
  seedLiveStaffAppointmentsCache,
  useLiveStaffAppointments,
} from "@/features/internal/use-live-staff-appointments";
import { useStaffRolePermissions } from "@/features/internal/use-staff-role-permissions";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  buildLiveUnitRows,
  filterUnitRows,
  groupUnitRows,
  isUnitCompletedRow,
  isUnitUnprocessedRow,
  sortUnitHistoryRows,
  type UnitWorkspaceRow,
} from "@/features/internal/unit/workspace";
import { getUnitWorkspaceIdentity } from "@/features/internal/unit-organisasi-content";
import { getInternalUnavailableCopy } from "@/features/internal/internal-workspace-registry";
import type { WorkspaceActionDescriptor } from "@/features/internal/internal-workspace-actions";
import { addStaffNote, updateAppointmentStatus } from "@/lib/api/appointments";
import {
  describeStaffPermissionRequirement,
  getFirstAccessibleStaffPath,
  getMissingStaffPermissions,
  getStaffRoutePermissionRequirement,
} from "@/lib/internal-role-access";

type DialogMode = "Catatan" | "Selesaikan";

type ActionDialogState = {
  mode: DialogMode;
  row: UnitWorkspaceRow;
} | null;

function buildLevel2PermissionError(actionLabel: WorkspaceActionDescriptor["label"] | DialogMode) {
  if (actionLabel === "Catatan") {
    return "Akses untuk menambah catatan level 2 belum tersedia.";
  }

  return "Akses untuk memulai atau menutup layanan level 2 belum tersedia.";
}

function patchFallbackLevel2Rows(
  rows: UnitWorkspaceRow[],
  row: UnitWorkspaceRow,
  actionLabel: WorkspaceActionDescriptor["label"] | DialogMode,
  note?: string,
) {
  return rows.map((entry) => {
    if (entry.id !== row.id) {
      return entry;
    }

    if (actionLabel === "Melayani") {
      return {
        ...entry,
        status: "Sedang Dilayani",
        rawStatus: "in-service",
        note:
          entry.note ||
          "Layanan level 2 sedang berjalan di meja tindak lanjut.",
      };
    }

    if (actionLabel === "Catatan") {
      return {
        ...entry,
        note: note?.trim() || entry.note,
      };
    }

    if (actionLabel === "Selesaikan") {
      return {
        ...entry,
        status: "Selesai",
        rawStatus: "completed",
        note:
          note?.trim() ||
          "Layanan level 2 ditutup oleh petugas tindak lanjut.",
      };
    }

    return entry;
  });
}

export function Level2OperationsPage() {
  const queryClient = useQueryClient();
  const pageConfig = getInternalPageConfig("petugas-level-2", "inbox-eskalasi");
  const hydrated = useHydrated();
  const live = useLiveStaffAppointments();
  const permissionQuery = useStaffRolePermissions("petugas-level-2");
  const currentPath = getInternalPagePath("petugas-level-2", "inbox-eskalasi");
  const { settings } = useLevel2Settings();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [serviceFilter, setServiceFilter] = React.useState("all");
  const [dialogState, setDialogState] = React.useState<ActionDialogState>(null);
  const [dialogNote, setDialogNote] = React.useState("");
  const [actionBusyKey, setActionBusyKey] = React.useState<string | null>(null);
  const [fallbackRows, setFallbackRows] = React.useState<UnitWorkspaceRow[]>(() =>
    buildFallbackLevel2Rows(),
  );

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
  const canStartService =
    !isPermissionLoading &&
    (permissions?.canStartService ?? false);
  const canAddStaffNote =
    !isPermissionLoading &&
    (permissions?.canAddStaffNote ?? false);
  const identity = React.useMemo(
    () => getUnitWorkspaceIdentity(live.session, live.appointments),
    [live.appointments, live.session],
  );
  const isLivePending = live.isLoading && live.appointments === null && !live.isError;
  const liveRows = React.useMemo(() => buildLiveUnitRows(live.appointments), [live.appointments]);

  const sourceRows =
    live.appointments
      ? liveRows
      : !live.isLiveSession
        ? fallbackRows
        : [];

  const scopedRows = React.useMemo(
    () => scopeLevel2Rows(sourceRows, identity.unitId),
    [identity.unitId, sourceRows],
  );
  const level2ServiceOptions = React.useMemo<AppSearchSelectOption[]>(
    () =>
      identity.unitServices.map((service) => ({
        value: service.id,
        label: `${service.id} · ${service.title}`,
        keywords: [service.officialName, service.groupLabel, service.unitLabel],
      })),
    [identity.unitServices],
  );

  React.useEffect(() => {
    if (
      serviceFilter !== "all" &&
      !level2ServiceOptions.some((option) => option.value === serviceFilter)
    ) {
      setServiceFilter("all");
    }
  }, [level2ServiceOptions, serviceFilter]);

  const filteredRows = React.useMemo(
    () =>
      filterUnitRows(scopedRows, {
        searchQuery,
        serviceFilter,
        datePredicate: () => true,
      }),
    [scopedRows, searchQuery, serviceFilter],
  );

  const readOnlyHistoryRows = React.useMemo(
    () =>
      sortUnitHistoryRows(
        decorateLevel2HistoryRows(
          filteredRows.filter((row) =>
            isLevel2ReadOnlyHistoryRow(row, identity.unitId),
          ),
          identity.unitId,
        ),
      ),
    [filteredRows, identity.unitId],
  );
  const operationalRows = React.useMemo(
    () =>
      filteredRows.filter(
        (row) => !isLevel2ReadOnlyHistoryRow(row, identity.unitId),
      ),
    [filteredRows, identity.unitId],
  );
  const groupedRows = React.useMemo(() => groupUnitRows(operationalRows), [operationalRows]);
  const activeInboxRows = React.useMemo(
    () =>
      prioritizeLevel2Rows(
        operationalRows.filter(
          (row) => !isUnitCompletedRow(row) && !isUnitUnprocessedRow(row),
        ),
        settings.highlightEscalationQueue,
      ),
    [operationalRows, settings.highlightEscalationQueue],
  );
  const historyRows = React.useMemo(
    () =>
      sortUnitHistoryRows([
        ...groupedRows.completedRows,
        ...groupedRows.unprocessedRows,
        ...readOnlyHistoryRows,
      ]),
    [groupedRows.completedRows, groupedRows.unprocessedRows, readOnlyHistoryRows],
  );
  const activePagination = useClientPagination(activeInboxRows, 10);
  const historyPagination = useClientPagination(historyRows, 10);
  const setActivePage = activePagination.setPage;
  const setHistoryPage = historyPagination.setPage;
  const escalationInboxCount = React.useMemo(
    () =>
      operationalRows.filter(
        (row) =>
          row.isEscalated && !isUnitCompletedRow(row) && !isUnitUnprocessedRow(row),
      ).length,
    [operationalRows],
  );
  const previousEscalationCountRef = React.useRef<number | null>(null);

  const stats = React.useMemo(() => buildLevel2Stats(groupedRows), [groupedRows]);

  React.useEffect(() => {
    if (!settings.playEscalationAlert) {
      previousEscalationCountRef.current = escalationInboxCount;
      return;
    }

    if (
      previousEscalationCountRef.current !== null &&
      escalationInboxCount > previousEscalationCountRef.current
    ) {
      const delta = escalationInboxCount - previousEscalationCountRef.current;
      toast.success(
        delta === 1
          ? "1 antrean eskalasi baru masuk ke inbox level 2."
          : `${delta} antrean eskalasi baru masuk ke inbox level 2.`,
      );
    }

    previousEscalationCountRef.current = escalationInboxCount;
  }, [escalationInboxCount, settings.playEscalationAlert]);

  React.useEffect(() => {
    setActivePage(1);
    setHistoryPage(1);
  }, [
    searchQuery,
    serviceFilter,
    setActivePage,
    setHistoryPage,
  ]);

  const handleAction = React.useCallback(
    async (row: UnitWorkspaceRow, action: WorkspaceActionDescriptor) => {
      if (action.label === "Catatan" || action.label === "Selesaikan") {
        setDialogState({ mode: action.label, row });
        setDialogNote("");
        return;
      }

      if (action.label !== "Melayani") {
        return;
      }

      if (!canStartService) {
        toast.error(buildLevel2PermissionError(action.label));
        return;
      }

      const key = `${row.appointmentId ?? row.id}:${action.label}`;
      setActionBusyKey(key);

      try {
        if (live.isLiveSession && live.staffId && row.appointmentId) {
          const actor = { staffId: live.staffId };
          await updateAppointmentStatus(row.appointmentId, "in-service", actor);
          seedLiveStaffAppointmentsCache(queryClient, live.staffId, row.appointmentId, {
            status: "in-service",
          });
          await queryClient.invalidateQueries({
            queryKey: ["staff-live-appointments", live.staffId],
          });
        } else {
          setFallbackRows((current) =>
            patchFallbackLevel2Rows(current, row, action.label),
          );
        }

        if (settings.autoOpenClosingNotes && canAddStaffNote) {
          setDialogState({
            mode: "Catatan",
            row: {
              ...row,
              status: "Sedang Dilayani",
              rawStatus: "in-service",
            },
          });
          setDialogNote("");
          toast.success("Layanan level 2 dimulai. Form ini hanya menyimpan catatan proses, belum menutup layanan.");
          return;
        }

        toast.success("Layanan level 2 berhasil dimulai.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Gagal memulai layanan level 2.";
        toast.error(message);
      } finally {
        setActionBusyKey(null);
      }
    },
    [
      canAddStaffNote,
      canStartService,
      live.isLiveSession,
      live.staffId,
      queryClient,
      settings.autoOpenClosingNotes,
    ],
  );

  const handleDialogSubmit = React.useCallback(async () => {
    if (!dialogState) {
      return;
    }

    const requiredPermission =
      dialogState.mode === "Catatan" ? canAddStaffNote : canStartService;
    if (!requiredPermission) {
      toast.error(buildLevel2PermissionError(dialogState.mode));
      return;
    }

    const trimmedNote = dialogNote.trim();
    if (dialogState.mode === "Catatan" && trimmedNote.length < 10) {
      toast.error("Catatan level 2 minimal 10 karakter.");
      return;
    }

    if (dialogState.mode === "Selesaikan" && trimmedNote.length < 20) {
      toast.error("Catatan penutupan minimal 20 karakter agar histori tetap terbaca.");
      return;
    }

    const key = `${dialogState.row.appointmentId ?? dialogState.row.id}:${dialogState.mode}`;
    setActionBusyKey(key);

    try {
      if (live.isLiveSession && live.staffId && dialogState.row.appointmentId) {
        const actor = { staffId: live.staffId };
        await addStaffNote(dialogState.row.appointmentId, trimmedNote, actor);

        if (dialogState.mode === "Selesaikan") {
          await updateAppointmentStatus(dialogState.row.appointmentId, "completed", actor);
          seedLiveStaffAppointmentsCache(queryClient, live.staffId, dialogState.row.appointmentId, {
            status: "completed",
            note: trimmedNote,
          });
        } else {
          seedLiveStaffAppointmentsCache(queryClient, live.staffId, dialogState.row.appointmentId, {
            note: trimmedNote,
          });
        }

        await queryClient.invalidateQueries({
          queryKey: ["staff-live-appointments", live.staffId],
        });
      } else {
        setFallbackRows((current) =>
          patchFallbackLevel2Rows(
            current,
            dialogState.row,
            dialogState.mode,
            trimmedNote,
          ),
        );
      }

      toast.success(`${dialogState.mode} level 2 berhasil diperbarui.`);
      setDialogState(null);
      setDialogNote("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memperbarui data level 2.";
      toast.error(message);
    } finally {
      setActionBusyKey(null);
    }
  }, [
    canAddStaffNote,
    canStartService,
    dialogNote,
    dialogState,
    live.isLiveSession,
    live.staffId,
    queryClient,
  ]);

  if (!pageConfig) {
    const fallback = getInternalUnavailableCopy("petugas-level-2");
    return (
      <DashboardShell
        role="petugas-level-2"
        currentPath={getInternalPagePath("petugas-level-2", "dashboard")}
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
        title={pageConfig.title}
        subtitle={pageConfig.description}
      >
        <div className="space-y-6">
          <p className="text-sm leading-6 text-muted-foreground">Inbox level 2 sedang dimuat.</p>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {["Inbox Aktif", "Siap Ditangani", "Sedang Dilayani", "Selesai"].map((label) => (
              <AppStatCard
                key={label}
                label={label}
                value="..."
                description="Memuat data level 2"
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
        title={pageConfig.title}
        subtitle={pageConfig.description}
      >
        <div className="space-y-6">
          <p className="text-sm leading-6 text-muted-foreground">Inbox level 2 sedang dimuat.</p>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {["Inbox Aktif", "Siap Ditangani", "Sedang Dilayani", "Selesai"].map((label) => (
              <AppStatCard
                key={label}
                label={label}
                value="..."
                description="Memuat data level 2"
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
        title={pageConfig.title}
        subtitle={pageConfig.description}
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
      title={pageConfig.title}
      subtitle={pageConfig.description}
    >
      <div className="space-y-8">
        <AppPageIntro
          eyebrow={pageConfig.heroEyebrow}
          title={pageConfig.heroTitle}
          description={pageConfig.heroDescription}
          actions={
            <div className="w-full sm:w-[320px]">
              <AppSearchSelect
                value={serviceFilter}
                onValueChange={setServiceFilter}
                options={[{ value: "all", label: "Semua layanan" }, ...level2ServiceOptions]}
                placeholder="Semua layanan"
                searchPlaceholder="Cari layanan"
                emptyMessage="Layanan tidak ditemukan."
                className="w-full"
              />
            </div>
          }
        />

        <p className="text-sm leading-6 text-muted-foreground">
          {live.isLiveSession
            ? "Angka dan daftar inbox diperbarui otomatis tanpa refresh manual."
            : "Mode fallback lokal aktif. Muat ulang sesi bila data live belum masuk."}
        </p>

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

        <AppCard padding="lg" className="space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              Pencarian inbox
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              Cari nomor antrean, nama pengunjung, layanan, atau alasan eskalasi.
            </p>
          </div>
          <AppInput
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Cari antrean, layanan, atau nama"
          />
        </AppCard>

        <UnitAntreanTableSection
          title={pageConfig.tableEyebrow}
          description={pageConfig.workspaceNote || pageConfig.insightDescription}
          rows={activePagination.pageItems}
          role="petugas-level-2"
          page="inbox-eskalasi"
          actionBusyKey={actionBusyKey}
          permissions={permissions}
          compact={settings.compactInboxDensity}
          highlightEscalated={settings.highlightEscalationQueue}
          onAction={(row, action) => {
            void handleAction(row, action);
          }}
          emptyMessage="Belum ada antrean level 2 yang cocok dengan filter aktif."
        />
        {activePagination.totalItems > 0 ? (
          <AppPagination
            page={activePagination.page}
            totalPages={activePagination.totalPages}
            onPageChange={activePagination.setPage}
            totalItems={activePagination.totalItems}
            startItem={activePagination.startItem}
            endItem={activePagination.endItem}
            itemLabel="antrean level 2"
          />
        ) : null}

        <UnitAntreanTableSection
          title="Riwayat level 2"
          description="Antrean level 2 yang sudah selesai, tidak diproses, atau diarsipkan baca-saja tetap tersimpan di histori."
          rows={historyPagination.pageItems}
          role="petugas-level-2"
          page="inbox-eskalasi"
          actionBusyKey={actionBusyKey}
          permissions={permissions}
          readOnly
          compact={settings.compactInboxDensity}
          highlightEscalated={settings.highlightEscalationQueue}
          onAction={(row, action) => {
            void handleAction(row, action);
          }}
          emptyMessage="Belum ada riwayat layanan level 2 yang cocok dengan filter aktif."
        />
        {historyPagination.totalItems > 0 ? (
          <AppPagination
            page={historyPagination.page}
            totalPages={historyPagination.totalPages}
            onPageChange={historyPagination.setPage}
            totalItems={historyPagination.totalItems}
            startItem={historyPagination.startItem}
            endItem={historyPagination.endItem}
            itemLabel="riwayat level 2"
          />
        ) : null}

        <AppDialog
          open={Boolean(dialogState)}
          onOpenChange={(open) => {
            if (!open) {
              setDialogState(null);
              setDialogNote("");
            }
          }}
          title={dialogState?.mode === "Selesaikan" ? "Tutup layanan" : "Tambah catatan"}
          description={
            dialogState?.mode === "Selesaikan"
              ? "Tulis ringkasan singkat sebelum ditutup."
              : "Catatan ini menjelaskan tindak lanjut level 2."
          }
        >
          <div className="space-y-4">
            {dialogState?.mode === "Catatan" ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                Catatan ini hanya menyimpan progres layanan. Antrean baru benar-benar selesai setelah aksi
                {" "}
                <span className="font-semibold">Selesaikan</span>
                {" "}
                dijalankan.
              </p>
            ) : null}
            <AppFormField
              label={dialogState?.mode === "Selesaikan" ? "Ringkasan penutupan" : "Catatan petugas"}
              description={
                dialogState?.mode === "Selesaikan"
                  ? "Minimal 20 karakter."
                  : "Minimal 10 karakter."
              }
            >
              <AppTextarea
                value={dialogNote}
                onChange={(event) => setDialogNote(event.target.value)}
                placeholder={
                  dialogState?.mode === "Selesaikan"
                    ? "Tulis ringkasan hasil layanan"
                    : "Tulis catatan tindak lanjut"
                }
                rows={5}
              />
            </AppFormField>
            <div className="flex flex-wrap justify-end gap-3">
              <AppButton
                variant="outline"
                onClick={() => {
                  setDialogState(null);
                  setDialogNote("");
                }}
              >
                Batal
              </AppButton>
              <AppButton
                loading={Boolean(dialogState && actionBusyKey)}
                loadingLabel="Menyimpan..."
                onClick={() => {
                  void handleDialogSubmit();
                }}
              >
                {dialogState?.mode === "Selesaikan" ? "Simpan & Selesaikan" : "Simpan Catatan"}
              </AppButton>
            </div>
          </div>
        </AppDialog>
      </div>
    </DashboardShell>
  );
}
