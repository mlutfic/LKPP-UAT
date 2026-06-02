import type {
  MonitoringExportRow,
  MonitoringMetric,
  MonitoringPriorityRow,
  MonitoringRole,
  MonitoringServiceRank,
  MonitoringUnitSignal,
} from "@/features/internal/monitoring-workspace-content";
import {
  getInternalAppointmentStatusCategory,
  getInternalAppointmentStatusLabel,
  isInternalAppointmentCancelledCategory,
} from "@/features/internal/internal-appointment-status";
import type { WorkspaceStat } from "@/features/internal/internal-workspace-config";
import type { LiveStaffAppointment } from "@/features/internal/use-live-staff-appointments";
import type { StaffPermissionSet } from "@/lib/internal-role-policy";

function parseAppointmentStartDate(dateKey?: string, startTime?: string) {
  if (!dateKey) {
    return null;
  }

  const timeValue = String(startTime || "09:00").trim();
  const match = timeValue.match(/^(\d{2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const [, hour, minute] = match;
  const parsed = new Date(`${dateKey}T${hour}:${minute}:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function toWaitMinutes(row: LiveStaffAppointment, now = new Date()) {
  const appointmentDate = parseAppointmentStartDate(row.date, row.startTime);
  if (!appointmentDate) {
    return 0;
  }

  return Math.max(0, Math.round((now.getTime() - appointmentDate.getTime()) / 60_000));
}

function formatWaitLabel(waitMinutes: number) {
  if (waitMinutes >= 60) {
    const hours = Math.floor(waitMinutes / 60);
    const minutes = waitMinutes % 60;
    return minutes ? `${hours} jam ${minutes} mnt` : `${hours} jam`;
  }

  return `${Math.max(waitMinutes, 0)} menit`;
}

function formatDateLabel(dateKey?: string) {
  if (!dateKey) {
    return "-";
  }

  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dateKey;
  }

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function formatTimeLabel(startTime?: string) {
  const value = String(startTime || "").trim();
  return value ? `${value} WIB` : "-";
}

function normalizeMonitoringStatus(row: LiveStaffAppointment, waitMinutes: number) {
  const rawStatus = row.rawStatus.trim().toLowerCase();

  if (rawStatus === "in-service") {
    return "Diproses";
  }

  if (rawStatus === "calling") {
    return waitMinutes >= 15 ? "Perlu Tinjau" : "Dipanggil";
  }

  if (rawStatus === "completed") {
    return "Selesai";
  }

  if (rawStatus === "unprocessed") {
    return "Tidak Diproses";
  }

  if (rawStatus === "no-show") {
    return "Tidak Hadir";
  }

  if (row.checkedIn) {
    return waitMinutes >= 15 ? "Perlu Tinjau" : "Normal";
  }

  return "Belum Hadir";
}

function isOperationalRow(row: LiveStaffAppointment) {
  const rawStatus = row.rawStatus.trim().toLowerCase();
  return rawStatus !== "completed" && rawStatus !== "cancelled" && rawStatus !== "unprocessed";
}

function getPrioritySortWeight(row: LiveStaffAppointment, waitMinutes: number) {
  const rawStatus = row.rawStatus.trim().toLowerCase();
  if (rawStatus === "calling") {
    return 4;
  }
  if (rawStatus === "in-service") {
    return 3;
  }
  if (row.checkedIn) {
    return waitMinutes >= 15 ? 2 : 1;
  }
  return 0;
}

export function buildLiveMonitoringPriorityRows(
  appointments: LiveStaffAppointment[],
): MonitoringPriorityRow[] {
  return appointments
    .filter(isOperationalRow)
    .map((row) => {
      const waitMinutes = toWaitMinutes(row);
      return {
        id: row.id,
        queueNumber: row.queueNumber,
        serviceTitle: row.serviceTitle,
        unitLabel: row.unitLabel,
        waitLabel: formatWaitLabel(waitMinutes),
        status: normalizeMonitoringStatus(row, waitMinutes),
        note: row.note,
        weight: getPrioritySortWeight(row, waitMinutes),
        waitMinutes,
      };
    })
    .sort((left, right) => {
      if (right.weight !== left.weight) {
        return right.weight - left.weight;
      }
      return right.waitMinutes - left.waitMinutes;
    })
    .slice(0, 6)
    .map((row) => ({
      id: row.id,
      queueNumber: row.queueNumber,
      serviceTitle: row.serviceTitle,
      unitLabel: row.unitLabel,
      waitLabel: row.waitLabel,
      status: row.status,
      note: row.note,
    }));
}

export function buildLiveMonitoringUnitSignals(
  appointments: LiveStaffAppointment[],
): MonitoringUnitSignal[] {
  const grouped = new Map<
    string,
    {
      queueCount: number;
      waitTotal: number;
      waitCount: number;
      checkedInCount: number;
      inServiceCount: number;
      needsAttentionCount: number;
    }
  >();

  for (const row of appointments.filter(isOperationalRow)) {
    const current = grouped.get(row.unitLabel) ?? {
      queueCount: 0,
      waitTotal: 0,
      waitCount: 0,
      checkedInCount: 0,
      inServiceCount: 0,
      needsAttentionCount: 0,
    };
    const waitMinutes = toWaitMinutes(row);
    current.queueCount += 1;
    current.waitTotal += waitMinutes;
    current.waitCount += 1;
    if (row.checkedIn) {
      current.checkedInCount += 1;
    }
    if (row.rawStatus.trim().toLowerCase() === "in-service") {
      current.inServiceCount += 1;
    }
    if (normalizeMonitoringStatus(row, waitMinutes) === "Perlu Tinjau") {
      current.needsAttentionCount += 1;
    }
    grouped.set(row.unitLabel, current);
  }

  return Array.from(grouped.entries())
    .map(([label, value]) => {
      const averageWait = value.waitCount ? Math.round(value.waitTotal / value.waitCount) : 0;
      const status =
        value.needsAttentionCount >= 2 || averageWait >= 18
          ? "Perlu Tinjau"
          : averageWait >= 10
            ? "Normal"
            : "Stabil";

      return {
        label,
        queueCount: value.queueCount,
        avgWait: averageWait ? formatWaitLabel(averageWait).replace("menit", "mnt") : "0 mnt",
        status,
        note: `${value.checkedInCount} sudah hadir, ${value.inServiceCount} sedang dilayani, ${value.needsAttentionCount} butuh perhatian cepat.`,
      } satisfies MonitoringUnitSignal;
    })
    .sort((left, right) => right.queueCount - left.queueCount)
    .slice(0, 4);
}

export function buildLiveMonitoringServiceRanks(
  appointments: LiveStaffAppointment[],
): MonitoringServiceRank[] {
  const grouped = new Map<
    string,
    {
      volume: number;
      completed: number;
      active: number;
    }
  >();

  for (const row of appointments) {
    const current = grouped.get(row.serviceTitle) ?? {
      volume: 0,
      completed: 0,
      active: 0,
    };
    current.volume += 1;
    if (row.rawStatus.trim().toLowerCase() === "completed") {
      current.completed += 1;
    } else {
      current.active += 1;
    }
    grouped.set(row.serviceTitle, current);
  }

  return Array.from(grouped.entries())
    .map(([label, value]) => ({
      label,
      volume: value.volume,
      trend: `${value.active} aktif • ${value.completed} selesai`,
    }))
    .sort((left, right) => right.volume - left.volume)
    .slice(0, 6);
}

export function buildLiveMonitoringExportRows(
  appointments: LiveStaffAppointment[],
): MonitoringExportRow[] {
  return appointments
    .map((row) => ({
      id: row.id,
      queueNumber: row.queueNumber,
      visitorName: row.userName,
      dateLabel: formatDateLabel(row.date),
      timeLabel: formatTimeLabel(row.startTime),
      serviceCode: row.serviceId,
      serviceTitle: row.serviceTitle,
      unitLabel: row.unitLabel,
      complaint: row.complaint,
      note: row.note,
      status: getInternalAppointmentStatusLabel({
        status: row.rawStatus,
        checkedIn: row.checkedIn,
        autoCancelled: row.autoCancelled,
      }),
      rawStatus: row.rawStatus,
      autoCancelled: row.autoCancelled,
      checkedIn: row.checkedIn,
      isWalkIn: row.queueNumber.toLowerCase().includes("walk") || row.queueNumber.toLowerCase().includes("wi"),
    }))
    .sort((left, right) => left.queueNumber.localeCompare(right.queueNumber));
}

export function buildMonitoringFilterValuesFromExportRows(
  rows: MonitoringExportRow[],
) {
  const statusOptions = Array.from(
    new Set(rows.map((row) => row.status).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, "id-ID"));
  const walkInOptions = Array.from(
    new Set(
      rows.map((row) => (row.isWalkIn ? "Datang Langsung" : "Terjadwal")),
    ),
  ).sort((left, right) => left.localeCompare(right, "id-ID"));

  return {
    unitOptions: Array.from(new Set(rows.map((row) => row.unitLabel).filter(Boolean))).sort(),
    serviceOptions: Array.from(new Set(rows.map((row) => row.serviceTitle).filter(Boolean))).sort(),
    statusOptions,
    walkInOptions,
  };
}

export function filterLiveMonitoringAppointments(
  appointments: LiveStaffAppointment[],
  options: {
    searchQuery: string;
    unitFilter: string;
    serviceFilter: string;
    statusFilter: string;
    walkInFilter: string;
    datePredicate: (date: string) => boolean;
  },
) {
  const normalizedQuery = options.searchQuery.trim().toLowerCase();
  const isWalkInFilterActive = options.walkInFilter !== "all";
  const walkInValue = options.walkInFilter;
  const normalizedStatus = options.statusFilter.trim().toLowerCase();

  return appointments.filter((row) => {
    if (row.date && !options.datePredicate(row.date)) {
      return false;
    }

    if (options.unitFilter !== "all" && row.unitLabel !== options.unitFilter) {
      return false;
    }

    if (options.serviceFilter !== "all" && row.serviceTitle !== options.serviceFilter) {
      return false;
    }

    if (options.statusFilter !== "all" && row.status.trim().toLowerCase() !== normalizedStatus) {
      return false;
    }

    if (isWalkInFilterActive) {
      const rowIsWalkIn =
        row.queueNumber.toLowerCase().includes("walk") ||
        row.queueNumber.toLowerCase().includes("wi");

      if (walkInValue === "Datang Langsung" && !rowIsWalkIn) {
        return false;
      }

      if (walkInValue === "Terjadwal" && rowIsWalkIn) {
        return false;
      }
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      row.queueNumber,
      row.userName,
      row.serviceTitle,
      row.unitLabel,
      row.complaint,
      row.note,
      row.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function normalizeMonitoringExportStatus(
  row: Pick<MonitoringExportRow, "status" | "rawStatus" | "checkedIn" | "autoCancelled">,
) {
  return getInternalAppointmentStatusCategory({
    status: row.rawStatus ?? row.status,
    checkedIn: row.checkedIn,
    autoCancelled: row.autoCancelled,
  });
}

function countDistinctValues(rows: MonitoringExportRow[], selector: (row: MonitoringExportRow) => string) {
  return new Set(rows.map(selector).filter(Boolean)).size;
}

export function buildDisabledMonitoringCapabilitiesSummary(
  role: MonitoringRole,
  permissions: StaffPermissionSet | null | undefined,
) {
  if (!permissions) {
    return null;
  }

  const labels =
    role === "supervisor-monitoring"
      ? {
          canViewStatistics: "statistik monitoring",
          canExportData: "ekspor data",
        }
      : {
          canViewStatistics: "statistik monitoring",
          canExportData: "ekspor data",
          canViewAudit: "konteks audit",
        };

  const disabled = Object.entries(labels)
    .filter(([permission]) => !permissions[permission as keyof StaffPermissionSet])
    .map(([, label]) => label);

  return disabled.length ? disabled.join(", ") : null;
}

function toPercent(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

export function buildDerivedMonitoringStats({
  role,
  page,
  priorityRows,
  unitSignals,
  exportRows,
}: {
  role: MonitoringRole;
  page: "dashboard" | "monitoring" | "data-ekspor" | "ekspor-data";
  priorityRows: MonitoringPriorityRow[];
  unitSignals: MonitoringUnitSignal[];
  exportRows: MonitoringExportRow[];
}): WorkspaceStat[] {
  const totalUnits = countDistinctValues(exportRows, (row) => row.unitLabel);
  const totalServices = countDistinctValues(exportRows, (row) => row.serviceTitle);
  const attentionCount = priorityRows.filter((row) => row.status === "Perlu Tinjau").length;
  const activeCount = exportRows.filter((row) => {
    const status = normalizeMonitoringExportStatus(row);
    return (
      status !== "completed" &&
      status !== "unprocessed" &&
      !isInternalAppointmentCancelledCategory(status) &&
      status !== "no-show"
    );
  }).length;
  const completedCount = exportRows.filter(
    (row) => normalizeMonitoringExportStatus(row) === "completed",
  ).length;
  const checkedInCount = exportRows.filter((row) => row.checkedIn).length;
  const walkInCount = exportRows.filter((row) => row.isWalkIn).length;
  const waitingCount = exportRows.filter((row) => {
    const status = normalizeMonitoringExportStatus(row);
    return (
      status !== "completed" &&
      status !== "unprocessed" &&
      !isInternalAppointmentCancelledCategory(status) &&
      status !== "no-show" &&
      !row.checkedIn
    );
  }).length;
  const noShowCount = exportRows.filter((row) => {
    const status = normalizeMonitoringExportStatus(row);
    return status === "no-show" || isInternalAppointmentCancelledCategory(status);
  }).length;
  const criticalUnitCount = unitSignals.filter((row) => row.status === "Perlu Tinjau").length;
  const stableUnitCount = unitSignals.filter((row) => row.status !== "Perlu Tinjau").length;

  if (page === "dashboard") {
    if (role !== "supervisor-monitoring") {
      return [
        {
          label: "Layanan Terpantau",
          value: totalServices.toString(),
          description: "Layanan pada filter aktif.",
        },
        {
          label: "Perlu Update",
          value: (criticalUnitCount + noShowCount).toString(),
          description: "Perlu dicermati dari sisi info publik.",
          tone: "warning",
        },
        {
          label: "Belum Hadir",
          value: waitingCount.toString(),
          description: "Masih menunggu kejelasan status.",
          tone: "info",
        },
        {
          label: "Selesai",
          value: completedCount.toString(),
          description: "Sudah selesai pada filter aktif.",
          tone: "success",
        },
      ];
    }

    return [
      {
        label: "Unit Dalam Radar",
        value: totalUnits.toString(),
        description: "Unit dalam scope monitoring aktif.",
      },
      {
        label: "Butuh Intervensi",
        value: attentionCount.toString(),
        description: "Perlu keputusan cepat supervisor.",
        tone: "warning",
      },
      {
        label: "Sedang Bergerak",
        value: activeCount.toString(),
        description: "Masih berjalan di meja layanan.",
        tone: "info",
      },
      {
        label: "Tuntas Hari Ini",
        value: completedCount.toString(),
        description: "Sudah ditutup pada scope aktif.",
        tone: "success",
      },
    ];
  }

  if (page === "monitoring") {
    if (role !== "supervisor-monitoring") {
      return [
        {
          label: "Layanan Terpantau",
          value: totalServices.toString(),
          description: "Layanan pada filter aktif.",
        },
        {
          label: "Perlu Update",
          value: criticalUnitCount.toString(),
          description: "Perlu dicek dari sisi info publik.",
          tone: "warning",
        },
        {
          label: "Belum Hadir",
          value: (waitingCount + noShowCount).toString(),
          description: "Perlu pengingat atau klarifikasi.",
          tone: "info",
        },
        {
          label: "Selesai",
          value: completedCount.toString(),
          description: "Relatif tidak butuh follow-up.",
          tone: "success",
        },
      ];
    }

    return [
      {
        label: "Unit Kritis",
        value: criticalUnitCount.toString(),
        description: "Unit yang perlu dibaca dulu.",
        tone: "warning",
      },
      {
        label: "Antrean Prioritas",
        value: priorityRows.length.toString(),
        description: "Naik ke daftar perhatian.",
        tone: "danger",
      },
      {
        label: "Unit Stabil",
        value: stableUnitCount.toString(),
        description: "Masih berjalan stabil.",
        tone: "success",
      },
      {
        label: "Layanan Terbaca",
        value: totalServices.toString(),
        description: "Layanan pada filter aktif.",
        tone: "info",
      },
    ];
  }

  if (role === "humas-monitoring") {
    return [
      {
        label: "Baris Data",
        value: exportRows.length.toString(),
        description: "Baris pada filter aktif.",
      },
      {
        label: "Perlu Follow-up",
        value: (waitingCount + noShowCount).toString(),
        description: "Butuh klarifikasi.",
        tone: "warning",
      },
      {
        label: "Walk-in",
        value: walkInCount.toString(),
        description: "Kunjungan langsung.",
        tone: "info",
      },
      {
        label: "Selesai",
        value: completedCount.toString(),
        description: "Sudah tuntas.",
        tone: "success",
      },
    ];
  }

  return [
    {
      label: "Baris Data",
      value: exportRows.length.toString(),
      description: "Baris pada filter aktif.",
    },
    {
      label: "Sudah Hadir",
      value: checkedInCount.toString(),
      description: "Sudah check-in.",
      tone: "info",
    },
    {
      label: "Walk-in",
      value: walkInCount.toString(),
      description: "Kunjungan langsung.",
      tone: "warning",
    },
    {
      label: "Selesai",
      value: completedCount.toString(),
      description: "Tuntas pada data terfilter.",
      tone: "success",
    },
  ];
}

export function buildDerivedMonitoringQualityMetrics(
  exportRows: MonitoringExportRow[],
): MonitoringMetric[] {
  const totalRows = exportRows.length;
  const completedCount = exportRows.filter(
    (row) => normalizeMonitoringExportStatus(row) === "completed",
  ).length;
  const checkedInCount = exportRows.filter((row) => row.checkedIn).length;
  const walkInCount = exportRows.filter((row) => row.isWalkIn).length;
  const noShowCount = exportRows.filter(
    (row) => normalizeMonitoringExportStatus(row) === "no-show",
  ).length;

  return [
    { label: "Tingkat selesai", value: toPercent(completedCount, totalRows) },
    { label: "Kehadiran", value: toPercent(checkedInCount, totalRows) },
    { label: "Kunjungan langsung", value: toPercent(walkInCount, totalRows) },
    { label: "No-show", value: toPercent(noShowCount, totalRows) },
  ];
}
