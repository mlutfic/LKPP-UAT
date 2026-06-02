"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { AppPageIntro } from "@/components/composite/app-page-intro";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import {
  createAppDateFilterValue,
  isDateWithinAppDateFilter,
  type AppDateFilterValue,
} from "@/components/ui/app-date-filter";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppFormField } from "@/components/ui/app-form-field";
import { AppNotice } from "@/components/ui/app-notice";
import {
  AppSearchSelect,
  type AppSearchSelectOption,
} from "@/components/ui/app-search-select";
import { AppSelect } from "@/components/ui/app-select";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { UnitWorkspaceScopeCard } from "@/features/internal/components/unit-workspace-scope-card";
import { AppTextarea } from "@/components/ui/app-textarea";
import {
  bookingServices,
  getBookingServiceById,
} from "@/content/service-booking-content";
import { InternalPermissionFallback } from "@/features/internal/components/internal-permission-fallback";
import {
  getInternalPageConfig,
  getInternalPagePath,
  type InternalPageKey,
} from "@/features/internal/internal-workspace-config";
import {
  getWorkspaceRowActions,
  getWorkspaceRowAssistText,
  normalizeWorkspaceStatus,
  resolveWorkspaceStatusTone,
  type WorkspaceActionDescriptor,
} from "@/features/internal/internal-workspace-actions";
import {
  seedLiveStaffAppointmentsCache,
  useLiveStaffAppointments,
} from "@/features/internal/use-live-staff-appointments";
import { useActiveStaffRole } from "@/features/internal/use-active-staff-role";
import { useUnitWorkspaceScope } from "@/features/internal/use-unit-workspace-scope";
import { useStaffRolePermissions } from "@/features/internal/use-staff-role-permissions";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  addUnitStaffNote,
  callAppointment,
  deferUnitAppointment,
  recallDeferredUnitAppointment,
  reassignUnitAppointmentService,
  updateUnitAppointmentStatus,
} from "@/lib/api/appointments";
import {
  buildDerivedUnitStats,
  buildFallbackUnitRows,
  buildLiveUnitRows,
  decorateUnitRowsForScope,
  filterUnitRows,
  getUnitRowCounterId,
  groupUnitRows,
  isUnitDeferredRow,
  isUnitHandoffRow,
  sortUnitHistoryRows,
  scopeUnitRowsToUnit,
  type UnitWorkspaceRow,
} from "@/features/internal/unit/workspace";
import { getUnitWorkspaceIdentity } from "@/features/internal/unit-organisasi-content";
import { InternalWorkspaceFilterBar } from "@/features/internal/components/internal-workspace-filter-bar";
import { UnitAntreanTableSection } from "@/features/internal/components/unit-antrean-table-section";
import {
  type StaffPermissionKey,
  type StaffPermissionSet,
} from "@/lib/internal-role-policy";
import {
  describeStaffPermissionRequirement,
  getFirstAccessibleStaffPath,
  getMissingStaffPermissions,
  getStaffRoutePermissionRequirement,
} from "@/lib/internal-role-access";
import {
  resolveServiceUnitId,
} from "@/lib/unit-escalation-flow";
import { persistMockSession } from "@/lib/mock-auth";

type DialogMode =
  | "Catatan"
  | "Ganti Layanan"
  | "Eskalasi"
  | "Selesaikan";

type ActionDialogState = {
  mode: DialogMode;
  row: UnitWorkspaceRow;
} | null;

const UNIT_PERMISSION_COPY: Record<StaffPermissionKey, string> = {
  canCallQueue: "memanggil antrean",
  canConfirmAppointment: "mengonfirmasi janji temu",
  canMarkNoShow: "menandai no-show",
  canStartService: "memulai, menyelesaikan, dan mengeskalasi layanan",
  canPrioritizeQueue: "memprioritaskan antrean",
  canCancelAppointment: "membatalkan janji temu",
  canAddStaffNote: "menambah catatan unit",
  canCheckIn: "melakukan check-in",
  canViewDashboard: "melihat dashboard",
  canViewOwnUnor: "melihat unit sendiri",
  canViewAllServices: "melihat semua layanan",
  canViewStatistics: "melihat statistik",
  canExportData: "mengekspor data",
  canViewAudit: "melihat audit",
  canManageServices: "mengelola layanan",
  canManageStaff: "mengelola petugas",
  canManageAnnouncements: "mengelola pengumuman",
  canManageOperatingSettings: "mengelola pengaturan operasional",
  canRunSystemMaintenance: "menjalankan maintenance sistem",
  canManageUnorConfig: "mengelola konfigurasi unit",
  canManageRolePermissions: "mengelola hak akses role",
  canViewSystemHealth: "melihat kesehatan sistem",
};

function getRequiredUnitPermission(
  actionLabel: WorkspaceActionDescriptor["label"] | DialogMode,
): StaffPermissionKey | null {
  switch (actionLabel) {
    case "Panggil":
    case "Panggil Ulang":
      return "canCallQueue";
    case "Catatan":
      return "canAddStaffNote";
    case "Melayani":
    case "Selesaikan":
    case "Eskalasi":
    case "Ganti Layanan":
      return "canStartService";
    case "Lewati Dulu":
      return "canMarkNoShow";
    default:
      return null;
  }
}

function canRunUnitAction(
  actionLabel: WorkspaceActionDescriptor["label"] | DialogMode,
  permissions: StaffPermissionSet | null | undefined,
) {
  const requiredPermission = getRequiredUnitPermission(actionLabel);
  if (!requiredPermission) {
    return true;
  }

  return permissions?.[requiredPermission] ?? false;
}

function buildUnitPermissionError(
  actionLabel: WorkspaceActionDescriptor["label"] | DialogMode,
) {
  const requiredPermission = getRequiredUnitPermission(actionLabel);
  if (!requiredPermission) {
    return "Aksi unit sedang nonaktif untuk role ini.";
  }

  return `Hak akses untuk ${UNIT_PERMISSION_COPY[requiredPermission]} sedang nonaktif.`;
}

function buildDeferredQueueNote(callCount: number) {
  return callCount >= 3
    ? "Lewati sementara: Pengguna belum hadir setelah 3 kali panggilan. Unit melayani antrean berikutnya lebih dulu dan antrean ini akan dipanggil ulang setelah antrean siap biasa selesai."
    : "Lewati sementara: Pengguna belum hadir saat dipanggil. Unit melayani antrean berikutnya lebih dulu dan antrean ini akan dipanggil ulang setelah antrean siap biasa selesai.";
}

function resolveUnitEscalationServiceLabel(
  serviceId: string,
  format: "official" | "title" = "official",
) {
  const normalizedServiceId = serviceId.trim().toUpperCase();
  if (!normalizedServiceId) {
    return format === "title" ? "layanan aktif" : "layanan unit aktif";
  }

  const service = getBookingServiceById(normalizedServiceId);

  if (!service) {
    return normalizedServiceId;
  }

  if (format === "title") {
    return service.title || service.officialName || normalizedServiceId;
  }

  return service.officialName || service.title || normalizedServiceId;
}

