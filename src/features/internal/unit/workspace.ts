"use client";

import {
  bookingServices,
  inferBookingServiceLevel,
} from "@/content/service-booking-content";
import type { WorkspaceRow, WorkspaceStat } from "@/features/internal/internal-workspace-config";
import { normalizeWorkspaceStatus } from "@/features/internal/internal-workspace-actions";
import type { LiveStaffAppointment } from "@/features/internal/use-live-staff-appointments";
import {
  buildQueueNumberSearchTokens,
  formatQueueNumberForDisplay,
} from "@/lib/queue-number";

export type UnitWorkspaceRow = WorkspaceRow & {
  appointmentId?: string;
  displayQueueNumber?: string;
  createdAt?: string;
  serviceId?: string;
  serviceLevel: 1 | 2;
  unitId?: string;
  userName?: string;
  complaint?: string;
  staffProcessNote?: string | null;
  date: string;
  source: "live" | "fallback";
  checkedIn: boolean;
  rawStatus: string;
  callCount: number;
  counterId?: number;
  originCounterId?: number;
  startTime?: string;
  priorityReason?: string | null;
  isEscalated?: boolean;
  isDeferred?: boolean;
  isRecalledDeferred?: boolean;
  escalationOriginLabel?: string | null;
  escalationReason?: string | null;
};

const DEFERRED_UNIT_NOTE_PATTERN = /(?:^|\b)lewati sementara:/i;
const DEFERRED_RECALL_NOTE_PATTERN = /memanggil ulang antrean ini ke meja layanan/i;
const INTERNAL_UNIT_NOTE_PATTERN = /(?:^|\b)oper internal di\b/i;

function shouldExposeUnitCounterId(status: string) {
  return ["calling", "in-service", "completed"].includes(status);
}

function isDeferredUnitNote(value: string | null | undefined) {
  return DEFERRED_UNIT_NOTE_PATTERN.test((value || "").trim());
}

function isInternalUnitNote(value: string | null | undefined) {
  return INTERNAL_UNIT_NOTE_PATTERN.test((value || "").trim());
}

function isDeferredRecallUnitNote(value: string | null | undefined) {
  return DEFERRED_RECALL_NOTE_PATTERN.test((value || "").trim());
}

function normalizeComparableLabel(value: string | null | undefined) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function doesEscalationOriginMatchUnit(row: UnitWorkspaceRow, unitId: string) {
  const normalizedUnitId = unitId.trim().toUpperCase();
  const normalizedOriginLabel = normalizeComparableLabel(row.escalationOriginLabel);
  if (!normalizedUnitId || !normalizedOriginLabel) {
    return false;
  }

  return bookingServices.some((service) => {
    if (service.unitId !== normalizedUnitId) {
      return false;
    }

    return [
      service.id,
      service.title,
      service.officialName,
    ].some((candidate) => normalizeComparableLabel(candidate) === normalizedOriginLabel);
  });
}

function doesUnitMatchRowTarget(
  row: Pick<UnitWorkspaceRow, "id" | "serviceId" | "unitId">,
  unitId: string,
) {
  const normalizedUnitId = unitId.trim().toUpperCase();
  if (!normalizedUnitId) {
    return false;
  }

  if (row.unitId?.trim().toUpperCase() === normalizedUnitId) {
    return true;
  }

  if (row.serviceId?.trim().toUpperCase().startsWith(`${normalizedUnitId}-`)) {
    return true;
  }

  return row.id.trim().toUpperCase().startsWith(`${normalizedUnitId}-`);
}

function getUnitRowTargetUnitId(
  row: Pick<UnitWorkspaceRow, "id" | "serviceId" | "unitId">,
) {
  const normalizedUnitId = row.unitId?.trim().toUpperCase() ?? "";
  if (normalizedUnitId) {
    return normalizedUnitId;
  }

  const normalizedServiceId = row.serviceId?.trim().toUpperCase() ?? "";
  if (normalizedServiceId.includes("-")) {
    return normalizedServiceId.split("-")[0] || "";
  }

  const normalizedRowId = row.id.trim().toUpperCase();
  if (normalizedRowId.includes("-")) {
    return normalizedRowId.split("-")[0] || "";
  }

  return "";
}

