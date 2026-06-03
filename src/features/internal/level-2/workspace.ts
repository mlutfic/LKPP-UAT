import { getBookingServiceById } from "@/content/service-booking-content";
import type {
  WorkspaceRow,
  WorkspaceStat,
} from "@/features/internal/internal-workspace-config";
import {
  buildFallbackUnitRows,
  groupUnitRows,
  getUnitRowCounterId,
  isUnitCompletedRow,
  isUnitUnprocessedRow,
  type UnitWorkspaceRow,
} from "@/features/internal/unit/workspace";
import { normalizeWorkspaceStatus } from "@/features/internal/internal-workspace-actions";
import type { StaffPermissionSet } from "@/lib/internal-role-policy";
import { isEligibleStaffServiceAssignment } from "@/lib/staff-service-assignment-rules";

function normalizeUnitId(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

const LEVEL2_FALLBACK_ROWS: WorkspaceRow[] = [
  {
    id: "D11-02-001",
    title: "Pendalaman Penafsiran PBJ Level 2",
    status: "Siap Dipanggil",
    note: "Asal eskalasi dari meja regulasi level 1.",
  },
  {
    id: "D22-02-004",
    title: "Investigasi Kendala SPSE Level 2",
    status: "Sedang Dilayani",
    note: "Petugas digital sedang menindaklanjuti.",
  },
  {
    id: "D31-02-002",
    title: "Pendampingan JF PBJ Level 2",
    status: "Selesai",
    note: "Ringkasan penutupan sudah dikirim ke unit asal.",
  },
];

export function isLevel2Row(row: UnitWorkspaceRow) {
  const serviceId = row.serviceId?.trim().toUpperCase() ?? "";
  const service = serviceId ? getBookingServiceById(serviceId) : null;
  const status = row.status.trim().toLowerCase();

  return (
    Boolean(row.isEscalated) ||
    row.serviceLevel === 2 ||
    service?.serviceLevel === 2 ||
    row.title.toLowerCase().includes("level 2") ||
    status.includes("level 2")
  );
}

export function scopeLevel2Rows(rows: UnitWorkspaceRow[], unitId: string) {
  const normalizedUnitId = normalizeUnitId(unitId);
  if (!normalizedUnitId) {
    return [];
  }

  return rows.filter(
    (row) => isLevel2Row(row) && isLevel2ActionableRow(row, normalizedUnitId),
  );
}

export function isLevel2ActionableRow(row: UnitWorkspaceRow, unitId: string) {
  const normalizedUnitId = normalizeUnitId(unitId);
  if (!normalizedUnitId) {
    return false;
  }

  if (row.isEscalated) {
    return normalizeUnitId(row.unitId) === normalizedUnitId;
  }

  const normalizedServiceId = row.serviceId?.trim().toUpperCase() ?? "";
  if (normalizedServiceId) {
    return isEligibleStaffServiceAssignment({
      role: "petugas_level2",
      staffUnitId: normalizedUnitId,
      serviceId: normalizedServiceId,
      serviceUnitId: row.unitId,
      serviceLevel: row.serviceLevel,
    });
  }

  return row.serviceLevel === 2 && normalizeUnitId(row.unitId) === normalizedUnitId;
}

export function isLevel2ReadOnlyHistoryRow(row: UnitWorkspaceRow, unitId: string) {
  if (isUnitCompletedRow(row) || isUnitUnprocessedRow(row) || !row.isEscalated) {
    return false;
  }

  return !isLevel2ActionableRow(row, unitId);
}

function getLevel2HistoryTargetUnitId(row: UnitWorkspaceRow) {
  const normalizedServiceId = row.serviceId?.trim().toUpperCase() ?? "";
  if (normalizedServiceId) {
    const [serviceUnitId] = normalizedServiceId.split("-");
    if (serviceUnitId) {
      return serviceUnitId;
    }
  }

  return normalizeUnitId(row.unitId);
}

export function decorateLevel2HistoryRows(
  rows: UnitWorkspaceRow[],
  unitId: string,
) {
  return rows.map((row) => {
    if (!isLevel2ReadOnlyHistoryRow(row, unitId)) {
      return row;
    }

    const normalizedStatus = normalizeWorkspaceStatus(row.rawStatus || row.status);
    const targetUnitId = getLevel2HistoryTargetUnitId(row);
    const targetSuffix = targetUnitId ? ` ${targetUnitId}` : "";
    const nextStatus =
      normalizedStatus === "in-service" || normalizedStatus === "calling"
        ? `Diproses${targetSuffix}`
        : normalizedStatus === "unprocessed"
          ? "Tidak Diproses"
        : `Diteruskan${targetSuffix}`;

    return {
      ...row,
      status: nextStatus,
      note: row.note,
      counterId: getUnitRowCounterId({
        status: nextStatus,
        rawStatus: row.rawStatus,
        counterId: row.counterId,
      }),
    };
  });
}

export function buildFallbackLevel2Rows() {
  return buildFallbackUnitRows(LEVEL2_FALLBACK_ROWS);
}

function getJakartaDateKeyFromTimestamp(value: string | null | undefined) {
  const timestamp = Date.parse(String(value || "").trim());
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(timestamp));
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return year && month && day ? `${year}-${month}-${day}` : "";
}