function buildUnitEscalationOperationalNote(args: {
  unitId?: string;
  sourceServiceId?: string;
  targetServiceId: string;
  reason?: string;
  originCounterNumber?: number;
}) {
  const sourceLabel = resolveUnitEscalationServiceLabel(args.sourceServiceId || "");
  const targetLabel = resolveUnitEscalationServiceLabel(args.targetServiceId);
  const normalizedReason = args.reason?.trim();
  const originCounterLine =
    typeof args.originCounterNumber === "number" && Number.isFinite(args.originCounterNumber)
      ? `\nAsal loket: Loket ${Math.trunc(args.originCounterNumber)}`
      : "";

  return normalizedReason
    ? `Eskalasi dari ${sourceLabel} ke ${targetLabel}. Alasan: ${normalizedReason}${originCounterLine}`
    : `Eskalasi dari ${sourceLabel} ke ${targetLabel}.${originCounterLine}`;
}

function buildUnitEscalationFeedback(args: {
  unitId?: string;
  sourceServiceId?: string;
  serviceId: string;
}) {
  const serviceLabel = resolveUnitEscalationServiceLabel(args.serviceId, "title");
  return `Eskalasi dikirim ke inbox level 2 untuk ${serviceLabel}.`;
}

function isUnitFirstCallAction(actionLabel: string) {
  return actionLabel === "Panggil";
}

function isUnitRecallAction(actionLabel: string) {
  return actionLabel === "Panggil Ulang";
}

function isUnitReadyDeferredRecallAction(
  row: Pick<UnitWorkspaceRow, "status" | "isDeferred">,
  actionLabel: string,
) {
  return (
    actionLabel === "Panggil Ulang" &&
    Boolean(row.isDeferred) &&
    normalizeWorkspaceStatus(row.status).includes("siap dipanggil")
  );
}

function isUnitReadyCallAction(
  row: Pick<UnitWorkspaceRow, "status" | "isDeferred">,
  actionLabel: string,
) {
  return isUnitFirstCallAction(actionLabel) || isUnitReadyDeferredRecallAction(row, actionLabel);
}

function isUnitDeferredActiveRecallAction(
  row: Pick<UnitWorkspaceRow, "rawStatus" | "status" | "isRecalledDeferred">,
  actionLabel: string,
) {
  return (
    actionLabel === "Panggil" &&
    Boolean(row.isRecalledDeferred) &&
    normalizeWorkspaceStatus(row.rawStatus || row.status) === "calling"
  );
}

function isRowLockedToOtherCounter(
  row: UnitWorkspaceRow,
  activeCounterNumber?: number,
) {
  return false;
}

function hasInternalTransferSummary(note: string | null | undefined) {
  return /^oper internal di\b/i.test((note || "").trim());
}