export function buildFallbackUnitRows(rows: WorkspaceRow[]): UnitWorkspaceRow[] {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  return rows.map((row) => {
    const matchedService = bookingServices.find(
      (service) =>
        service.id === row.id.trim().toUpperCase() ||
        service.title === row.title ||
        service.officialName === row.title,
    );
    const status = normalizeWorkspaceStatus(row.status);
    const rawStatus =
      status.includes("dipanggil")
        ? "calling"
        : status.includes("dilayani")
          ? "in-service"
          : status.includes("selesai")
            ? "completed"
            : "booked";
    const checkedIn =
      status.includes("siap dipanggil") ||
      status.includes("dipanggil") ||
      status.includes("dilayani") ||
      status.includes("selesai");

    return {
      ...row,
      displayQueueNumber: formatQueueNumberForDisplay(row.id),
      createdAt: undefined,
      serviceId: matchedService?.id,
      serviceLevel: inferBookingServiceLevel(
        matchedService?.id || row.id,
        matchedService?.serviceLevel ?? 1,
      ),
      unitId: matchedService?.unitId,
      userName: "Pengunjung layanan",
      complaint: "",
      date: today,
      source: "fallback",
      checkedIn,
      rawStatus,
      callCount: 0,
      counterId: undefined,
      startTime: undefined,
      priorityReason: null,
      isDeferred: isDeferredUnitNote(row.note),
      isRecalledDeferred: isDeferredRecallUnitNote(row.note),
    };
  });
}

export function buildLiveUnitRows(
  appointments: LiveStaffAppointment[] | null | undefined,
): UnitWorkspaceRow[] {
  if (!appointments?.length) {
    return [];
  }

  return appointments.map((appointment) => {
    const rawStatus = appointment.rawStatus;
    const normalizedStatus = normalizeWorkspaceStatus(rawStatus);

    return {
      id: appointment.rawQueueNumber || appointment.queueNumber,
      displayQueueNumber: appointment.queueNumber,
      title: appointment.serviceTitle,
      status: appointment.status,
      note: appointment.note,
      appointmentId: appointment.id,
      createdAt: appointment.createdAt,
      serviceId: appointment.serviceId,
      serviceLevel: appointment.serviceLevel ?? 1,
      unitId: appointment.unitId,
      userName: appointment.userName,
      complaint: appointment.complaint,
      staffProcessNote: appointment.staffProcessNote ?? null,
      date: appointment.date,
      source: "live",
      checkedIn: appointment.checkedIn,
      rawStatus,
      callCount: appointment.callCount,
      counterId:
        shouldExposeUnitCounterId(normalizedStatus) ? appointment.counterId : undefined,
      originCounterId: appointment.originCounterId,
      startTime: appointment.startTime,
      priorityReason: appointment.priorityReason,
      isDeferred: isDeferredUnitNote(appointment.note),
      isRecalledDeferred: isDeferredRecallUnitNote(appointment.note),
      isEscalated: appointment.isEscalated,
      escalationOriginLabel: appointment.escalationOriginLabel,
      escalationReason: appointment.escalationReason,
    } satisfies UnitWorkspaceRow;
  });
}

function getUnitRawStatus(row: UnitWorkspaceRow) {
  return normalizeWorkspaceStatus(row.rawStatus || row.status);
}

export function getUnitRowCounterId(
  row: Pick<UnitWorkspaceRow, "status" | "rawStatus" | "counterId">,
) {
  const normalizedStatus = normalizeWorkspaceStatus(row.rawStatus || row.status);
  if (!shouldExposeUnitCounterId(normalizedStatus)) {
    return undefined;
  }

  return typeof row.counterId === "number" && Number.isFinite(row.counterId)
    ? row.counterId
    : undefined;
}

export function isUnitDeferredRow(row: UnitWorkspaceRow) {
  return Boolean(row.isDeferred);
}

export function isUnitInternalTransferRow(row: UnitWorkspaceRow) {
  return isInternalUnitNote(row.note) && !isUnitLevel2Row(row);
}

export function isUnitLevel2Row(row: UnitWorkspaceRow) {
  return (
    Boolean(row.isEscalated) ||
    inferBookingServiceLevel(row.serviceId || row.id, row.serviceLevel) === 2
  );
}

export function isUnitWaitingRow(row: UnitWorkspaceRow) {
  const rawStatus = getUnitRawStatus(row);
  return !row.checkedIn && (rawStatus === "booked" || rawStatus === "confirmed");
}

export function isUnitReadyRow(row: UnitWorkspaceRow) {
  const rawStatus = getUnitRawStatus(row);
  return row.checkedIn && (rawStatus === "booked" || rawStatus === "confirmed");
}