function getJakartaTodayDateKey() {
  return getJakartaDateKeyFromTimestamp(new Date().toISOString());
}

function isLevel2CompletedTodayRow(row: UnitWorkspaceRow, todayKey: string) {
  if (!isUnitCompletedRow(row)) {
    return false;
  }

  const updatedDateKey = getJakartaDateKeyFromTimestamp(row.updatedAt);
  if (updatedDateKey) {
    return updatedDateKey === todayKey;
  }

  return row.source === "fallback" && row.date === todayKey;
}

export function buildLevel2Stats(
  rows: ReturnType<typeof groupUnitRows>,
): WorkspaceStat[] {
  const todayKey = getJakartaTodayDateKey();

  return [
    {
      label: "Inbox Aktif",
      value: String(
        rows.readyRows.length + rows.calledRows.length + rows.inServiceRows.length,
      ),
      description: "Perlu tindak lanjut.",
      tone: "info",
    },
    {
      label: "Siap Ditangani",
      value: String(rows.readyRows.length + rows.calledRows.length),
      description: "Sudah bisa diambil.",
      tone: "warning",
    },
    {
      label: "Sedang Dilayani",
      value: String(rows.inServiceRows.length),
      description: "Masih berjalan.",
      tone: "role",
    },
    {
      label: "Selesai",
      value: String(
        rows.completedRows.filter((row) =>
          isLevel2CompletedTodayRow(row, todayKey),
        ).length,
      ),
      description: "Ditutup hari ini.",
      tone: "success",
    },
    {
      label: "Tidak Diproses",
      value: String(rows.unprocessedRows.length),
      description: "Hari berganti sebelum antrean selesai diproses.",
      tone: "warning",
    },
  ];
}

function getLevel2RowCreatedAtValue(row: UnitWorkspaceRow) {
  const createdAt = row.createdAt?.trim();

  if (!createdAt) {
    return 0;
  }

  const timestamp = Date.parse(createdAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function prioritizeLevel2Rows(
  rows: UnitWorkspaceRow[],
  highlightEscalationQueue: boolean,
) {
  return [...rows].sort((left, right) => {
    if (
      highlightEscalationQueue &&
      Boolean(left.isEscalated) !== Boolean(right.isEscalated)
    ) {
      return left.isEscalated ? -1 : 1;
    }

    const createdAtDelta =
      getLevel2RowCreatedAtValue(right) - getLevel2RowCreatedAtValue(left);

    if (createdAtDelta !== 0) {
      return createdAtDelta;
    }

    return right.id.localeCompare(left.id);
  });
}

export function getLevel2FocusRow(
  rows: ReturnType<typeof groupUnitRows>,
  highlightEscalationQueue = false,
) {
  return (
    prioritizeLevel2Rows(rows.readyRows, highlightEscalationQueue)[0] ??
    prioritizeLevel2Rows(rows.calledRows, highlightEscalationQueue)[0] ??
    prioritizeLevel2Rows(rows.inServiceRows, highlightEscalationQueue)[0] ??
    prioritizeLevel2Rows(rows.completedRows, highlightEscalationQueue)[0] ??
    prioritizeLevel2Rows(rows.unprocessedRows, highlightEscalationQueue)[0] ??
    null
  );
}

export function buildDisabledLevel2CapabilitiesSummary(
  permissions: StaffPermissionSet | null | undefined,
) {
  if (!permissions) {
    return null;
  }

  const disabled: string[] = [];
  if (!permissions.canStartService) {
    disabled.push("memulai dan menutup layanan");
  }
  if (!permissions.canAddStaffNote) {
    disabled.push("menambah catatan level 2");
  }

  return disabled.length ? disabled.join(", ") : null;
}