function mergeInternalTransferNote(
  currentNote: string | null | undefined,
  detail: string,
) {
  const summary = (currentNote || "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => hasInternalTransferSummary(line));

  return summary ? `${summary}\n${detail}` : detail;
}

function patchFallbackRows(
  rows: UnitWorkspaceRow[],
  row: UnitWorkspaceRow,
  actionLabel: string,
  payload: { note?: string; serviceId?: string } = {},
) {
  const nextRows = rows.map((entry) => ({ ...entry }));
  const index = nextRows.findIndex((entry) => entry.id === row.id);
  if (index < 0) {
    return nextRows;
  }

  const target = { ...nextRows[index] };
  const status = normalizeWorkspaceStatus(target.status);
  const currentCallCount = Math.max(target.callCount ?? 0, 0);

  if (isUnitReadyDeferredRecallAction(target, actionLabel)) {
    target.callCount = currentCallCount + 1;
    target.status = "Dipanggil";
    target.rawStatus = "calling";
    target.note = hasInternalTransferSummary(target.note)
      ? mergeInternalTransferNote(
          target.note,
          "Unit sudah memanggil ulang antrean ini ke meja layanan.",
        )
      : "Unit sudah memanggil ulang antrean ini ke meja layanan.";
    target.isDeferred = false;
    target.isRecalledDeferred = true;
  } else if (isUnitDeferredActiveRecallAction(target, actionLabel)) {
    target.callCount = currentCallCount + 1;
    target.status = "Dipanggil";
    target.rawStatus = "calling";
    target.note = hasInternalTransferSummary(target.note)
      ? mergeInternalTransferNote(
          target.note,
          "Unit sudah memanggil ulang antrean ini ke meja layanan.",
        )
      : "Unit sudah memanggil ulang antrean ini ke meja layanan.";
    target.isDeferred = false;
    target.isRecalledDeferred = true;
  } else if (isUnitFirstCallAction(actionLabel)) {
    target.callCount = 1;
    target.status = "Dipanggil";
    target.rawStatus = "calling";
    target.note = hasInternalTransferSummary(target.note)
      ? mergeInternalTransferNote(
          target.note,
          "Unit sudah memanggil antrean ini ke meja layanan.",
        )
      : "Unit sudah memanggil antrean ini ke meja layanan.";
    target.isDeferred = false;
    target.isRecalledDeferred = false;
  } else if (isUnitRecallAction(actionLabel)) {
    const normalizedCurrentCallCount = Math.max(target.callCount ?? 1, 1);
    target.callCount = Math.min(normalizedCurrentCallCount + 1, 3);
    target.status = "Dipanggil";
    target.rawStatus = "calling";
    target.note = hasInternalTransferSummary(target.note)
      ? mergeInternalTransferNote(
          target.note,
          "Unit sudah memanggil antrean ini ke meja layanan.",
        )
      : "Unit sudah memanggil antrean ini ke meja layanan.";
    target.isDeferred = false;
    target.isRecalledDeferred = false;
  } else if (actionLabel === "Melayani") {
    target.status = "Sedang Dilayani";
    target.rawStatus = "in-service";
    target.note = hasInternalTransferSummary(target.note)
      ? mergeInternalTransferNote(
          target.note,
          payload.note?.trim() || "Layanan sedang berlangsung di meja unit.",
        )
      : payload.note?.trim() || "Layanan sedang berlangsung di meja unit.";
    target.isDeferred = false;
    target.isRecalledDeferred = false;
  } else if (actionLabel === "Selesaikan") {
    target.status = "Selesai";
    target.rawStatus = "completed";
    target.note = hasInternalTransferSummary(target.note)
      ? mergeInternalTransferNote(
          target.note,
          payload.note?.trim() || "Layanan ditutup oleh petugas unit.",
        )
      : payload.note?.trim() || "Layanan ditutup oleh petugas unit.";
  } else if (actionLabel === "Lewati Dulu") {
    target.status = "Siap Dipanggil";
    target.rawStatus = "confirmed";
    target.checkedIn = true;
    target.isDeferred = true;
    target.isRecalledDeferred = false;
    target.note = payload.note?.trim() || buildDeferredQueueNote(Math.max(target.callCount ?? 0, 0));
  } else if (actionLabel === "Catatan") {
    target.note = payload.note?.trim() || target.note;
  } else if (actionLabel === "Ganti Layanan") {
    const nextServiceId = payload.serviceId?.trim().toUpperCase();
    if (nextServiceId) {
      target.serviceId = nextServiceId;
      target.counterId = undefined;
      target.note = `Layanan dipindahkan ke ${nextServiceId}.`;
    }
  } else if (actionLabel === "Eskalasi") {
    const nextServiceId = payload.serviceId?.trim().toUpperCase();
    if (nextServiceId) {
      const unitId = row.unitId || resolveServiceUnitId(row.serviceId || row.id);
      target.status = "Siap Dipanggil";
      target.rawStatus = "confirmed";
      target.checkedIn = true;
      target.counterId = undefined;
      target.isDeferred = false;
      target.isRecalledDeferred = false;
      target.serviceId = nextServiceId;
      target.unitId = resolveServiceUnitId(nextServiceId) || target.unitId;
      target.serviceLevel =
        getBookingServiceById(nextServiceId)?.serviceLevel === 2 ? 2 : 1;
      target.isEscalated = true;
      target.note = buildUnitEscalationOperationalNote({
        unitId,
        sourceServiceId: row.serviceId,
        targetServiceId: nextServiceId,
        reason: payload.note,
        originCounterNumber: row.counterId,
      });
    }
  } else if (actionLabel === "Menunggu Giliran" && status.includes("siap dipanggil")) {
    target.note = "Antrean ini sudah check-in dan menunggu panggilan unit.";
  }

  nextRows[index] = target;
  return nextRows;
}

function UnitActionChip({
  action,
  busy = false,
  disabled = false,
  onClick,
}: {
  action: WorkspaceActionDescriptor;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneClass =
    action.tone === "primary"
      ? "border-role-accent/20 bg-role-accent text-white"
      : action.tone === "secondary"
        ? "border-border bg-surface-container-low text-foreground"
        : "border-transparent bg-surface-container-low text-muted-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold transition-opacity ${toneClass} ${disabled || busy ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      {action.tone === "primary" ? <ArrowRight className="size-3" /> : null}
      {busy ? "Memproses..." : action.label}
    </button>
  );
}

function UnitQueueCard({
  page,
  row,
  nextReadyRowId,
  actionBusyKey,
  permissions,
  activeCounterNumber,
  onAction,
}: {
  page: InternalPageKey;
  row: UnitWorkspaceRow;
  nextReadyRowId?: string | null;
  actionBusyKey: string | null;
  permissions?: Partial<StaffPermissionSet> | null;
  activeCounterNumber?: number;
  onAction: (row: UnitWorkspaceRow, action: WorkspaceActionDescriptor) => void;
}) {
  const lockedToOtherCounter = isRowLockedToOtherCounter(row, activeCounterNumber);
  const displayCounterId = getUnitRowCounterId(row);
  const actions = lockedToOtherCounter
    ? []
    : getWorkspaceRowActions(
        "unit-organisasi",
        page,
        row,
        nextReadyRowId,
        permissions,
      );
  const assistText = getWorkspaceRowAssistText(
    "unit-organisasi",
    page,
    row,
    nextReadyRowId,
  );
  const showDeferredMeta =
    isUnitDeferredRow(row) && normalizeWorkspaceStatus(row.status).includes("siap dipanggil");
  const showRequeueMeta = (row.callCount ?? 0) > 0 && normalizeWorkspaceStatus(row.status).includes("siap dipanggil");

  return (
    <AppCard padding="md" className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {row.displayQueueNumber || row.id}
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{row.title}</h3>
          {(showDeferredMeta || showRequeueMeta) ? (
            <div className="flex flex-wrap gap-2">
              {typeof displayCounterId === "number" ? (
                <span className="inline-flex min-h-7 items-center rounded-full border border-role-accent/20 bg-role-accent-soft px-2.5 text-[11px] font-semibold text-role-accent-strong">
                  Loket {displayCounterId}
                </span>
              ) : null}
              {showDeferredMeta ? (
                <span className="inline-flex min-h-7 items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 text-[11px] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  Dilewati sementara
                </span>
              ) : null}
              {showRequeueMeta ? (
                <span className="inline-flex min-h-7 items-center rounded-full border border-border bg-surface-container-low px-2.5 text-[11px] font-semibold text-foreground">
                  Panggilan ke-{Math.max(row.callCount ?? 0, 1)}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <AppStatusBadge status={resolveWorkspaceStatusTone(row.status)} label={row.status} />
      </div>

      <div className="space-y-2">
        <p className="text-sm leading-6 text-muted-foreground">{row.note}</p>
        {assistText ? (
          <p className="text-xs leading-5 text-muted-foreground/90">{assistText}</p>
        ) : null}
        {lockedToOtherCounter ? (
          <p className="text-xs leading-5 text-muted-foreground/90">
            Antrean ini sedang berjalan di loket lain, jadi aksi pada sesi ini dikunci.
          </p>
        ) : null}
      </div>

      {actions.length ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const key = `${row.appointmentId ?? row.id}:${action.label}`;

            return (
              <UnitActionChip
                key={key}
                action={action}
                busy={actionBusyKey === key}
                disabled={!row.appointmentId && row.source === "live"}
                onClick={() => onAction(row, action)}
              />
            );
          })}
        </div>
      ) : null}
    </AppCard>
  );
}

function UnitQueueLane({
  title,
  description,
  rows,
  page,
  nextReadyRowId,
  actionBusyKey,
  permissions,
  activeCounterNumber,
  onAction,
}: {
  title: string;
  description: string;
  rows: UnitWorkspaceRow[];
  page: InternalPageKey;
  nextReadyRowId?: string | null;
  actionBusyKey: string | null;
  permissions?: Partial<StaffPermissionSet> | null;
  activeCounterNumber?: number;
  onAction: (row: UnitWorkspaceRow, action: WorkspaceActionDescriptor) => void;
}) {
  return (
    <AppCard padding="lg" className="space-y-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
          {title}
        </p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <UnitQueueCard
              key={`${row.source}-${row.appointmentId ?? row.id}`}
              row={row}
              page={page}
              nextReadyRowId={nextReadyRowId}
              actionBusyKey={actionBusyKey}
              permissions={permissions}
              activeCounterNumber={activeCounterNumber}
              onAction={onAction}
            />
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-border bg-surface-container-low px-5 py-8 text-center">
            <p className="text-sm font-semibold">Belum ada antrean</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Lane ini akan terisi saat antrean berubah status.
            </p>
          </div>
        )}
      </div>
    </AppCard>
  );
}