export function isUnitCallingRow(row: UnitWorkspaceRow) {
  return getUnitRawStatus(row) === "calling";
}

export function isUnitInServiceRow(row: UnitWorkspaceRow) {
  return getUnitRawStatus(row) === "in-service";
}

export function isUnitCompletedRow(row: UnitWorkspaceRow) {
  return getUnitRawStatus(row) === "completed";
}

export function isUnitUnprocessedRow(row: UnitWorkspaceRow) {
  return getUnitRawStatus(row) === "unprocessed";
}

export function isUnitHiddenOperationalRow(row: UnitWorkspaceRow) {
  const rawStatus = getUnitRawStatus(row);
  return rawStatus === "no-show" || rawStatus === "cancelled";
}

function compareUnitRows(left: UnitWorkspaceRow, right: UnitWorkspaceRow) {
  const startComparison = (left.startTime || "").localeCompare(right.startTime || "");
  if (startComparison !== 0) {
    return startComparison;
  }

  return left.id.localeCompare(right.id, "id", { sensitivity: "base" });
}

function compareUnitReadyRows(left: UnitWorkspaceRow, right: UnitWorkspaceRow) {
  if (isUnitDeferredRow(left) !== isUnitDeferredRow(right)) {
    return isUnitDeferredRow(left) ? 1 : -1;
  }

  const leftRequeued = (left.callCount ?? 0) > 0;
  const rightRequeued = (right.callCount ?? 0) > 0;
  if (leftRequeued !== rightRequeued) {
    return leftRequeued ? 1 : -1;
  }

  if (left.callCount !== right.callCount) {
    return (left.callCount ?? 0) - (right.callCount ?? 0);
  }

  return compareUnitRows(left, right);
}

function getUnitHistoryFallbackKey(row: UnitWorkspaceRow) {
  const normalizedDate = row.date.trim().slice(0, 10);
  const normalizedTime = (row.startTime || "").trim().slice(0, 5) || "00:00";
  return `${normalizedDate}T${normalizedTime}:00+07:00`;
}

function compareUnitHistoryRows(left: UnitWorkspaceRow, right: UnitWorkspaceRow) {
  const leftCreatedAt = (left.createdAt || "").trim();
  const rightCreatedAt = (right.createdAt || "").trim();

  if (leftCreatedAt || rightCreatedAt) {
    if (!leftCreatedAt) {
      return 1;
    }

    if (!rightCreatedAt) {
      return -1;
    }

    const createdAtComparison = rightCreatedAt.localeCompare(leftCreatedAt);
    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }
  }

  const leftFallbackKey = getUnitHistoryFallbackKey(left);
  const rightFallbackKey = getUnitHistoryFallbackKey(right);
  const fallbackComparison = rightFallbackKey.localeCompare(leftFallbackKey);
  if (fallbackComparison !== 0) {
    return fallbackComparison;
  }

  return right.id.localeCompare(left.id, "id", { sensitivity: "base" });
}

export function sortUnitHistoryRows(rows: UnitWorkspaceRow[]) {
  return [...rows].sort(compareUnitHistoryRows);
}

function isUnitOriginEscalationRow(row: UnitWorkspaceRow, unitId: string) {
  const normalizedUnitId = unitId.trim().toUpperCase();
  if (!normalizedUnitId || !row.isEscalated) {
    return false;
  }

  return doesEscalationOriginMatchUnit(row, normalizedUnitId);
}

export function scopeUnitRowsToUnit(rows: UnitWorkspaceRow[], unitId: string) {
  const normalizedUnitId = unitId.trim().toUpperCase();
  if (!normalizedUnitId) {
    return [];
  }

  return rows.filter((row) => {
    const targetMatch = doesUnitMatchRowTarget(row, normalizedUnitId);
    if (row.isEscalated) {
      return targetMatch || isUnitOriginEscalationRow(row, normalizedUnitId);
    }

    if (targetMatch) {
      return true;
    }

    return doesEscalationOriginMatchUnit(row, normalizedUnitId);
  });
}

export function isUnitTransferredEscalationRow(row: UnitWorkspaceRow, unitId: string) {
  const normalizedUnitId = unitId.trim().toUpperCase();
  if (!normalizedUnitId || !row.isEscalated) {
    return false;
  }

  const targetUnitId = getUnitRowTargetUnitId(row);
  if (!targetUnitId || targetUnitId === normalizedUnitId) {
    return false;
  }

  return doesEscalationOriginMatchUnit(row, normalizedUnitId);
}

export function isUnitHandoffRow(row: UnitWorkspaceRow, unitId: string) {
  return isUnitOriginEscalationRow(row, unitId);
}

export function decorateUnitRowsForScope(
  rows: UnitWorkspaceRow[],
  unitId: string,
): UnitWorkspaceRow[] {
  return rows.map((row) => {
    if (!isUnitHandoffRow(row, unitId)) {
      return row;
    }

    const normalizedRawStatus = normalizeWorkspaceStatus(row.rawStatus || row.status);
    const nextStatus =
      normalizedRawStatus === "completed"
        ? row.isEscalated
          ? "Selesai di Level 2"
          : "Selesai Level 2"
        : normalizedRawStatus === "unprocessed"
          ? row.isEscalated
            ? "Tidak Diproses di Level 2"
            : "Tidak Diproses"
        : normalizedRawStatus === "in-service"
          ? "Diproses Level 2"
          : normalizedRawStatus === "calling"
            ? "Dipanggil Level 2"
            : row.isEscalated
              ? "Eskalasi Level 2"
              : "Siap Level 2";

    return {
      ...row,
      status: nextStatus,
      rawStatus:
        normalizedRawStatus === "completed"
          ? "completed"
          : normalizedRawStatus === "unprocessed"
            ? "unprocessed"
            : "escalated",
    };
  });
}

export function buildDerivedUnitStats(
  baseStats: WorkspaceStat[],
  rows: UnitWorkspaceRow[],
): WorkspaceStat[] {
  if (baseStats.length < 4) {
    return baseStats;
  }

  const countBy = (predicate: (row: UnitWorkspaceRow) => boolean) =>
    rows.filter(predicate).length.toString();

  return baseStats.map((stat, index) => {
    if (index === 0) {
      return {
        ...stat,
        value: countBy(isUnitWaitingRow),
      };
    }

    if (index === 1) {
      return {
        ...stat,
        value: countBy(isUnitReadyRow),
      };
    }

    if (index === 2) {
      return {
        ...stat,
        value: countBy((row) => isUnitCallingRow(row) || isUnitInServiceRow(row)),
      };
    }

    if (index === 3) {
      return {
        ...stat,
        value: countBy(isUnitCompletedRow),
      };
    }

    return stat;
  });
}

export function filterUnitRows(
  rows: UnitWorkspaceRow[],
  options: {
    searchQuery: string;
    serviceFilter: string;
    datePredicate: (date: string) => boolean;
  },
) {
  const normalizedQuery = options.searchQuery.trim().toLowerCase();

  return rows.filter((row) => {
    if (isUnitHiddenOperationalRow(row)) {
      return false;
    }

    const isAlwaysVisibleActiveRow =
      isUnitCallingRow(row) || isUnitInServiceRow(row);
    if (isAlwaysVisibleActiveRow) {
      return true;
    }

    if (!options.datePredicate(row.date)) {
      return false;
    }

    const rowServiceKey = row.serviceId ?? "";
    if (options.serviceFilter !== "all" && rowServiceKey !== options.serviceFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      row.id,
      row.displayQueueNumber,
      ...buildQueueNumberSearchTokens(row.id),
      row.title,
      row.note,
      row.userName,
      row.complaint,
      row.serviceId,
      row.unitId,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export function groupUnitRows(rows: UnitWorkspaceRow[]) {
  const visibleRows = rows.filter((row) => !isUnitHiddenOperationalRow(row));
  const readyRows = visibleRows.filter(isUnitReadyRow).sort(compareUnitReadyRows);
  const waitingRows = visibleRows.filter(isUnitWaitingRow).sort(compareUnitRows);
  const calledRows = visibleRows.filter(isUnitCallingRow).sort(compareUnitRows);
  const inServiceRows = visibleRows.filter(isUnitInServiceRow).sort(compareUnitRows);
  const completedRows = visibleRows.filter(isUnitCompletedRow).sort(compareUnitHistoryRows);
  const unprocessedRows = visibleRows
    .filter(isUnitUnprocessedRow)
    .sort(compareUnitHistoryRows);
  const nextReadyRow = readyRows[0] ?? null;
  const nextReadyRowId = nextReadyRow?.id ?? null;

  return {
    nextReadyRow,
    nextReadyRowId,
    waitingRows,
    readyRows,
    calledRows,
    inServiceRows,
    completedRows,
    unprocessedRows,
  };
}