export function UnitOperationsPage({
  page = "dashboard",
}: {
  page?: Extract<InternalPageKey, "dashboard" | "data-antrean">;
}) {
  const config = getInternalPageConfig("unit-organisasi", page);
  const pageConfig = (config ??
    getInternalPageConfig("unit-organisasi", "dashboard"))!;
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const { activeRole } = useActiveStaffRole("unit-organisasi");
  const live = useLiveStaffAppointments();
  const unitScope = useUnitWorkspaceScope(live.session);
  const permissionQuery = useStaffRolePermissions(activeRole);
  const currentPath = getInternalPagePath("unit-organisasi", page);
  const [fallbackRows, setFallbackRows] = React.useState<UnitWorkspaceRow[]>(() =>
    pageConfig ? buildFallbackUnitRows(pageConfig.rows) : [],
  );
  const [actionBusyKey, setActionBusyKey] = React.useState<string | null>(null);
  const [dialogState, setDialogState] = React.useState<ActionDialogState>(null);
  const [dialogNote, setDialogNote] = React.useState("");
  const [dialogServiceId, setDialogServiceId] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<AppDateFilterValue>(() =>
    createAppDateFilterValue("today"),
  );
  const [serviceFilter, setServiceFilter] = React.useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
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
  const hasAssignedCounters = identity.assignedCounters.length > 0;
  const validCounterNumbers = React.useMemo(
    () =>
      identity.assignedCounters
        .map((counter) => counter.counterNumber)
        .filter((counterNumber) => Number.isFinite(counterNumber) && counterNumber > 0),
    [identity.assignedCounters],
  );
  const serviceSearchOptions = React.useMemo<AppSearchSelectOption[]>(
    () =>
      bookingServices.map((service) => ({
        value: service.id,
        label: `${service.id} · ${service.title}`,
        keywords: [
          service.officialName,
          service.unitLabel,
          service.groupLabel,
          service.description,
        ],
      })),
    [],
  );
  const escalationServiceSearchOptions = React.useMemo<AppSearchSelectOption[]>(
    () =>
      bookingServices.map((service) => ({
        value: service.id,
        label: `${service.id} · ${service.title}`,
        keywords: [
          service.officialName,
          service.unitLabel,
          service.groupLabel,
          service.description,
          "eskalasi",
          "level 2",
        ],
      })),
    [],
  );

  React.useEffect(() => {
    if (!pageConfig) {
      return;
    }

    setFallbackRows(buildFallbackUnitRows(pageConfig.rows));
  }, [pageConfig]);

  React.useEffect(() => {
    setSearchQuery("");
    setServiceFilter("all");
    setShowAdvancedFilters(false);
  }, [identity.unitId]);

  const liveRows = buildLiveUnitRows(live.appointments);
  const isLivePending = live.isLiveSession && live.appointments === null && !live.isError;
  const scopedRows = React.useMemo(() => {
    if (live.appointments) {
      return scopeUnitRowsToUnit(liveRows, identity.unitId);
    }

    if (!live.isLiveSession) {
      return scopeUnitRowsToUnit(fallbackRows, identity.unitId);
    }

    return [] as UnitWorkspaceRow[];
  }, [fallbackRows, identity.unitId, live.appointments, live.isLiveSession, liveRows]);
  const currentRows = React.useMemo(
    () => decorateUnitRowsForScope(scopedRows, identity.unitId),
    [identity.unitId, scopedRows],
  );
  const filterServiceOptions = React.useMemo<AppSearchSelectOption[]>(
    () => {
      if (identity.unitServices.length) {
        return identity.unitServices.map((service) => ({
          value: service.id,
          label: `${service.id} · ${service.title}`,
          keywords: [
            service.officialName,
            service.groupLabel,
            service.description,
          ],
        }));
      }

      return Array.from(
        new Map(
          currentRows
            .filter((row) => row.serviceId)
            .map((row) => [
              row.serviceId!,
              {
                value: row.serviceId!,
                label: `${row.serviceId} · ${row.title}`,
                keywords: [row.note],
              },
            ]),
        ).values(),
      );
    },
    [currentRows, identity.unitServices],
  );
  const filteredRows = React.useMemo(
    () =>
      filterUnitRows(currentRows, {
        searchQuery,
        serviceFilter,
        datePredicate: (date) => isDateWithinAppDateFilter(date, dateFilter),
      }),
    [currentRows, dateFilter, searchQuery, serviceFilter],
  );
  const handoffRows = React.useMemo(
    () => filteredRows.filter((row) => isUnitHandoffRow(row, identity.unitId)),
    [filteredRows, identity.unitId],
  );
  const operationalRows = React.useMemo(
    () => filteredRows.filter((row) => !isUnitHandoffRow(row, identity.unitId)),
    [filteredRows, identity.unitId],
  );

  const {
    nextReadyRowId,
    readyRows,
    inServiceRows,
    calledRows,
    waitingRows,
    completedRows,
    unprocessedRows,
  } = React.useMemo(() => groupUnitRows(operationalRows), [operationalRows]);
  const activeServiceRows = React.useMemo(
    () => [...calledRows, ...inServiceRows],
    [calledRows, inServiceRows],
  );
  const ownActiveServiceRows = React.useMemo(
    () =>
      activeServiceRows.filter((row) => {
        if (
          typeof activeCounterNumber === "number" &&
          Number.isFinite(activeCounterNumber)
        ) {
          return typeof row.counterId === "number"
            ? row.counterId === activeCounterNumber
            : true;
        }

        return false;
      }),
    [activeCounterNumber, activeServiceRows],
  );
  const ownBlockingActiveServiceRows = React.useMemo(
    () => ownActiveServiceRows,
    [ownActiveServiceRows],
  );
  const parallelCounterRows = React.useMemo(
    () =>
      activeServiceRows.filter(
        (row) => !ownActiveServiceRows.some((currentRow) => currentRow.id === row.id),
      ),
    [activeServiceRows, ownActiveServiceRows],
  );
  const crossDateActiveRows = React.useMemo(
    () =>
      ownBlockingActiveServiceRows.filter(
        (row) => !isDateWithinAppDateFilter(row.date, dateFilter),
      ),
    [dateFilter, ownBlockingActiveServiceRows],
  );
  const hasBlockingActiveQueue = ownBlockingActiveServiceRows.length > 0;
  const standardReadyRows = React.useMemo(
    () => readyRows.filter((row) => !isUnitDeferredRow(row)),
    [readyRows],
  );
  const deferredReadyRows = React.useMemo(
    () => readyRows.filter((row) => isUnitDeferredRow(row)),
    [readyRows],
  );
  const standardReadyRowId = React.useMemo(
    () => standardReadyRows[0]?.id ?? null,
    [standardReadyRows],
  );
  const deferredReadyRowId = React.useMemo(
    () =>
      standardReadyRows.length > 0 ? null : (deferredReadyRows[0]?.id ?? null),
    [deferredReadyRows, standardReadyRows.length],
  );
  const callableStandardReadyRowId = hasBlockingActiveQueue
    ? null
    : standardReadyRowId;
  const callableDeferredReadyRowId = hasBlockingActiveQueue
    ? null
    : deferredReadyRowId;
  const derivedStats = buildDerivedUnitStats(pageConfig.stats, operationalRows);
  const historyRows = React.useMemo(
    () => sortUnitHistoryRows([...handoffRows, ...completedRows, ...unprocessedRows]),
    [completedRows, handoffRows, unprocessedRows],
  );
  const isQueuePage = page === "data-antrean";

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
      toast.success(`Loket aktif dipindahkan ke ${nextCounter.label}.`);
    },
    [identity.assignedCounters, live.session, queryClient],
  );

  const commitFallbackAction = React.useCallback(
    (row: UnitWorkspaceRow, actionLabel: string, payload: { note?: string; serviceId?: string } = {}) => {
      setFallbackRows((rows) => patchFallbackRows(rows, row, actionLabel, payload));
    },
    [],
  );

  const handleAction = React.useCallback(
    async (
      row: UnitWorkspaceRow,
      action: WorkspaceActionDescriptor,
      payload: { note?: string; serviceId?: string } = {},
    ) => {
      const key = `${row.appointmentId ?? row.id}:${action.label}`;

      if (action.label === "Menunggu Giliran") {
        toast.message("Antrean ini sudah check-in dan menunggu panggilan unit.");
        return;
      }

      if (action.label === "Tunggu Check-in") {
        toast.message("Frontdesk masih perlu menyelesaikan check-in sebelum unit memproses antrean ini.");
        return;
      }

      if (action.label === "Lihat Ringkasan") {
        toast.message("Ringkasan layanan akan difokuskan ke histori unit di pass berikutnya.");
        return;
      }

      if (!canRunUnitAction(action.label, permissions)) {
        toast.error(buildUnitPermissionError(action.label));
        return;
      }

      if (live.isLiveSession) {
        if (!hasAssignedCounters || typeof activeCounterNumber !== "number") {
          toast.error("Pilih loket aktif terlebih dahulu sebelum memproses antrean unit.");
          return;
        }

        if (isRowLockedToOtherCounter(row, activeCounterNumber)) {
          toast.error(
            `Antrean ini sedang diproses di loket ${row.counterId}. Ganti loket aktif jika Anda memang menangani antrean ini.`,
          );
          return;
        }
      }

      if (
        action.label === "Catatan" ||
        action.label === "Ganti Layanan" ||
        action.label === "Eskalasi" ||
        action.label === "Selesaikan"
      ) {
        setDialogState({
          mode: action.label,
          row,
        });
        setDialogNote("");
        setDialogServiceId(row.serviceId ?? "");
        return;
      }

      setActionBusyKey(key);

      try {
        if (live.isLiveSession && live.staffId && row.appointmentId) {
          if (isUnitDeferredActiveRecallAction(row, action.label)) {
            const result = await callAppointment(row.appointmentId);
            const appointment = result.appointment as
              | {
                  callCount?: number;
                  note?: string;
                  counterId?: number;
                }
              | undefined;
            seedLiveStaffAppointmentsCache(queryClient, live.staffId, row.appointmentId, {
              status: "calling",
              callCount: Math.max(appointment?.callCount ?? Math.max(row.callCount ?? 0, 0) + 1, 1),
              note: appointment?.note?.trim() || "Unit sudah memanggil ulang antrean ini ke meja layanan.",
              counter_id: appointment?.counterId ?? activeCounterNumber,
            });
          } else if (isUnitReadyDeferredRecallAction(row, action.label)) {
            if (hasBlockingActiveQueue) {
              toast.message("Selesaikan atau tindak lanjuti antrean aktif dulu sebelum memanggil antrean berikutnya.");
              return;
            }
            const result = await recallDeferredUnitAppointment(row.appointmentId);
            const appointment = result.appointment as
              | {
                  callCount?: number;
                  note?: string;
                  counterId?: number;
                }
              | undefined;
            seedLiveStaffAppointmentsCache(queryClient, live.staffId, row.appointmentId, {
              status: "calling",
              callCount: Math.max(appointment?.callCount ?? Math.max(row.callCount ?? 0, 0) + 1, 1),
              note: appointment?.note?.trim() || "Unit sudah memanggil ulang antrean ini ke meja layanan.",
              counter_id: appointment?.counterId ?? activeCounterNumber,
            });
          } else if (isUnitReadyCallAction(row, action.label)) {
            if (hasBlockingActiveQueue) {
              toast.message("Selesaikan atau tindak lanjuti antrean aktif dulu sebelum memanggil antrean berikutnya.");
              return;
            }
            const result = await callAppointment(row.appointmentId);
            const appointment = result.appointment as
              | {
                  callCount?: number;
                  note?: string;
                  counterId?: number;
                }
              | undefined;
            seedLiveStaffAppointmentsCache(queryClient, live.staffId, row.appointmentId, {
              status: "calling",
              callCount: Math.max(appointment?.callCount ?? 1, 1),
              note: appointment?.note?.trim() || "Unit sudah memanggil antrean ini ke meja layanan.",
              counter_id: appointment?.counterId ?? activeCounterNumber,
            });
          } else if (isUnitRecallAction(action.label)) {
            const currentCallCount = Math.max(row.callCount ?? 1, 1);
            const nextCallCount = Math.min(currentCallCount + 1, 3);
            if (nextCallCount <= currentCallCount) {
              toast.message("Batas panggilan antrean sudah mencapai 3 kali.");
              return;
            }
            const result = await callAppointment(row.appointmentId);
            const appointment = result.appointment as
              | {
                  callCount?: number;
                  note?: string;
                  counterId?: number;
                }
              | undefined;
            seedLiveStaffAppointmentsCache(queryClient, live.staffId, row.appointmentId, {
              status: "calling",
              callCount: Math.max(appointment?.callCount ?? nextCallCount, 1),
              note: appointment?.note?.trim() || "Unit sudah memanggil antrean ini ke meja layanan.",
              counter_id: appointment?.counterId ?? activeCounterNumber,
            });
          } else if (action.label === "Melayani") {
            const result = await updateUnitAppointmentStatus(row.appointmentId, "in-service");
            const appointment = result.appointment as
              | {
                  note?: string;
                  counterId?: number;
                }
              | undefined;
            const note =
              appointment?.note?.trim() || "Layanan sedang berlangsung di meja unit.";
            seedLiveStaffAppointmentsCache(queryClient, live.staffId, row.appointmentId, {
              status: "in-service",
              note,
              counter_id: appointment?.counterId ?? activeCounterNumber,
            });
            setDialogState({
              mode: "Catatan",
              row: {
                ...row,
                status: "Sedang Dilayani",
                rawStatus: "in-service",
                note,
              },
            });
            setDialogNote("");
          } else if (action.label === "Selesaikan") {
            const note =
              payload.note?.trim() || "Layanan ditutup oleh petugas unit.";
            const result = await updateUnitAppointmentStatus(row.appointmentId, "completed", {
              note,
            });
            const appointment = result.appointment as
              | {
                  note?: string;
                }
              | undefined;
            seedLiveStaffAppointmentsCache(queryClient, live.staffId, row.appointmentId, {
              status: "completed",
              note: appointment?.note?.trim() || note,
            });
          } else if (action.label === "Lewati Dulu") {
            if (Math.max(row.callCount ?? 0, 0) < 3) {
              toast.message("Lewati dulu baru tersedia setelah 3 kali panggilan.");
              return;
            }
            const note =
              payload.note?.trim() || buildDeferredQueueNote(Math.max(row.callCount ?? 0, 0));
            await deferUnitAppointment(row.appointmentId, {
              note,
            });
          }

          await queryClient.invalidateQueries({
            queryKey: ["staff-live-appointments", live.staffId],
          });
        } else {
          if (isUnitDeferredActiveRecallAction(row, action.label)) {
            commitFallbackAction(row, action.label, payload);
            toast.success(`${action.label} berhasil diproses.`);
            return;
          }
          if (isUnitReadyDeferredRecallAction(row, action.label)) {
            if (hasBlockingActiveQueue) {
              toast.message("Selesaikan atau tindak lanjuti antrean aktif dulu sebelum memanggil antrean berikutnya.");
              return;
            }
          }
          if (
            isUnitReadyCallAction(row, action.label) &&
            hasBlockingActiveQueue
          ) {
            toast.message("Selesaikan atau tindak lanjuti antrean aktif dulu sebelum memanggil antrean berikutnya.");
            return;
          }
          if (action.label === "Lewati Dulu" && Math.max(row.callCount ?? 0, 0) < 3) {
            toast.message("Lewati dulu baru tersedia setelah 3 kali panggilan.");
            return;
          }
          commitFallbackAction(row, action.label, payload);
        }

        toast.success(`${action.label} berhasil diproses.`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Aksi unit belum berhasil dijalankan.";
        toast.error(message);
      } finally {
        setActionBusyKey(null);
      }
    },
    [
      activeCounterNumber,
      commitFallbackAction,
      currentRows,
      hasAssignedCounters,
      hasBlockingActiveQueue,
      live.isLiveSession,
      live.staffId,
      permissions,
      queryClient,
    ],
  );

  const submitDialogAction = React.useCallback(async () => {
    if (!dialogState) {
      return;
    }

    const row = dialogState.row;
    const key = `${row.appointmentId ?? row.id}:${dialogState.mode}`;

    if (!canRunUnitAction(dialogState.mode, permissions)) {
      toast.error(buildUnitPermissionError(dialogState.mode));
      return;
    }

    if (live.isLiveSession) {
      if (!hasAssignedCounters || typeof activeCounterNumber !== "number") {
        toast.error("Pilih loket aktif terlebih dahulu sebelum memproses antrean unit.");
        return;
      }

      if (isRowLockedToOtherCounter(row, activeCounterNumber)) {
        toast.error(
          `Antrean ini sedang diproses di loket ${row.counterId}. Ganti loket aktif jika Anda memang menangani antrean ini.`,
        );
        return;
      }
    }

    if (["Catatan", "Selesaikan"].includes(dialogState.mode) && dialogNote.trim().length < 20) {
      toast.error("Catatan minimal 20 karakter agar histori layanan tetap terbaca.");
      return;
    }

    if (
      ["Ganti Layanan", "Eskalasi"].includes(dialogState.mode) &&
      !dialogServiceId.trim()
    ) {
      toast.error("Masukkan kode layanan tujuan terlebih dahulu.");
      return;
    }

    if (
      dialogState.mode === "Ganti Layanan" &&
      dialogServiceId.trim().toUpperCase() === (row.serviceId ?? "").trim().toUpperCase()
    ) {
      toast.error("Pilih layanan tujuan yang berbeda dari layanan aktif.");
      return;
    }

    if (dialogState.mode === "Eskalasi" && dialogNote.trim().length < 10) {
      toast.error("Alasan eskalasi minimal 10 karakter.");
      return;
    }

    setActionBusyKey(key);

    try {
      if (live.isLiveSession && live.staffId && row.appointmentId) {
        if (dialogState.mode === "Catatan") {
          const result = await addUnitStaffNote(row.appointmentId, dialogNote.trim());
          const appointment = result.appointment as
            | {
                note?: string;
              }
            | undefined;
          seedLiveStaffAppointmentsCache(queryClient, live.staffId, row.appointmentId, {
            note: appointment?.note?.trim() || dialogNote.trim(),
          });
        } else if (dialogState.mode === "Selesaikan") {
          const result = await updateUnitAppointmentStatus(row.appointmentId, "completed", {
            note: dialogNote.trim(),
          });
          const appointment = result.appointment as
            | {
                note?: string;
              }
            | undefined;
          seedLiveStaffAppointmentsCache(queryClient, live.staffId, row.appointmentId, {
            status: "completed",
            note: appointment?.note?.trim() || dialogNote.trim(),
          });
        } else if (
          dialogState.mode === "Ganti Layanan" ||
          dialogState.mode === "Eskalasi"
        ) {
          const nextServiceId = dialogServiceId.trim().toUpperCase();
          const result = await reassignUnitAppointmentService(
            row.appointmentId,
            {
              serviceId: nextServiceId,
              reason: dialogNote.trim() || undefined,
              mode:
                dialogState.mode === "Eskalasi" ? "escalation" : "reassign",
            },
          );
          const appointment = result.appointment as
            | {
                note?: string;
                serviceId?: string;
                counterId?: number;
              }
            | undefined;
          seedLiveStaffAppointmentsCache(queryClient, live.staffId, row.appointmentId, {
            status: "confirmed",
            note:
              appointment?.note?.trim() ||
              (dialogState.mode === "Eskalasi"
                ? buildUnitEscalationOperationalNote({
                    unitId: identity.unitId,
                    sourceServiceId: row.serviceId,
                    targetServiceId: nextServiceId,
                    reason: dialogNote.trim(),
                    originCounterNumber: row.counterId ?? activeCounterNumber,
                  })
                : `Pindah layanan ke ${nextServiceId}.`),
            staff_note:
              appointment?.note?.trim() ||
              (dialogState.mode === "Eskalasi"
                ? buildUnitEscalationOperationalNote({
                    unitId: identity.unitId,
                    sourceServiceId: row.serviceId,
                    targetServiceId: nextServiceId,
                    reason: dialogNote.trim(),
                    originCounterNumber: row.counterId ?? activeCounterNumber,
                  })
                : `Pindah layanan ke ${nextServiceId}.`),
            service_id: appointment?.serviceId ?? nextServiceId,
            counter_id: appointment?.counterId ?? null,
          });
        }

        await queryClient.invalidateQueries({
          queryKey: ["staff-live-appointments", live.staffId],
        });
      } else {
        commitFallbackAction(row, dialogState.mode, {
          note: dialogNote.trim(),
          serviceId: dialogServiceId.trim().toUpperCase(),
        });
      }

      toast.success(
        dialogState.mode === "Eskalasi"
          ? buildUnitEscalationFeedback({
              unitId: identity.unitId,
              sourceServiceId: row.serviceId,
              serviceId: dialogServiceId.trim().toUpperCase(),
            })
          : `${dialogState.mode} berhasil diperbarui.`,
      );
      setDialogState(null);
      setDialogNote("");
      setDialogServiceId("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Aksi lanjutan belum berhasil disimpan.";
      toast.error(message);
    } finally {
      setActionBusyKey(null);
    }
  }, [
    commitFallbackAction,
    activeCounterNumber,
    dialogNote,
    dialogServiceId,
    dialogState,
    hasAssignedCounters,
    identity.unitId,
    live.isLiveSession,
    live.staffId,
    permissions,
    queryClient,
  ]);

  if (
    !hydrated ||
    isLivePending ||
    (unitScope.isHumasAdmin && !unitScope.hasResolvedSelection)
  ) {
    return (
      <DashboardShell
        role={activeRole}
        currentPath={currentPath}
        title={pageConfig.title}
        subtitle={pageConfig.description}
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {["Menunggu", "Siap Dipanggil", "Dipanggil", "Selesai"].map((label) => (
            <AppStatCard key={label} label={label} value="..." description="Memuat antrean unit." />
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
        title={pageConfig.title}
        subtitle={pageConfig.description}
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {["Menunggu", "Siap Dipanggil", "Dipanggil", "Selesai"].map((label) => (
            <AppStatCard key={label} label={label} value="..." description="Memuat antrean unit." />
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
        title={pageConfig.title}
        subtitle={pageConfig.description}
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
        title={pageConfig.title}
        subtitle={pageConfig.description}
      >
        <div className="space-y-8">
          <AppPageIntro
            eyebrow={pageConfig.heroEyebrow}
            title={pageConfig.heroTitle}
            description={pageConfig.heroDescription}
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
      title={pageConfig.title}
      subtitle={pageConfig.description}
    >
      <div className="space-y-8">
        {!isQueuePage ? (
          <AppPageIntro
            eyebrow={pageConfig.heroEyebrow}
            title={pageConfig.heroTitle}
            description={pageConfig.heroDescription}
            actions={
              <>
                {pageConfig.heroSecondaryAction ? (
                  <AppButton
                    variant="outline"
                    disabled={!canViewStatistics}
                    onClick={() => window.location.assign(getInternalPagePath("unit-organisasi", "analitik-unit"))}
                  >
                    {pageConfig.heroSecondaryAction}
                  </AppButton>
                ) : null}
                <AppButton onClick={() => window.location.reload()}>
                  {pageConfig.heroPrimaryAction}
                  <RefreshCcw className="size-4" />
                </AppButton>
              </>
            }
          />
        ) : null}

        {unitScope.isHumasAdmin ? (
          <UnitWorkspaceScopeCard
            value={unitScope.selectedUnitId}
            onValueChange={unitScope.setSelectedUnitId}
            options={unitScope.options}
          />
        ) : null}

        <InternalWorkspaceFilterBar
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          searchPlaceholder="Cari nomor antrean, nama pengunjung, layanan, atau unit"
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          serviceFilter={serviceFilter}
          onServiceFilterChange={setServiceFilter}
          serviceOptions={filterServiceOptions}
          showAdvancedFilters={showAdvancedFilters}
          onToggleAdvancedFilters={() => setShowAdvancedFilters((value) => !value)}
          onResetFilters={() => {
            setSearchQuery("");
            setDateFilter(createAppDateFilterValue("today"));
            setServiceFilter("all");
          }}
        />

        <AppCard tone="soft" padding="md" className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                Loket Aktif
              </p>
              <h2 className="text-lg font-semibold tracking-tight">
                {identity.activeCounterLabel || "Pilih loket kerja"}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Antrean siap dipanggil dibagi dari satu pool unit, tetapi antrean aktif dikunci per loket.
              </p>
            </div>

            <div className="w-full max-w-sm space-y-2">
              <AppFormField
                label="Loket operasional"
                description={
                  hasAssignedCounters
                    ? "Ganti loket aktif bila Anda berpindah meja layanan."
                    : "Akun ini belum punya assignment loket aktif dari Humas Admin."
                }
                density="compact"
                labelTone="quiet"
              >
                <AppSelect
                  value={identity.activeCounterId ?? ""}
                  onChange={(event) => {
                    void handleActiveCounterChange(event.target.value);
                  }}
                  disabled={!hasAssignedCounters || Boolean(actionBusyKey)}
                >
                  {!hasAssignedCounters ? (
                    <option value="">Belum ada loket tersinkron</option>
                  ) : null}
                  {identity.assignedCounters.map((counter) => (
                    <option key={counter.id} value={counter.id}>
                      {counter.label} · Nomor {counter.counterNumber}
                    </option>
                  ))}
                </AppSelect>
              </AppFormField>
            </div>
          </div>

          {!hasAssignedCounters ? (
            <AppNotice
              icon={AlertTriangle}
              tone="warning"
              title="Akun unit ini belum terikat ke loket"
              description="Humas Admin perlu menambahkan loket pada unit lalu meng-assign minimal satu loket ke akun ini sebelum operasional bisa dipakai aman oleh lebih dari satu petugas."
            />
          ) : null}

          {parallelCounterRows.length > 0 ? (
            <AppNotice
              icon={AlertTriangle}
              title="Ada antrean aktif di loket lain"
              description={`Sesi ini tetap bisa memanggil antrean baru selama ${identity.activeCounterLabel || "loket aktif"} kosong. Antrean yang sedang berjalan di loket lain akan tampil baca-saja.`}
              tone="role"
            />
          ) : null}

          {crossDateActiveRows.length > 0 ? (
            <AppNotice
              icon={AlertTriangle}
              tone="warning"
              title="Ada antrean aktif dari tanggal lain"
              description="Antrean aktif yang masih mengunci loket tetap ditampilkan walau filter tanggal sedang Hari Ini. Selesaikan atau lanjutkan antrean itu dulu sebelum memanggil antrean baru."
            />
          ) : null}
        </AppCard>

        <AppCard tone="soft" padding="md" className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            Aturan panggilan unit
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            Urutannya: panggil antrean siap biasa, panggil ulang maksimal sampai
            3 kali bila tamu belum datang, lalu baru lewati sementara. Antrean
            yang dilewati masuk daftar panggil ulang dan baru diproses lagi
            setelah antrean siap biasa serta antrean aktif lain selesai.
          </p>
        </AppCard>

        {isQueuePage ? (
          <div className="space-y-6">
            <UnitAntreanTableSection
              title="Sedang aktif"
              description="Antrean yang sedang dipanggil atau sudah masuk meja layanan."
              rows={activeServiceRows}
              page={page}
              nextReadyRowId={callableStandardReadyRowId}
              actionBusyKey={actionBusyKey}
              permissions={permissions}
              activeCounterNumber={activeCounterNumber}
              validCounterNumbers={validCounterNumbers}
              onAction={handleAction}
              emptyMessage="Belum ada antrean aktif pada filter ini."
            />

            <UnitAntreanTableSection
              title="Siap dipanggil"
              description="Antrean hadir yang belum pernah dilewati dan menjadi prioritas panggilan berikutnya."
              rows={standardReadyRows}
              page={page}
              nextReadyRowId={callableStandardReadyRowId}
              actionBusyKey={actionBusyKey}
              permissions={permissions}
              activeCounterNumber={activeCounterNumber}
              validCounterNumbers={validCounterNumbers}
              onAction={handleAction}
              emptyMessage="Belum ada antrean siap panggil biasa pada filter ini."
            />

            <UnitAntreanTableSection
              title="Dilewati sementara"
              description="Antrean yang sudah 3 kali dipanggil, dilewati sebentar, lalu menunggu giliran panggil ulang."
              rows={deferredReadyRows}
              page={page}
              nextReadyRowId={callableDeferredReadyRowId}
              actionBusyKey={actionBusyKey}
              permissions={permissions}
              activeCounterNumber={activeCounterNumber}
              validCounterNumbers={validCounterNumbers}
              onAction={handleAction}
              emptyMessage="Belum ada antrean yang sedang menunggu panggil ulang."
            />

            <UnitAntreanTableSection
              title="Menunggu check-in"
              description="Antrean yang belum bisa dipanggil karena frontdesk belum menandai kehadiran."
              rows={waitingRows}
              page={page}
              nextReadyRowId={callableStandardReadyRowId}
              actionBusyKey={actionBusyKey}
              permissions={permissions}
              activeCounterNumber={activeCounterNumber}
              validCounterNumbers={validCounterNumbers}
              onAction={handleAction}
              emptyMessage="Belum ada antrean yang masih tertahan di check-in."
            />

            <UnitAntreanTableSection
              title="Riwayat unit"
              description="Layanan selesai, handoff eskalasi, dan penutupan otomatis tetap tersimpan di histori unit."
              rows={historyRows}
              page={page}
              nextReadyRowId={callableStandardReadyRowId}
              actionBusyKey={actionBusyKey}
              permissions={permissions}
              activeCounterNumber={activeCounterNumber}
              validCounterNumbers={validCounterNumbers}
              onAction={handleAction}
              emptyMessage="Belum ada riwayat layanan atau handoff eskalasi pada rentang aktif."
            />
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {derivedStats.map((stat) => (
                <AppStatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  description={stat.description}
                  tone={stat.tone}
                />
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
            <UnitQueueLane
              title="Sedang aktif"
              description="Antrean yang sedang dipanggil atau sedang berjalan di meja unit."
              rows={activeServiceRows}
              page={page}
              nextReadyRowId={callableStandardReadyRowId}
              actionBusyKey={actionBusyKey}
              permissions={permissions}
              activeCounterNumber={activeCounterNumber}
              onAction={handleAction}
            />
            <UnitQueueLane
              title="Siap dipanggil"
              description="Antrean hadir yang menjadi prioritas panggilan berikutnya."
              rows={standardReadyRows}
              page={page}
              nextReadyRowId={callableStandardReadyRowId}
              actionBusyKey={actionBusyKey}
              permissions={permissions}
              activeCounterNumber={activeCounterNumber}
              onAction={handleAction}
            />
            <UnitQueueLane
              title="Dilewati sementara"
              description="Antrean yang akan dipanggil ulang setelah antrean siap biasa habis."
              rows={deferredReadyRows}
              page={page}
              nextReadyRowId={callableDeferredReadyRowId}
              actionBusyKey={actionBusyKey}
              permissions={permissions}
              activeCounterNumber={activeCounterNumber}
              onAction={handleAction}
            />
            <UnitQueueLane
              title="Tertahan dan selesai"
              description="Antrean yang menunggu check-in, sudah dieskalasikan, atau sudah ditutup termasuk kasus tidak diproses."
              rows={[...waitingRows, ...handoffRows, ...completedRows, ...unprocessedRows]}
              page={page}
              nextReadyRowId={callableStandardReadyRowId}
              actionBusyKey={actionBusyKey}
              permissions={permissions}
              activeCounterNumber={activeCounterNumber}
              onAction={handleAction}
            />
            </div>
          </>
        )}
      </div>

      <AppDialog
        open={Boolean(dialogState)}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState(null);
            setDialogNote("");
            setDialogServiceId("");
          }
        }}
        title={
          dialogState
            ? dialogState.mode === "Eskalasi"
                ? "Alihkan penanganan"
              : dialogState.mode === "Ganti Layanan"
                ? "Pindahkan ke layanan lain"
                : dialogState.mode
            : "Aksi Unit"
        }
        description={
          dialogState?.mode === "Catatan"
            ? "Tambahkan catatan singkat agar histori layanan tetap mudah dibaca."
            : dialogState?.mode === "Selesaikan"
                ? "Tutup layanan dengan catatan minimum agar histori unit tetap rapi."
                : dialogState?.mode === "Eskalasi"
                  ? "Pilih layanan tujuan. Setelah disimpan, antrean keluar dari akun unit dan masuk ke inbox level 2 unit tujuan."
                  : "Pilih layanan tujuan jika antrean perlu dipindahkan sebelum layanan berjalan."
        }
      >
        <div className="space-y-4">
          <AppCard tone="soft" padding="md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Antrean aktif
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight">
              {(dialogState?.row.displayQueueNumber || dialogState?.row.id) ?? ""} • {dialogState?.row.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {dialogState?.row.note}
            </p>
          </AppCard>

          {dialogState &&
          ["Ganti Layanan", "Eskalasi"].includes(dialogState.mode) ? (
            <AppFormField
              label={
                dialogState.mode === "Eskalasi"
                  ? "Layanan tujuan penanganan"
                  : "Layanan tujuan"
              }
              description={
                dialogState.mode === "Eskalasi"
                  ? "Pilih layanan tujuan level 2. Antrean akan diteruskan ke inbox level 2 pada unit tujuan."
                  : "Gunakan layanan tujuan yang lebih tepat bila user salah memilih layanan awal."
              }
              density="compact"
              labelTone="quiet"
            >
              <div className="space-y-2">
                <AppSearchSelect
                  value={dialogServiceId}
                  onValueChange={setDialogServiceId}
                  options={
                    dialogState.mode === "Eskalasi"
                      ? escalationServiceSearchOptions
                      : serviceSearchOptions.filter(
                          (option) => option.value !== dialogState.row.serviceId,
                        )
                  }
                  placeholder="Pilih layanan tujuan"
                  searchPlaceholder="Cari kode atau nama layanan"
                  emptyMessage="Layanan tujuan tidak ditemukan."
                />
                {dialogServiceId ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    {(() => {
                      const unitLabel =
                        getBookingServiceById(dialogServiceId)?.unitLabel ??
                        "Layanan tujuan akan dibaca dari katalog aktif.";

                      if (dialogState.mode !== "Eskalasi") {
                        return unitLabel;
                      }

                      return `${unitLabel}. Antrean masuk ke inbox level 2 setelah alasan disimpan.`;
                    })()}
                  </p>
                ) : null}
              </div>
            </AppFormField>
          ) : null}

          <AppFormField
            label={
              dialogState?.mode === "Catatan" || dialogState?.mode === "Selesaikan"
                ? "Catatan unit"
                : "Keterangan"
            }
            description={
              dialogState?.mode === "Selesaikan"
                  ? "Minimal 20 karakter agar penutupan layanan tetap mudah diaudit."
                : dialogState?.mode === "Eskalasi"
                  ? "Wajib diisi agar petugas level 2 memahami alasan eskalasi."
                : dialogState?.mode === "Ganti Layanan"
                  ? "Opsional, isi kalau ada catatan perpindahan layanan."
                  : undefined
            }
            density="compact"
            labelTone="quiet"
          >
            <AppTextarea
              value={dialogNote}
              onChange={(event) => setDialogNote(event.target.value)}
              placeholder={
                dialogState?.mode === "Selesaikan"
                    ? "Tulis catatan penutupan layanan"
                    : dialogState?.mode === "Eskalasi"
                      ? "Tulis alasan singkat untuk petugas level 2"
                    : dialogState?.mode === "Ganti Layanan"
                      ? "Tambahkan catatan perpindahan bila perlu"
                      : "Tulis catatan singkat"
              }
            />
          </AppFormField>

          <div className="flex flex-wrap justify-end gap-3">
            <AppButton
              variant="outline"
              onClick={() => {
                setDialogState(null);
                setDialogNote("");
                setDialogServiceId("");
              }}
            >
              Batal
            </AppButton>
            <AppButton
              onClick={submitDialogAction}
              loading={Boolean(actionBusyKey)}
              loadingLabel="Memproses..."
              disabled={Boolean(actionBusyKey)}
            >
              Simpan Aksi
            </AppButton>
          </div>
        </div>
      </AppDialog>
    </DashboardShell>
  );
}
