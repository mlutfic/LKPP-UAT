"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AppAnalyticsBarList,
  AppAnalyticsColumnChart,
  AppAnalyticsConcentricChart,
  AppAnalyticsMetricTiles,
  AppAnalyticsPanel,
  AppAnalyticsSegmentBar,
  AppAnalyticsStackedAreaChart,
  AppAnalyticsWeekStrip,
} from "@/components/composite/app-analytics-panels";
import { AppPageIntro } from "@/components/composite/app-page-intro";
import { MobileProfileLogoutSection } from "@/components/composite/mobile-profile-logout-section";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppDialog } from "@/components/ui/app-dialog";
import {
  AppDateFilter,
  createAppDateFilterValue,
  formatAppDateFilterLabel,
  getJakartaTodayKey,
  isDateWithinAppDateFilter,
  type AppDateFilterValue,
} from "@/components/ui/app-date-filter";
import { AppFilterTrigger } from "@/components/ui/app-filter-trigger";
import { AppInput } from "@/components/ui/app-input";
import { AppPagination } from "@/components/ui/app-pagination";
import {
  AppSearchSelect,
  type AppSearchSelectOption,
} from "@/components/ui/app-search-select";
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
import { InternalWorkspaceUnavailable } from "@/features/internal/components/internal-workspace-unavailable";
import {
  getInternalAppointmentStatusCategory,
  isInternalAppointmentCancelledCategory,
  type InternalAppointmentStatusCategory,
} from "@/features/internal/internal-appointment-status";
import {
  getInternalPageConfig,
  getInternalPagePath,
  type InternalPageKey,
} from "@/features/internal/internal-workspace-config";
import {
  getMonitoringExportRows,
  getMonitoringPersonaConfig,
  getMonitoringPriorityRows,
  getMonitoringServiceRanks,
  getMonitoringUnitSignals,
  monitoringPageActions,
  monitoringQualityMetrics,
  monitoringQuickActions,
  monitoringServiceOptions,
  type MonitoringExportRow,
  type MonitoringPriorityRow,
  type MonitoringServiceRank,
  type MonitoringUnitSignal,
  type MonitoringRole,
} from "@/features/internal/monitoring-workspace-content";
import {
  buildDerivedMonitoringQualityMetrics,
  buildDerivedMonitoringStats,
  buildLiveMonitoringExportRows,
  buildLiveMonitoringPriorityRows,
  buildLiveMonitoringServiceRanks,
  buildLiveMonitoringUnitSignals,
  buildMonitoringFilterValuesFromExportRows,
  filterLiveMonitoringAppointments,
} from "@/features/internal/monitoring/workspace";
import { useMonitoringSettings } from "@/features/internal/use-monitoring-settings";
import { resolveWorkspaceStatusTone } from "@/features/internal/internal-workspace-actions";
import {
  useLiveStaffAppointments,
  type LiveStaffAppointment,
} from "@/features/internal/use-live-staff-appointments";
import { useStaffRolePermissions } from "@/features/internal/use-staff-role-permissions";
import { getInternalUnavailableCopy } from "@/features/internal/internal-workspace-registry";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  describeStaffPermissionRequirement,
  getFirstAccessibleStaffPath,
  getMissingStaffPermissions,
  getStaffRoutePermissionRequirement,
} from "@/lib/internal-role-access";

type MonitoringPage = Extract<
  InternalPageKey,
  "dashboard" | "monitoring" | "data-ekspor" | "ekspor-data" | "profil"
>;

const EXPORT_BLOCKED_MESSAGE = "Akses ekspor data belum tersedia untuk peran ini.";

function resolveMonitoringIcon(
  icon: "eye" | "download" | "sheet" | "filter" | "refresh" | "bell",
) {
  if (icon === "eye") return Eye;
  if (icon === "download") return Download;
  if (icon === "sheet") return FileSpreadsheet;
  if (icon === "filter") return Filter;
  if (icon === "refresh") return RefreshCcw;
  return Bell;
}

const INDONESIAN_MONTHS: Record<string, string> = {
  januari: "01",
  februari: "02",
  maret: "03",
  april: "04",
  mei: "05",
  juni: "06",
  juli: "07",
  agustus: "08",
  september: "09",
  oktober: "10",
  november: "11",
  desember: "12",
};

function toDateKeyFromLabel(dateLabel: string) {
  const match = dateLabel.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!match) {
    return "";
  }

  const [, day, monthLabel, year] = match;
  const month = INDONESIAN_MONTHS[monthLabel.toLowerCase()];
  if (!month) {
    return "";
  }

  return `${year}-${month}-${day.padStart(2, "0")}`;
}

type MonitoringChartItem = {
  label: string;
  value: number;
  meta?: string;
  tone?: "role" | "info" | "warning" | "success" | "danger" | "neutral";
};

type MonitoringSignalCard = {
  id: string;
  title: string;
  status: string;
  meta?: string;
  note: string;
};

type MonitoringExportAggregate = {
  label: string;
  total: number;
  waiting: number;
  active: number;
  completed: number;
  unprocessed: number;
  noShow: number;
  walkIn: number;
};

type MonitoringExportFormat = "csv" | "json" | "pdf" | "sql";
type MonitoringExportScope = "raw" | "summary" | "follow-up";

type MonitoringExportPreviewPayload = {
  scope: MonitoringExportScope;
  format: MonitoringExportFormat;
  scopeLabel: string;
  filename: string;
  mimeType: string;
  rowCount: number;
  content: string;
};

const EXPORT_FORMAT_LABEL: Record<MonitoringExportFormat, string> = {
  csv: "CSV",
  json: "JSON",
  pdf: "PDF",
  sql: "SQL",
};

const EXPORT_FORMAT_OPTIONS_BY_SCOPE: Record<
  MonitoringExportScope,
  MonitoringExportFormat[]
> = {
  raw: ["csv", "json", "pdf", "sql"],
  summary: ["csv"],
  "follow-up": ["csv"],
};

const WEEKDAY_SHORT_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;

function isMonitoringExportFormatAllowed(
  scope: MonitoringExportScope,
  format: MonitoringExportFormat,
) {
  return EXPORT_FORMAT_OPTIONS_BY_SCOPE[scope].includes(format);
}

function isMonitoringExportPage(page: MonitoringPage) {
  return page === "data-ekspor" || page === "ekspor-data";
}

function getMonitoringExportPage(role: MonitoringRole) {
  return role === "supervisor-monitoring" || role === "humas-monitoring"
    ? "data-ekspor"
    : "ekspor-data";
}

function buildMonitoringExportPreviewPayload(
  scope: MonitoringExportScope,
  format: MonitoringExportFormat,
  options: {
    role: MonitoringRole;
    exportRows: MonitoringExportRow[];
    summaryAggregateRows: MonitoringExportAggregate[];
    followUpRows: MonitoringExportRow[];
    exportPrefix: string;
  },
): MonitoringExportPreviewPayload | null {
  if (!isMonitoringExportFormatAllowed(scope, format)) {
    return null;
  }

  if (scope === "summary") {
    if (!options.summaryAggregateRows.length) {
      return null;
    }

    return {
      scope: "summary",
      format: "csv",
      scopeLabel: "Ringkasan",
      filename: `${options.exportPrefix}-${options.role === "supervisor-monitoring" ? "rekap-unit" : "rekap-layanan"}-${getJakartaTodayKey()}.csv`,
      mimeType: "text/csv;charset=utf-8;",
      rowCount: options.summaryAggregateRows.length,
      content: buildMonitoringAggregateCsv(
        options.summaryAggregateRows,
        options.role === "supervisor-monitoring" ? "Unit" : "Layanan",
      ),
    };
  }

  if (scope === "follow-up") {
    if (!options.followUpRows.length) {
      return null;
    }

    return {
      scope: "follow-up",
      format: "csv",
      scopeLabel: "Follow-up",
      filename: `${options.exportPrefix}-tindak-lanjut-${getJakartaTodayKey()}.csv`,
      mimeType: "text/csv;charset=utf-8;",
      rowCount: options.followUpRows.length,
      content: buildMonitoringFollowUpCsv(options.followUpRows),
    };
  }

  if (!options.exportRows.length) {
    return null;
  }

  if (format === "csv") {
    return {
      scope: "raw",
      format: "csv",
      scopeLabel: "Data terfilter",
      filename: `${options.exportPrefix}-${getJakartaTodayKey()}.csv`,
      mimeType: "text/csv;charset=utf-8;",
      rowCount: options.exportRows.length,
      content: buildMonitoringCsv(options.exportRows),
    };
  }

  if (format === "json") {
    return {
      scope: "raw",
      format: "json",
      scopeLabel: "Data terfilter",
      filename: `${options.exportPrefix}-${getJakartaTodayKey()}.json`,
      mimeType: "application/json;charset=utf-8;",
      rowCount: options.exportRows.length,
      content: JSON.stringify(options.exportRows, null, 2),
    };
  }

  if (format === "pdf") {
    return {
      scope: "raw",
      format: "pdf",
      scopeLabel: "Data terfilter",
      filename: `${options.exportPrefix}-${getJakartaTodayKey()}.pdf`,
      mimeType: "application/pdf",
      rowCount: options.exportRows.length,
      content: buildMonitoringPdf(options.role, options.exportRows),
    };
  }

  return {
    scope: "raw",
    format: "sql",
    scopeLabel: "Data terfilter",
    filename: `${options.exportPrefix}-${getJakartaTodayKey()}.sql`,
    mimeType: "text/plain;charset=utf-8;",
    rowCount: options.exportRows.length,
    content: buildMonitoringSql(options.exportRows),
  };
}

function buildMonitoringExportPreviewText(content: string) {
  const lines = content.split("\n");
  const maxLines = 30;
  const maxChars = 5_500;

  const preview = lines.slice(0, maxLines).join("\n");
  if (content.length <= maxChars && lines.length <= maxLines) {
    return preview;
  }

  return `${preview}\n\n… potongan preview (file lengkap akan diunduh saat menekan Ambil Unduhan)`;
}

function getJakartaDateKeyDaysAgo(daysAgo: number) {
  const date = new Date(`${getJakartaTodayKey()}T00:00:00+07:00`);
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function getWeekdayShortLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00+07:00`);
  return WEEKDAY_SHORT_LABELS[date.getDay()] ?? "Sen";
}

function normalizeMonitoringStatus(
  row: Pick<MonitoringExportRow, "status" | "checkedIn" | "autoCancelled" | "rawStatus">,
) {
  return getInternalAppointmentStatusCategory({
    status: row.rawStatus ?? row.status,
    checkedIn: row.checkedIn,
    autoCancelled: row.autoCancelled,
  });
}

function getStatusAttentionWeight(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized.includes("perlu tinjau")) {
    return 0;
  }

  if (
    normalized.includes("belum hadir") ||
    normalized.includes("dipanggil") ||
    normalized.includes("diproses") ||
    normalized.includes("calling") ||
    normalized.includes("in-service")
  ) {
    return 1;
  }

  if (normalized.includes("siap") || normalized.includes("normal") || normalized.includes("stabil")) {
    return 2;
  }

  if (normalized.includes("selesai")) {
    return 3;
  }

  return 2;
}

function isInactiveMonitoringStatus(status: InternalAppointmentStatusCategory) {
  return (
    status === "completed" ||
    status === "unprocessed" ||
    status === "no-show" ||
    isInternalAppointmentCancelledCategory(status)
  );
}

function parseMonitoringWaitLabel(waitLabel: string) {
  const normalized = waitLabel.toLowerCase();
  const hourMatch = normalized.match(/(\d+)\s*jam/);
  const minuteMatch = normalized.match(/(\d+)\s*(menit|mnt)/);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;

  return hours * 60 + minutes;
}

function sortPriorityRowsByAttention(rows: MonitoringPriorityRow[]) {
  return [...rows].sort((left, right) => {
    const attentionDiff =
      getStatusAttentionWeight(left.status) - getStatusAttentionWeight(right.status);
    if (attentionDiff !== 0) {
      return attentionDiff;
    }

    return parseMonitoringWaitLabel(right.waitLabel) - parseMonitoringWaitLabel(left.waitLabel);
  });
}

function sortUnitSignalsByAttention(rows: MonitoringUnitSignal[]) {
  return [...rows].sort((left, right) => {
    const attentionDiff =
      getStatusAttentionWeight(left.status) - getStatusAttentionWeight(right.status);
    if (attentionDiff !== 0) {
      return attentionDiff;
    }

    return right.queueCount - left.queueCount;
  });
}

function getExportRowAttentionWeight(
  row: MonitoringExportRow,
  role: MonitoringRole,
) {
  const status = normalizeMonitoringStatus(row);

  if (role === "humas-monitoring") {
    if (
      status === "unprocessed" ||
      status === "no-show" ||
      isInternalAppointmentCancelledCategory(status)
    ) {
      return 0;
    }

    if (!row.checkedIn && status !== "completed") {
      return 1;
    }

    if (status !== "completed") {
      return 2;
    }

    return 3;
  }

  if (!isInactiveMonitoringStatus(status)) {
    return row.checkedIn ? 0 : 1;
  }

  return status === "completed" ? 2 : 3;
}

function sortExportRowsByAttention(
  rows: MonitoringExportRow[],
  role: MonitoringRole,
) {
  return [...rows].sort((left, right) => {
    const attentionDiff =
      getExportRowAttentionWeight(left, role) - getExportRowAttentionWeight(right, role);
    if (attentionDiff !== 0) {
      return attentionDiff;
    }

    return left.queueNumber.localeCompare(right.queueNumber);
  });
}

function sortCommunicationSignalsByAttention(items: MonitoringSignalCard[]) {
  return [...items].sort((left, right) => {
    const attentionDiff =
      getStatusAttentionWeight(left.status) - getStatusAttentionWeight(right.status);
    if (attentionDiff !== 0) {
      return attentionDiff;
    }

    return left.title.localeCompare(right.title);
  });
}

function summarizeMonitoringRows(rows: MonitoringExportRow[]) {
  let waiting = 0;
  let active = 0;
  let completed = 0;
  let unprocessed = 0;
  let noShow = 0;
  let cancelledSystem = 0;
  let cancelledManual = 0;
  let walkIn = 0;

  for (const row of rows) {
    const status = normalizeMonitoringStatus(row);

    if (row.isWalkIn) {
      walkIn += 1;
    }

    if (status === "completed") {
      completed += 1;
    } else if (status === "unprocessed") {
      unprocessed += 1;
    } else if (status === "no-show") {
      noShow += 1;
    } else if (status === "cancelled-system") {
      cancelledSystem += 1;
    } else if (status === "cancelled-manual") {
      cancelledManual += 1;
    } else if (row.checkedIn) {
      active += 1;
    } else {
      waiting += 1;
    }
  }

  return {
    waiting,
    active,
    completed,
    unprocessed,
    noShow,
    cancelledSystem,
    cancelledManual,
    walkIn,
  };
}

function buildMonitoringStatusBreakdown(rows: MonitoringExportRow[]): MonitoringChartItem[] {
  const {
    waiting,
    active,
    completed,
    unprocessed,
    noShow,
    cancelledSystem,
    cancelledManual,
  } =
    summarizeMonitoringRows(rows);

  return [
    { label: "Menunggu", value: waiting, tone: "neutral" },
    { label: "Aktif", value: active, tone: "warning" },
    { label: "Selesai", value: completed, tone: "success" },
    { label: "Tidak Diproses", value: unprocessed, tone: "warning" },
    { label: "Tidak Hadir", value: noShow, tone: "warning" },
    { label: "Batal Sistem", value: cancelledSystem, tone: "danger" },
    { label: "Batal Pengguna", value: cancelledManual, tone: "neutral" },
  ];
}

function buildMonitoringWeekBreakdown(rows: MonitoringExportRow[]): MonitoringChartItem[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const dateKey = toDateKeyFromLabel(row.dateLabel);
    if (!dateKey) {
      continue;
    }

    counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const dateKey = getJakartaDateKeyDaysAgo(6 - index);
    const value = counts.get(dateKey) ?? 0;
    return {
      label: getWeekdayShortLabel(dateKey),
      value,
      tone: value > 0 ? "role" : "neutral",
    } satisfies MonitoringChartItem;
  });
}

function buildMonitoringPrimaryTrendSeries(
  rows: MonitoringExportRow[],
  items: MonitoringChartItem[],
  selector: "unitLabel" | "serviceTitle",
) {
  const timeline = Array.from({ length: 7 }, (_, index) => {
    const dateKey = getJakartaDateKeyDaysAgo(6 - index);
    return {
      dateKey,
      label: getWeekdayShortLabel(dateKey),
    };
  });

  const series = items.slice(0, 3).map((item, index) => ({
    label: item.label,
    tone:
      item.tone ??
      (index === 0 ? ("role" as const) : index === 1 ? ("info" as const) : ("warning" as const)),
    values: timeline.map(({ dateKey }) =>
      rows.filter((row) => toDateKeyFromLabel(row.dateLabel) === dateKey && row[selector] === item.label).length,
    ),
  }));

  return {
    labels: timeline.map((item) => item.label),
    series: series.filter((item) => item.values.some((value) => value > 0)),
  };
}

function buildMonitoringQualityChartItems(metrics: typeof monitoringQualityMetrics) {
  return metrics.map((item) => ({
    label: item.label,
    value: item.value,
    tone: item.label === "No-show"
      ? ("danger" as const)
      : item.label === "Tingkat selesai"
        ? ("success" as const)
        : item.label === "Kehadiran"
          ? ("info" as const)
          : ("role" as const),
  }));
}

function buildMonitoringCsvTable(
  header: string[],
  body: Array<Array<string | number | boolean>>,
) {
  return [header, ...body]
    .map((columns) =>
      columns
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}

function buildMonitoringAggregates(
  rows: MonitoringExportRow[],
  selector: "unitLabel" | "serviceTitle",
): MonitoringExportAggregate[] {
  const grouped = new Map<string, MonitoringExportAggregate>();

  for (const row of rows) {
    const key = row[selector];
    if (!key) {
      continue;
    }

    const current =
      grouped.get(key) ?? {
        label: key,
        total: 0,
        waiting: 0,
        active: 0,
        completed: 0,
        unprocessed: 0,
        noShow: 0,
        walkIn: 0,
      };

    current.total += 1;
    if (row.isWalkIn) {
      current.walkIn += 1;
    }

    const status = normalizeMonitoringStatus(row);
    if (status === "completed") {
      current.completed += 1;
    } else if (status === "unprocessed") {
      current.unprocessed += 1;
    } else if (status === "no-show" || isInternalAppointmentCancelledCategory(status)) {
      current.noShow += 1;
    } else if (row.checkedIn) {
      current.active += 1;
    } else {
      current.waiting += 1;
    }

    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((left, right) => right.total - left.total);
}

function buildMonitoringAggregateCsv(
  rows: MonitoringExportAggregate[],
  subjectLabel: string,
) {
  return buildMonitoringCsvTable(
    [
      subjectLabel,
      "Total",
      "Menunggu",
      "Aktif",
      "Selesai",
      "Tidak Diproses",
      "Tidak Hadir",
      "Walk-in",
    ],
    rows.map((row) => [
      row.label,
      row.total,
      row.waiting,
      row.active,
      row.completed,
      row.unprocessed,
      row.noShow,
      row.walkIn,
    ]),
  );
}

function buildMonitoringFollowUpRows(
  rows: MonitoringExportRow[],
  role: MonitoringRole,
) {
  return rows.filter((row) => {
    const status = normalizeMonitoringStatus(row);

    if (role === "supervisor-monitoring") {
      return !isInactiveMonitoringStatus(status);
    }

    return (
      status === "unprocessed" ||
      status === "no-show" ||
      isInternalAppointmentCancelledCategory(status) ||
      !row.checkedIn
    );
  });
}

function buildMonitoringFollowUpCsv(rows: MonitoringExportRow[]) {
  return buildMonitoringCsvTable(
    [
      "No Antrean",
      "Pengunjung",
      "Tanggal",
      "Jam",
      "Layanan",
      "Unit",
      "Status",
      "Sudah Hadir",
      "Catatan",
    ],
    rows.map((row) => [
      row.queueNumber,
      row.visitorName,
      row.dateLabel,
      row.timeLabel,
      row.serviceTitle,
      row.unitLabel,
      row.status,
      row.checkedIn ? "Ya" : "Tidak",
      row.note || row.complaint,
    ]),
  );
}

function buildHumasPublicSignalBreakdown(rows: MonitoringExportRow[]): MonitoringChartItem[] {
  const {
    waiting,
    active,
    completed,
    unprocessed,
    noShow,
    cancelledSystem,
    cancelledManual,
  } =
    summarizeMonitoringRows(rows);

  return [
    { label: "Belum hadir", value: waiting, tone: "warning" },
    { label: "Sedang berjalan", value: active, tone: "info" },
    { label: "Selesai", value: completed, tone: "success" },
    { label: "Tidak diproses", value: unprocessed, tone: "warning" },
    { label: "Tidak hadir", value: noShow, tone: "warning" },
    { label: "Batal sistem", value: cancelledSystem, tone: "danger" },
    { label: "Batal pengguna", value: cancelledManual, tone: "neutral" },
  ];
}

function buildSupervisorControlItems(
  priorityRows: MonitoringPriorityRow[],
  unitSignals: MonitoringUnitSignal[],
  exportRows: MonitoringExportRow[],
): MonitoringChartItem[] {
  const counts = summarizeMonitoringRows(exportRows);
  const criticalUnits = unitSignals.filter((item) => item.status === "Perlu Tinjau").length;
  const stableUnits = unitSignals.filter((item) => item.status !== "Perlu Tinjau").length;
  const interventionCount = priorityRows.filter((item) => item.status === "Perlu Tinjau").length;

  return [
    {
      label: "Intervensi cepat",
      value: interventionCount,
      meta: "Antrean yang perlu keputusan supervisor",
      tone: "warning",
    },
    {
      label: "Unit ketat",
      value: criticalUnits,
      meta: "Unit dengan ritme yang mulai menekan SLA",
      tone: "danger",
    },
    {
      label: "Antrean aktif",
      value: counts.active,
      meta: "Masih bergerak di meja layanan",
      tone: "info",
    },
    {
      label: "Unit stabil",
      value: stableUnits,
      meta: "Belum memberi sinyal intervensi cepat",
      tone: "success",
    },
  ];
}

function buildHumasCommunicationSignals(
  serviceRanks: MonitoringServiceRank[],
  unitSignals: MonitoringUnitSignal[],
  exportRows: MonitoringExportRow[],
): MonitoringSignalCard[] {
  const counts = summarizeMonitoringRows(exportRows);
  const items: MonitoringSignalCard[] = [];

  for (const unit of unitSignals.filter((item) => item.status === "Perlu Tinjau").slice(0, 2)) {
    items.push({
      id: `unit-${unit.label}`,
      title: `${unit.label} perlu dicek`,
      status: "Perlu Tinjau",
      meta: `${unit.queueCount} antrean pada periode ini`,
      note: "Pastikan jam layanan, alur, dan status antrean di kanal publik tetap sejalan.",
    });
  }

  for (const service of serviceRanks.slice(0, 2)) {
    items.push({
      id: `service-${service.label}`,
      title: `${service.label} paling ramai`,
      status: service.volume >= 6 ? "Perlu Tinjau" : "Siap",
      meta: `${service.volume} antrean pada periode ini`,
      note: "Layanan ini layak diprioritaskan saat membuat ringkasan atau pengumuman singkat.",
    });
  }

  if (counts.waiting + counts.noShow > 0) {
    items.push({
      id: "attendance-follow-up",
      title: "Perjelas pengingat kehadiran",
      status: "Perlu Tinjau",
      meta: `${counts.waiting + counts.noShow} antrean perlu perhatian`,
      note: "Cek lagi copy pengingat hadir, status slot, dan panduan check-in.",
    });
  }

  return items.slice(0, 5);
}

function getCompactMonitoringNote(note: string) {
  if (note.length <= 96) {
    return note;
  }

  return `${note.slice(0, 93).trimEnd()}...`;
}

function buildMonitoringCsv(rows: MonitoringExportRow[]) {
  return buildMonitoringCsvTable(
    [
      "No Antrean",
      "Nama Pengunjung",
      "Tanggal",
      "Jam",
      "Kode Layanan",
      "Layanan",
      "Unit",
      "Status",
      "Sudah Hadir",
      "Walk-in",
      "Keluhan",
      "Catatan",
    ],
    rows.map((row) => [
      row.queueNumber,
      row.visitorName,
      row.dateLabel,
      row.timeLabel,
      row.serviceCode,
      row.serviceTitle,
      row.unitLabel,
      row.status,
      row.checkedIn ? "Ya" : "Tidak",
      row.isWalkIn ? "Ya" : "Tidak",
      row.complaint,
      row.note,
    ]),
  );
}

function escapeMonitoringSqlValue(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function buildMonitoringSql(rows: MonitoringExportRow[]) {
  const tableName = "lkpp_monitoring_export";
  const columns = [
    "queue_number",
    "visitor_name",
    "date_label",
    "time_label",
    "service_code",
    "service_title",
    "unit_label",
    "status_label",
    "checked_in",
    "is_walk_in",
    "complaint",
    "note",
  ];

  const createTable = [
    `CREATE TABLE IF NOT EXISTS ${tableName} (`,
    "  queue_number TEXT,",
    "  visitor_name TEXT,",
    "  date_label TEXT,",
    "  time_label TEXT,",
    "  service_code TEXT,",
    "  service_title TEXT,",
    "  unit_label TEXT,",
    "  status_label TEXT,",
    "  checked_in BOOLEAN,",
    "  is_walk_in BOOLEAN,",
    "  complaint TEXT,",
    "  note TEXT",
    ");",
  ].join("\n");

  const inserts = rows.map((row) =>
    [
      `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (`,
      [
        row.queueNumber,
        row.visitorName,
        row.dateLabel,
        row.timeLabel,
        row.serviceCode,
        row.serviceTitle,
        row.unitLabel,
        row.status,
        row.checkedIn ? "TRUE" : "FALSE",
        row.isWalkIn ? "TRUE" : "FALSE",
        row.complaint,
        row.note,
      ]
        .map((value, index) =>
          index === 8 || index === 9
            ? String(value)
            : escapeMonitoringSqlValue(String(value)),
        )
        .join(", "),
      ");",
    ].join(""),
  );

  return [
    "-- LKPP Antrean monitoring export",
    `-- Generated on ${new Date().toISOString()}`,
    "",
    createTable,
    "",
    ...inserts,
    "",
  ].join("\n");
}

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function buildMonitoringPdf(role: MonitoringRole, rows: MonitoringExportRow[]) {
  const title =
    role === "supervisor-monitoring"
      ? "LKPP Antrean - Ekspor Supervisor"
      : "LKPP Antrean - Rekap Humas Monitoring";

  const lines = [
    `Tanggal ekspor: ${new Intl.DateTimeFormat("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(new Date())}`,
    `Jumlah baris: ${rows.length}`,
    "",
    "No Antrean | Pengunjung | Status | Layanan | Unit",
    ...rows.flatMap((row) => {
      const mainLine = [
        row.queueNumber,
        row.visitorName,
        row.status,
        row.serviceTitle,
        row.unitLabel,
      ]
        .join(" | ")
        .slice(0, 112);

      return [mainLine, `Catatan: ${getCompactMonitoringNote(row.note || row.complaint || "-")}`];
    }),
  ];

  const pageHeight = 792;
  const startX = 48;
  const startY = 760;
  const lineHeight = 16;
  const linesPerPage = 40;
  const contentChunks: string[] = [];

  for (let index = 0; index < lines.length; index += linesPerPage) {
    const chunk = lines.slice(index, index + linesPerPage);
    const body = [
      "BT",
      "/F1 15 Tf",
      `${startX} ${startY} Td`,
      `(${escapePdfText(title)}) Tj`,
      "/F1 10 Tf",
      "0 -24 Td",
      ...chunk.flatMap((line) => [`(${escapePdfText(line)}) Tj`, `0 -${lineHeight} Td`]),
      "ET",
    ].join("\n");

    contentChunks.push(body);
  }

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [PLACEHOLDER_KIDS] /Count PLACEHOLDER_COUNT >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  const pageObjectIds: number[] = [];

  contentChunks.forEach((content, index) => {
    const pageObjectId = 4 + index * 2;
    const contentObjectId = pageObjectId + 1;
    pageObjectIds.push(pageObjectId);
    objects[pageObjectId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId] =
      `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`;
  });

  objects[2] = objects[2]
    .replace("PLACEHOLDER_KIDS", pageObjectIds.map((id) => `${id} 0 R`).join(" "))
    .replace("PLACEHOLDER_COUNT", String(pageObjectIds.length));

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let index = 1; index < objects.length; index += 1) {
    if (!objects[index]) {
      continue;
    }

    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < objects.length; index += 1) {
    const offset = offsets[index] ?? 0;
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function triggerDownload(
  content: string,
  filename: string,
  mimeType: string,
) {
  if (typeof window === "undefined") {
    return false;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  );
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return true;
}

function MonitoringFilterBar({
  role,
  searchQuery,
  onSearchQueryChange,
  dateFilter,
  onDateFilterChange,
  unitFilter,
  onUnitFilterChange,
  serviceFilter,
  onServiceFilterChange,
  statusFilter,
  onStatusFilterChange,
  walkInFilter,
  onWalkInFilterChange,
  availableUnitOptions,
  availableServiceOptions,
  availableStatusOptions,
  availableWalkInOptions,
  showAdvancedFilters,
  onToggleAdvancedFilters,
  onResetFilters,
}: {
  role: MonitoringRole;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  dateFilter: AppDateFilterValue;
  onDateFilterChange: (value: AppDateFilterValue) => void;
  unitFilter: string;
  onUnitFilterChange: (value: string) => void;
  serviceFilter: string;
  onServiceFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  walkInFilter: string;
  onWalkInFilterChange: (value: string) => void;
  availableUnitOptions: string[];
  availableServiceOptions: string[];
  availableStatusOptions: string[];
  availableWalkInOptions: string[];
  showAdvancedFilters: boolean;
  onToggleAdvancedFilters: () => void;
  onResetFilters: () => void;
}) {
  const persona = getMonitoringPersonaConfig(role);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const activeFilterCount =
    (dateFilter.startDate === today && dateFilter.endDate === today ? 0 : 1) +
    (unitFilter !== "all" ? 1 : 0) +
    (serviceFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (walkInFilter !== "all" ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);
  const unitOptions = React.useMemo<AppSearchSelectOption[]>(
    () =>
      availableUnitOptions.map((option, index) => ({
        value: index === 0 ? "all" : option,
        label: option,
        keywords: [persona.scopeLabel, role],
      })),
    [availableUnitOptions, persona.scopeLabel, role],
  );
  const serviceOptions = React.useMemo<AppSearchSelectOption[]>(
    () =>
      availableServiceOptions.map((option, index) => ({
        value: index === 0 ? "all" : option,
        label: option,
      })),
    [availableServiceOptions],
  );
  const statusOptions = React.useMemo<AppSearchSelectOption[]>(
    () =>
      availableStatusOptions.map((option, index) => ({
        value: index === 0 ? "all" : option,
        label: option,
      })),
    [availableStatusOptions],
  );
  const walkInOptions = React.useMemo<AppSearchSelectOption[]>(
    () =>
      availableWalkInOptions.map((option, index) => ({
        value: index === 0 ? "all" : option,
        label: option,
      })),
    [availableWalkInOptions],
  );

  return (
    <div className="space-y-4 rounded-[calc(var(--radius-2xl)+4px)] border border-border bg-surface-container-lowest p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Filter monitoring
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:items-center">
          <AppDateFilter value={dateFilter} onChange={onDateFilterChange} />

          <AppFilterTrigger
            icon={SlidersHorizontal}
            label="Filter"
            count={activeFilterCount}
            active={showAdvancedFilters}
            onClick={onToggleAdvancedFilters}
          />
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <AppInput
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Cari antrean, layanan, unit, atau nama tamu"
          className="h-11 pl-10 pr-11"
        />
        {searchQuery ? (
          <button
            type="button"
            aria-label="Hapus pencarian"
            onClick={() => onSearchQueryChange("")}
            className="absolute right-3 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {showAdvancedFilters ? (
        <div className="grid gap-3 border-t border-border/80 pt-4 md:grid-cols-2 xl:grid-cols-4">
          <AppSearchSelect
            value={unitFilter}
            onValueChange={onUnitFilterChange}
            disabled={persona.unitFilterLocked}
            options={unitOptions}
            placeholder="Pilih unit"
            searchPlaceholder="Cari unit"
            emptyMessage="Unit tidak ditemukan."
            className="w-full"
          />

          <AppSearchSelect
            value={serviceFilter}
            onValueChange={onServiceFilterChange}
            options={serviceOptions}
            placeholder="Pilih layanan"
            searchPlaceholder="Cari layanan"
            emptyMessage="Layanan tidak ditemukan."
            className="w-full"
          />

          <AppSearchSelect
            value={statusFilter}
            onValueChange={onStatusFilterChange}
            options={statusOptions}
            placeholder="Filter status"
            searchPlaceholder="Cari status"
            emptyMessage="Status tidak ditemukan."
            className="w-full"
          />

          <AppSearchSelect
            value={walkInFilter}
            onValueChange={onWalkInFilterChange}
            options={walkInOptions}
            placeholder="Jenis kunjungan"
            searchPlaceholder="Cari jenis kunjungan"
            emptyMessage="Jenis kunjungan tidak ditemukan."
            className="w-full"
          />

          <div className="flex items-center justify-end xl:justify-start">
            <AppButton size="sm" variant="ghost" type="button" onClick={onResetFilters}>
              Reset filter
            </AppButton>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Filter aktif
        </span>
        <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
          {formatAppDateFilterLabel(dateFilter)}
        </span>
        {unitFilter !== "all" ? (
          <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
            {unitOptions.find((option) => option.value === unitFilter)?.label || "Unit terpilih"}
          </span>
        ) : null}
        {serviceFilter !== "all" ? (
        <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
          {serviceOptions.find((option) => option.value === serviceFilter)?.label || "Layanan terpilih"}
        </span>
        ) : null}
        {statusFilter !== "all" ? (
          <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
            {statusOptions.find((option) => option.value === statusFilter)?.label || "Status terpilih"}
          </span>
        ) : null}
        {walkInFilter !== "all" ? (
          <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
            {walkInOptions.find((option) => option.value === walkInFilter)?.label || "Kunjungan terpilih"}
          </span>
        ) : null}
        {searchQuery.trim() ? (
          <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
            Cari: {searchQuery.trim()}
          </span>
        ) : null}
        {activeFilterCount ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold text-role-accent transition-colors hover:bg-role-accent-soft"
          >
            Bersihkan
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MonitoringPriorityList({
  rows,
  eyebrow = "Prioritas",
  title = "Antrean yang perlu perhatian",
  emptyCopy = "Belum ada antrean prioritas pada filter aktif.",
  ctaLabel = "Pantau",
}: {
  rows: MonitoringPriorityRow[];
  eyebrow?: string;
  title?: string;
  emptyCopy?: string;
  ctaLabel?: string;
}) {
  return (
    <AppCard padding="lg" className="space-y-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
          {eyebrow}
        </p>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      </div>
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-[24px] border border-border bg-surface-container-low px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {row.queueNumber}
                  </p>
                  <h3 className="text-base font-semibold tracking-tight">{row.serviceTitle}</h3>
                </div>
                <AppStatusBadge
                  status={resolveWorkspaceStatusTone(row.status)}
                  label={row.status}
                />
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{row.unitLabel}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{getCompactMonitoringNote(row.note)}</p>
              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>{row.waitLabel}</span>
                <span className="font-medium text-role-accent">{ctaLabel}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-border bg-surface-container-low px-5 py-10 text-center">
          <p className="text-sm font-semibold">{emptyCopy}</p>
        </div>
      )}
    </AppCard>
  );
}

function MonitoringSignalList({
  eyebrow,
  title,
  items,
  emptyCopy,
}: {
  eyebrow: string;
  title: string;
  items: MonitoringSignalCard[];
  emptyCopy: string;
}) {
  return (
    <AppCard padding="lg" className="space-y-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
          {eyebrow}
        </p>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      </div>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-[24px] border border-border bg-surface-container-low px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold tracking-tight">{item.title}</h3>
                  {item.meta ? (
                    <p className="text-sm text-muted-foreground">{item.meta}</p>
                  ) : null}
                </div>
                <AppStatusBadge
                  status={resolveWorkspaceStatusTone(item.status)}
                  label={item.status}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-border bg-surface-container-low px-5 py-10 text-center">
          <p className="text-sm font-semibold">{emptyCopy}</p>
        </div>
      )}
    </AppCard>
  );
}

function MonitoringQuickActionsPanel({
  eyebrow = "Ekspor",
  title = "Aksi data cepat",
  canExportData,
  onOpenExportCenter,
  onPreviewCsv,
  onPreviewJson,
}: {
  eyebrow?: string;
  title?: string;
  canExportData: boolean;
  onOpenExportCenter: () => void;
  onPreviewCsv: () => void;
  onPreviewJson: () => void;
}) {
  return (
    <AppCard padding="lg" className="space-y-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
          {eyebrow}
        </p>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      </div>
      <div className="grid gap-3">
        {monitoringQuickActions.map((action) => {
          const Icon = resolveMonitoringIcon(action.icon);
          const isOpenAction = action.icon === "eye";
          const isDisabled = !isOpenAction && !canExportData;
          const handleClick = () => {
            if (action.icon === "eye") {
              onOpenExportCenter();
              return;
            }

            if (action.icon === "download") {
              onPreviewCsv();
              return;
            }

            onPreviewJson();
          };

          return (
            <AppButton
              key={action.label}
              variant="outline"
              type="button"
              className="justify-between"
              disabled={isDisabled}
              onClick={handleClick}
            >
              <span className="inline-flex items-center gap-2">
                <Icon className="size-4" />
                {action.label}
              </span>
            </AppButton>
          );
        })}
      </div>
    </AppCard>
  );
}

function MonitoringExportPreviewDialog({
  open,
  onOpenChange,
  payload,
  onFormatChange,
  onExport,
  canExportData,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: MonitoringExportPreviewPayload | null;
  onFormatChange: (format: MonitoringExportFormat) => void;
  onExport: (format: MonitoringExportFormat) => void;
  canExportData: boolean;
  isLoading?: boolean;
}) {
  const availableFormats = payload
    ? EXPORT_FORMAT_OPTIONS_BY_SCOPE[payload.scope]
    : [];
  const hasPayload = Boolean(payload);
  const previewText = hasPayload
    ? buildMonitoringExportPreviewText(payload?.content ?? "")
    : "Pilih format yang sesuai untuk melihat preview.";

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pratinjau ekspor data"
      description={
        payload
          ? `${payload.scopeLabel} • ${payload.rowCount} baris • ${payload.format.toUpperCase()}`
          : "Konfigurasi set data yang akan diekspor."
      }
      className="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="grid gap-3 rounded-[22px] border border-border/80 bg-surface-container-low px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Format ekspor
            </span>
            <div className="flex flex-wrap gap-2">
              {payload ? (
                availableFormats.map((format) => (
                  <AppButton
                    key={format}
                    size="sm"
                    variant={payload.format === format ? "default" : "outline"}
                    type="button"
                    onClick={() => onFormatChange(format)}
                  >
                    {EXPORT_FORMAT_LABEL[format]}
                  </AppButton>
                ))
              ) : (
                <>
                  {(["csv", "json", "pdf", "sql"] as MonitoringExportFormat[]).map((format) => (
                    <AppButton
                      key={format}
                      size="sm"
                      variant="outline"
                      type="button"
                      disabled
                    >
                      {EXPORT_FORMAT_LABEL[format]}
                    </AppButton>
                  ))}
                </>
              )}
            </div>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {payload
              ? `Nama file: ${payload.filename}`
              : "Pilih sumber dan format ekspor dulu."}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Preview isi</p>
          <pre className="max-h-72 overflow-auto rounded-[16px] border border-border/70 bg-surface-container-lowest px-4 py-3 text-xs leading-6 text-muted-foreground">
            {previewText}
          </pre>
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <AppButton
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Batal
          </AppButton>
          <AppButton
            type="button"
            onClick={() => {
              if (!payload || !canExportData) return;
              onExport(payload.format);
            }}
            disabled={!hasPayload || !canExportData || isLoading}
          >
            Ambil Unduhan
          </AppButton>
        </div>
      </div>
    </AppDialog>
  );
}

function MonitoringExportPackageGrid({
  role,
  canExportData,
  summaryCount,
  followUpCount,
  rowCount,
  onPreviewSummaryCsv,
  onPreviewFollowUpCsv,
  onPreviewRawCsv,
  onPreviewRawJson,
  onPreviewRawPdf,
  onPreviewRawSql,
}: {
  role: MonitoringRole;
  canExportData: boolean;
  summaryCount: number;
  followUpCount: number;
  rowCount: number;
  onPreviewSummaryCsv: () => void;
  onPreviewFollowUpCsv: () => void;
  onPreviewRawCsv: () => void;
  onPreviewRawJson: () => void;
  onPreviewRawPdf: () => void;
  onPreviewRawSql: () => void;
}) {
  const isSupervisor = role === "supervisor-monitoring";
  const cards = [
    {
      id: "summary",
      eyebrow: isSupervisor ? "Rekap unit" : "Rekap layanan",
      title: isSupervisor ? "Ringkas per unit" : "Ringkas per layanan",
      description: isSupervisor
        ? "Ringkas distribusi antrean per unit."
        : "Ringkas distribusi antrean per layanan.",
      value: summaryCount,
      meta: isSupervisor ? "unit" : "layanan",
      actions: [{ label: "Preview CSV", onClick: onPreviewSummaryCsv, variant: "default" as const }],
    },
    {
      id: "follow-up",
      eyebrow: isSupervisor ? "Tindak lanjut" : "Follow-up",
      title: isSupervisor ? "Baris prioritas" : "Perlu klarifikasi",
      description: isSupervisor
        ? "Baris yang perlu keputusan operasional."
        : "Baris yang perlu ditindaklanjuti.",
      value: followUpCount,
      meta: "baris",
      actions: [{ label: "Preview CSV", onClick: onPreviewFollowUpCsv, variant: "default" as const }],
    },
    {
      id: "raw",
      eyebrow: "Dataset terfilter",
      title: "Semua baris aktif",
      description: "Pratinjau cepat sebelum unduh final.",
      value: rowCount,
      meta: "baris",
      actions: [
        { label: "Preview PDF", onClick: onPreviewRawPdf, variant: "outline" as const },
        { label: "Preview CSV", onClick: onPreviewRawCsv, variant: "default" as const },
        { label: "Preview JSON", onClick: onPreviewRawJson, variant: "outline" as const },
        { label: "Preview SQL", onClick: onPreviewRawSql, variant: "outline" as const },
      ],
    },
  ] as const;

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {cards.map((card) => (
        <AppCard key={card.id} padding="lg" className="space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              {card.eyebrow}
            </p>
            <h2 className="text-lg font-bold tracking-tight">{card.title}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{card.description}</p>
          </div>
          <div className="rounded-[22px] bg-surface-container-low px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {card.meta}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{card.value}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {card.actions.map((action) => (
              <AppButton
                key={`${card.id}-${action.label}`}
                size="sm"
                variant={action.variant}
                type="button"
                disabled={!canExportData || card.value === 0}
                onClick={action.onClick}
              >
                {action.label}
              </AppButton>
            ))}
          </div>
        </AppCard>
      ))}
    </div>
  );
}

function MonitoringExportWorkspace({
  role,
  rows,
  unitSummaryItems,
  serviceSummaryItems,
  statusItems,
  compactDensity,
  canExportData,
  onPreviewSummaryCsv,
  onPreviewFollowUpCsv,
  onPreviewRawPdf,
  onPreviewRawCsv,
  onPreviewRawJson,
  onPreviewRawSql,
}: {
  role: MonitoringRole;
  rows: MonitoringExportRow[];
  unitSummaryItems: MonitoringChartItem[];
  serviceSummaryItems: MonitoringChartItem[];
  statusItems: MonitoringChartItem[];
  compactDensity: boolean;
  canExportData: boolean;
  onPreviewSummaryCsv: () => void;
  onPreviewFollowUpCsv: () => void;
  onPreviewRawPdf: () => void;
  onPreviewRawCsv: () => void;
  onPreviewRawJson: () => void;
  onPreviewRawSql: () => void;
}) {
  const followUpRows = React.useMemo(
    () => buildMonitoringFollowUpRows(rows, role),
    [role, rows],
  );
  const isSupervisor = role === "supervisor-monitoring";

  return (
    <div className="space-y-6">
      <MonitoringExportPackageGrid
        role={role}
        canExportData={canExportData}
        summaryCount={(isSupervisor ? unitSummaryItems : serviceSummaryItems).length}
        followUpCount={followUpRows.length}
        rowCount={rows.length}
        onPreviewSummaryCsv={onPreviewSummaryCsv}
        onPreviewFollowUpCsv={onPreviewFollowUpCsv}
        onPreviewRawPdf={onPreviewRawPdf}
        onPreviewRawCsv={onPreviewRawCsv}
        onPreviewRawJson={onPreviewRawJson}
        onPreviewRawSql={onPreviewRawSql}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
        <AppAnalyticsPanel
          eyebrow={isSupervisor ? "Unit" : "Layanan"}
          title={isSupervisor ? "Ringkasan per unit" : "Ringkasan per layanan"}
          description={isSupervisor ? "Jumlah data per unit." : "Jumlah data per layanan."}
        >
          <AppAnalyticsBarList
            items={isSupervisor ? unitSummaryItems : serviceSummaryItems}
            variant="highlight"
          />
        </AppAnalyticsPanel>

        <AppAnalyticsPanel
          eyebrow="Status"
          title="Komposisi status"
          description="Status pada data aktif."
        >
          <AppAnalyticsSegmentBar items={statusItems} />
        </AppAnalyticsPanel>
      </div>

      <MonitoringExportList
        role={role}
        rows={rows}
        compactDensity={compactDensity}
      />
    </div>
  );
}

function SupervisorMonitoringDashboard({
  primaryItems,
  primaryTrendLabels,
  primaryTrendSeries,
  weeklyBreakdown,
  qualityItems,
  controlItems,
  priorityRows,
  showTrendPanels,
}: {
  primaryItems: MonitoringChartItem[];
  primaryTrendLabels: string[];
  primaryTrendSeries: Array<{
    label: string;
    values: number[];
    tone?: "role" | "info" | "warning" | "success" | "danger" | "neutral";
  }>;
  weeklyBreakdown: MonitoringChartItem[];
  qualityItems: MonitoringChartItem[];
  controlItems: MonitoringChartItem[];
  priorityRows: MonitoringPriorityRow[];
  showTrendPanels: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
        <AppAnalyticsPanel
          eyebrow="Control Room"
          title="Tekanan antrean lintas unit"
          description="Unit dengan antrean paling padat."
        >
          {primaryTrendSeries.length ? (
            <AppAnalyticsStackedAreaChart
              labels={primaryTrendLabels}
              series={primaryTrendSeries}
            />
          ) : (
            <div className="rounded-[24px] border border-dashed border-border bg-surface-container-low px-5 py-10 text-center">
              <p className="text-sm font-semibold">Belum ada tren unit pada filter aktif</p>
            </div>
          )}
        </AppAnalyticsPanel>

        <AppAnalyticsPanel
          eyebrow="Beban Keputusan"
          title="Radar operasional supervisor"
          description="Area yang perlu keputusan cepat."
        >
          <AppAnalyticsConcentricChart items={controlItems} summaryLabel="Radar" />
        </AppAnalyticsPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <MonitoringPriorityList
          rows={priorityRows}
          eyebrow="Prioritas Intervensi"
          title="Antrean yang perlu keputusan cepat"
          emptyCopy="Belum ada antrean yang meminta intervensi cepat pada filter aktif."
          ctaLabel="Intervensi"
        />

        <div className="space-y-6">
          <AppAnalyticsPanel
            eyebrow="Tekanan Unit"
            title="Unit paling menyerap antrean"
            description="Unit yang perlu dibaca lebih dulu."
          >
            <AppAnalyticsBarList
              items={primaryItems}
              variant="highlight"
            />
          </AppAnalyticsPanel>

          {showTrendPanels ? (
            <AppAnalyticsPanel
              eyebrow="Ritme Harian"
              title="Volume layanan 7 hari"
              description="Pola beban 7 hari terakhir."
            >
              <AppAnalyticsWeekStrip items={weeklyBreakdown} />
            </AppAnalyticsPanel>
          ) : null}
        </div>
      </div>

      {showTrendPanels ? (
        <AppAnalyticsPanel
          eyebrow="Kualitas Layanan"
          title="Rasio yang wajib dijaga"
          description="Rasio inti layanan."
        >
          <AppAnalyticsMetricTiles items={qualityItems} valueSuffix="%" />
        </AppAnalyticsPanel>
      ) : null}
    </div>
  );
}

function SupervisorMonitoringDetail({
  primaryItems,
  statusBreakdown,
  weeklyBreakdown,
  unitSignals,
  serviceRanks,
  priorityRows,
  canExportData,
  onOpenExportCenter,
  onPreviewCsv,
  onPreviewJson,
  showTrendPanels,
}: {
  primaryItems: MonitoringChartItem[];
  statusBreakdown: MonitoringChartItem[];
  weeklyBreakdown: MonitoringChartItem[];
  unitSignals: MonitoringUnitSignal[];
  serviceRanks: MonitoringServiceRank[];
  priorityRows: MonitoringPriorityRow[];
  canExportData: boolean;
  onOpenExportCenter: () => void;
  onPreviewCsv: () => void;
  onPreviewJson: () => void;
  showTrendPanels: boolean;
}) {
  const serviceItems = serviceRanks.slice(0, 6).map((item, index) => ({
    label: item.label,
    value: item.volume,
    meta: item.trend,
    tone:
      index === 0
        ? "warning"
        : index === 1
          ? "role"
          : index % 2 === 0
            ? "info"
            : "neutral",
  })) satisfies MonitoringChartItem[];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
        <AppAnalyticsPanel
          eyebrow="Tekanan Unit"
          title="Unit yang paling menekan SLA"
          description="Urutan unit yang perlu dibuka lebih dulu."
        >
          <AppAnalyticsBarList
            items={primaryItems}
            variant="highlight"
          />
        </AppAnalyticsPanel>

        <AppAnalyticsPanel
          eyebrow="Komposisi Operasional"
          title="Status antrean pada scope aktif"
          description="Status utama pada scope aktif."
        >
          <div className="space-y-5">
            <AppAnalyticsSegmentBar items={statusBreakdown} />
            {showTrendPanels ? (
              <div className="border-t border-border/80 pt-5">
                <AppAnalyticsWeekStrip items={weeklyBreakdown} />
              </div>
            ) : null}
          </div>
        </AppAnalyticsPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
        <AppCard padding="lg" className="space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              Unit Kritis
            </p>
            <h2 className="text-xl font-bold tracking-tight">Unit yang perlu dibaca dulu</h2>
          </div>
          <div className="space-y-3">
            {unitSignals.length ? unitSignals.map((item) => (
              <div
                key={item.label}
                className="rounded-[24px] border border-border bg-surface-container-low px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">{item.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.queueCount} antrean • rata-rata {item.avgWait}
                    </p>
                  </div>
                  <AppStatusBadge
                    status={resolveWorkspaceStatusTone(item.status)}
                    label={item.status}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{getCompactMonitoringNote(item.note)}</p>
              </div>
            )) : (
              <div className="rounded-[24px] border border-dashed border-border bg-surface-container-low px-5 py-10 text-center">
                <p className="text-sm font-semibold">Belum ada sinyal unit pada filter aktif</p>
              </div>
            )}
          </div>
        </AppCard>

        <div className="space-y-6">
          <AppAnalyticsPanel
            eyebrow="Sorotan Layanan"
            title="Layanan yang paling membebani unit"
            description="Layanan yang paling sering muncul."
          >
            <AppAnalyticsBarList
              items={serviceItems}
              variant="highlight"
            />
          </AppAnalyticsPanel>

          <MonitoringQuickActionsPanel
            eyebrow="Tindak Lanjut"
            title="Ekspor dan rekap cepat"
            canExportData={canExportData}
            onOpenExportCenter={onOpenExportCenter}
            onPreviewCsv={onPreviewCsv}
            onPreviewJson={onPreviewJson}
          />
        </div>
      </div>

      <MonitoringPriorityList
        rows={priorityRows}
        eyebrow="Daftar Prioritas"
        title="Antrean yang sedang meminta keputusan"
        emptyCopy="Belum ada antrean yang naik ke daftar keputusan pada filter aktif."
        ctaLabel="Keputusan"
      />
    </div>
  );
}

function HumasMonitoringDashboard({
  primaryItems,
  weeklyBreakdown,
  publicSignalItems,
  communicationSignals,
  showTrendPanels,
}: {
  primaryItems: MonitoringChartItem[];
  weeklyBreakdown: MonitoringChartItem[];
  publicSignalItems: MonitoringChartItem[];
  communicationSignals: MonitoringSignalCard[];
  showTrendPanels: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
        <AppAnalyticsPanel
          eyebrow="Layanan Ramai"
          title="Layanan yang paling sering butuh penjelasan"
          description="Layanan paling ramai pada periode aktif."
        >
          {primaryItems.length ? (
            <AppAnalyticsColumnChart items={primaryItems} maxHeightClassName="h-56" />
          ) : (
            <div className="rounded-[24px] border border-dashed border-border bg-surface-container-low px-5 py-10 text-center">
              <p className="text-sm font-semibold">Belum ada layanan menonjol pada filter aktif</p>
            </div>
          )}
        </AppAnalyticsPanel>

        <AppAnalyticsPanel
          eyebrow="Status Antrean"
          title="Yang perlu dijelaskan ke warga"
          description="Status yang paling terasa ke warga."
        >
          <AppAnalyticsSegmentBar items={publicSignalItems} />
        </AppAnalyticsPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <MonitoringSignalList
          eyebrow="Prioritas Humas"
          title="Yang perlu dicek lebih dulu"
          items={communicationSignals}
          emptyCopy="Belum ada item yang perlu ditindaklanjuti pada filter aktif."
        />

        <div className="space-y-6">
          <AppAnalyticsPanel
            eyebrow="Layanan Teratas"
            title="Layanan yang paling ramai"
            description="Urutan layanan yang perlu dibaca lebih dulu."
          >
            <AppAnalyticsBarList
              items={primaryItems}
              variant="highlight"
            />
          </AppAnalyticsPanel>

          {showTrendPanels ? (
            <AppAnalyticsPanel
              eyebrow="Ritme 7 Hari"
              title="Permintaan layanan per hari"
              description="Hari dengan permintaan paling ramai."
            >
              <AppAnalyticsWeekStrip items={weeklyBreakdown} />
            </AppAnalyticsPanel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function HumasMonitoringDetail({
  primaryItems,
  publicSignalItems,
  weeklyBreakdown,
  communicationSignals,
  unitSignals,
  canExportData,
  onOpenExportCenter,
  onPreviewCsv,
  onPreviewJson,
  showTrendPanels,
}: {
  primaryItems: MonitoringChartItem[];
  publicSignalItems: MonitoringChartItem[];
  weeklyBreakdown: MonitoringChartItem[];
  communicationSignals: MonitoringSignalCard[];
  unitSignals: MonitoringUnitSignal[];
  canExportData: boolean;
  onOpenExportCenter: () => void;
  onPreviewCsv: () => void;
  onPreviewJson: () => void;
  showTrendPanels: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
        <AppAnalyticsPanel
          eyebrow="Layanan Ramai"
          title="Layanan yang paling sering perlu dipantau"
          description="Layanan yang paling ramai."
        >
          <AppAnalyticsBarList
            items={primaryItems}
            variant="highlight"
          />
        </AppAnalyticsPanel>

        <AppAnalyticsPanel
          eyebrow="Status Antrean"
          title="Status yang perlu dijaga"
          description="Status yang perlu dijaga."
        >
          <div className="space-y-5">
            <AppAnalyticsSegmentBar items={publicSignalItems} />
            {showTrendPanels ? (
              <div className="border-t border-border/80 pt-5">
                <AppAnalyticsWeekStrip items={weeklyBreakdown} />
              </div>
            ) : null}
          </div>
        </AppAnalyticsPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
        <MonitoringSignalList
          eyebrow="Watchlist"
          title="Yang perlu ditindaklanjuti"
          items={communicationSignals}
          emptyCopy="Belum ada watchlist pada filter aktif."
        />

        <div className="space-y-6">
          <AppCard padding="lg" className="space-y-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                Sinkronisasi
              </p>
              <h2 className="text-xl font-bold tracking-tight">Unit yang perlu dicek</h2>
            </div>
            <div className="space-y-3">
              {unitSignals.length ? unitSignals.slice(0, 4).map((item) => (
                <div key={item.label} className="rounded-[22px] bg-surface-container-low px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.queueCount} antrean pada periode ini
                      </p>
                    </div>
                    <AppStatusBadge
                      status={resolveWorkspaceStatusTone(item.status)}
                      label={item.status}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {getCompactMonitoringNote(item.note)}
                  </p>
                </div>
              )) : (
                <div className="rounded-[24px] border border-dashed border-border bg-surface-container-low px-5 py-10 text-center">
                  <p className="text-sm font-semibold">Belum ada unit yang perlu ditinjau</p>
                </div>
              )}
            </div>
          </AppCard>

          <MonitoringQuickActionsPanel
            eyebrow="Paket Data"
            title="Unduh rekap humas"
            canExportData={canExportData}
            onOpenExportCenter={onOpenExportCenter}
            onPreviewCsv={onPreviewCsv}
            onPreviewJson={onPreviewJson}
          />
        </div>
      </div>
    </div>
  );
}

function MonitoringExportList({
  role,
  rows,
  compactDensity,
}: {
  role: MonitoringRole;
  rows: MonitoringExportRow[];
  compactDensity: boolean;
}) {
  const [page, setPage] = React.useState(1);
  const pageSize = compactDensity ? 8 : 6;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentRows = rows.slice((page - 1) * pageSize, page * pageSize);

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const copy =
    role === "supervisor-monitoring"
      ? {
          eyebrow: "Paket laporan",
          title: "Tabel data terfilter",
          emptyTitle: "Belum ada data ekspor supervisor",
          emptyDescription: "Ubah filter atau tunggu data supervisor masuk.",
        }
      : {
          eyebrow: "Rekap komunikasi",
          title: "Tabel data terfilter",
          emptyTitle: "Belum ada rekap humas pada filter aktif",
          emptyDescription: "Ubah filter atau tunggu data humas masuk.",
        };

  return (
    <AppCard padding="lg" className="space-y-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
          {copy.eyebrow}
        </p>
        <h2 className="text-xl font-bold tracking-tight">{copy.title}</h2>
      </div>
      <AppTable className="table-fixed">
        <AppTableHead>
          <tr>
            <AppTableHeaderCell className="w-[13%]">No. Antrean</AppTableHeaderCell>
            <AppTableHeaderCell className="w-[16%]">Pengunjung</AppTableHeaderCell>
            <AppTableHeaderCell className="w-[18%]">Jadwal</AppTableHeaderCell>
            <AppTableHeaderCell className="w-[18%]">Layanan</AppTableHeaderCell>
            <AppTableHeaderCell className="w-[17%]">Unit</AppTableHeaderCell>
            <AppTableHeaderCell className="w-[10%]">Status</AppTableHeaderCell>
            <AppTableHeaderCell className="w-[18%]">Catatan</AppTableHeaderCell>
          </tr>
        </AppTableHead>
        <tbody>
          {currentRows.length ? currentRows.map((row) => (
            <AppTableRow key={row.id}>
              <AppTableCell className={compactDensity ? "space-y-1 py-3" : "space-y-1"}>
                <p className="font-mono text-xs font-semibold text-foreground">{row.queueNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {row.isWalkIn ? "Datang langsung" : "Terjadwal"}
                </p>
              </AppTableCell>
              <AppTableCell className={compactDensity ? "space-y-1 py-3" : "space-y-1"}>
                <p className="font-semibold text-foreground">{row.visitorName}</p>
              </AppTableCell>
              <AppTableCell className={compactDensity ? "space-y-1 py-3" : "space-y-1"}>
                <p className="text-sm font-medium text-foreground">{row.dateLabel}</p>
                <p className="text-xs text-muted-foreground">{row.timeLabel}</p>
              </AppTableCell>
              <AppTableCell className={compactDensity ? "space-y-1 py-3" : "space-y-1"}>
                <p className="text-sm font-semibold text-foreground">{row.serviceTitle}</p>
                <p className="text-xs text-muted-foreground">{row.serviceCode}</p>
              </AppTableCell>
              <AppTableCell className={compactDensity ? "space-y-1 py-3" : "space-y-1"}>
                <p className="text-sm text-foreground">{row.unitLabel}</p>
              </AppTableCell>
              <AppTableCell className={compactDensity ? "space-y-2 py-3" : "space-y-2"}>
                <AppStatusBadge
                  status={resolveWorkspaceStatusTone(row.status)}
                  label={row.status}
                />
              </AppTableCell>
              <AppTableCell className={compactDensity ? "space-y-1 py-3" : "space-y-1"}>
                <p className="text-sm text-muted-foreground">
                  {getCompactMonitoringNote(row.note || row.complaint || "-")}
                </p>
              </AppTableCell>
            </AppTableRow>
          )) : (
            <AppTableRow>
              <AppTableCell colSpan={7} className="py-10 text-center">
                <p className="text-sm font-semibold">{copy.emptyTitle}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {copy.emptyDescription}
                </p>
              </AppTableCell>
            </AppTableRow>
          )}
        </tbody>
      </AppTable>
      <AppPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </AppCard>
  );
}

function MonitoringProfilePanel({ role }: { role: MonitoringRole }) {
  const persona = getMonitoringPersonaConfig(role);
  const isSupervisor = role === "supervisor-monitoring";
  const cards = isSupervisor
    ? [
        { label: "Peran", value: persona.label, icon: ShieldCheck },
        { label: "Cakupan", value: "Lintas unit", icon: Users },
        { label: "Distribusi", value: "Ringkasan unit", icon: FileSpreadsheet },
      ]
    : [
        { label: "Peran", value: persona.label, icon: ShieldCheck },
        { label: "Kanal", value: "Lintas layanan", icon: Users },
        { label: "Distribusi", value: "Rekap komunikasi", icon: FileSpreadsheet },
      ];
  const title = isSupervisor ? "Profil Supervisor" : "Profil Humas Monitoring";
  const focusTitle = isSupervisor ? "Yang dijaga" : "Yang dipantau";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <AppCard padding="lg" className="space-y-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              Profil
            </p>
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            <p className="text-sm font-semibold text-foreground">{persona.profileName}</p>
            <p className="text-sm leading-6 text-muted-foreground">{persona.profileEmail}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {cards.map((item) => (
              <div key={item.label} className="rounded-[22px] bg-surface-container-low px-4 py-4">
                <item.icon className="size-4 text-role-accent" />
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </AppCard>

        <AppCard padding="lg" className="space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              Fokus
            </p>
            <h2 className="text-xl font-bold tracking-tight">{focusTitle}</h2>
          </div>
          <div className="space-y-3">
            {persona.profileHighlights.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-[22px] bg-surface-container-low px-4 py-4"
              >
                <Activity className="mt-0.5 size-4 shrink-0 text-role-accent" />
                <p className="text-sm leading-6 text-muted-foreground">{getCompactMonitoringNote(item)}</p>
              </div>
            ))}
          </div>
        </AppCard>
      </div>

      <MobileProfileLogoutSection description="Keluar dari sesi monitoring pada perangkat ini tanpa menambah tombol ganda di desktop." />
    </div>
  );
}

export function MonitoringWorkspacePage({
  role,
  page,
}: {
  role: MonitoringRole;
  page: MonitoringPage;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pageConfig = getInternalPageConfig(role, page);
  const persona = getMonitoringPersonaConfig(role);
  const hydrated = useHydrated();
  const live = useLiveStaffAppointments();
  const permissionQuery = useStaffRolePermissions(role);
  const currentPath = getInternalPagePath(role, page);
  const { settings: monitoringSettings } = useMonitoringSettings(role);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<AppDateFilterValue>(() =>
    createAppDateFilterValue("last30Days"),
  );
  const [unitFilter, setUnitFilter] = React.useState("all");
  const [serviceFilter, setServiceFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [walkInFilter, setWalkInFilter] = React.useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const alertCountRef = React.useRef<number | null>(null);
  const permissions = permissionQuery.permissions;
  const isPermissionLoading =
    permissionQuery.isRuntimeSyncing && !permissionQuery.data;
  const canViewStatistics = permissions?.canViewStatistics ?? false;
  const canExportData = permissions?.canExportData ?? false;
  const routeRequirement = getStaffRoutePermissionRequirement(role, currentPath);
  const missingRoutePermissions = getMissingStaffPermissions(
    routeRequirement,
    permissions,
  );
  const fallbackPath = getFirstAccessibleStaffPath(role, permissions, currentPath);
  const needsStatisticsAccess = page === "dashboard" || page === "monitoring";
  const isExportPage = isMonitoringExportPage(page);
  const needsExportAccess = isExportPage;
  const exportPage = getMonitoringExportPage(role);
  const usesLiveMonitoringData = live.isLiveSession;
  const hasLiveMonitoringData =
    usesLiveMonitoringData &&
    Array.isArray(live.appointments) &&
    !live.isError;
  const isLiveMonitoringPending =
    usesLiveMonitoringData &&
    live.appointments === null &&
    !live.isError;
  const liveAppointments = React.useMemo<LiveStaffAppointment[]>(
    () =>
      hasLiveMonitoringData
        ? live.appointments ?? []
        : [],
    [hasLiveMonitoringData, live.appointments],
  );

  React.useEffect(() => {
    if (!monitoringSettings.autoRefresh || !live.isLiveSession || !live.staffId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void queryClient.invalidateQueries({
        queryKey: ["staff-live-appointments", live.staffId],
      });
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [live.isLiveSession, live.staffId, monitoringSettings.autoRefresh, queryClient]);

  const priorityRows = React.useMemo(
    () =>
      usesLiveMonitoringData
        ? buildLiveMonitoringPriorityRows(liveAppointments)
        : getMonitoringPriorityRows(role),
    [liveAppointments, role, usesLiveMonitoringData],
  );
  const unitSignals = React.useMemo(
    () =>
      usesLiveMonitoringData
        ? buildLiveMonitoringUnitSignals(liveAppointments)
        : getMonitoringUnitSignals(role),
    [liveAppointments, role, usesLiveMonitoringData],
  );
  const serviceRanks = React.useMemo(
    () =>
      usesLiveMonitoringData
        ? buildLiveMonitoringServiceRanks(liveAppointments)
        : getMonitoringServiceRanks(role),
    [liveAppointments, role, usesLiveMonitoringData],
  );
  const exportRows = React.useMemo(
    () =>
      usesLiveMonitoringData
        ? buildLiveMonitoringExportRows(liveAppointments)
        : getMonitoringExportRows(role),
    [liveAppointments, role, usesLiveMonitoringData],
  );
  const filterValues = React.useMemo(
    () => buildMonitoringFilterValuesFromExportRows(exportRows),
    [exportRows],
  );
  const availableUnitOptions = React.useMemo(() => {
    if (usesLiveMonitoringData) {
      return ["Semua unit", ...filterValues.unitOptions];
    }

    if (role === "supervisor-monitoring") {
      return persona.unitOptions;
    }

    return [
      "Semua unit",
      ...(filterValues.unitOptions.length
        ? filterValues.unitOptions
        : persona.unitOptions.slice(1)),
    ];
  }, [filterValues.unitOptions, persona.unitOptions, role, usesLiveMonitoringData]);
  const availableServiceOptions = React.useMemo(
    () =>
      usesLiveMonitoringData
        ? ["Semua layanan", ...filterValues.serviceOptions]
        : [
            "Semua layanan",
            ...(filterValues.serviceOptions.length
              ? filterValues.serviceOptions
              : monitoringServiceOptions.slice(1)),
          ],
    [filterValues.serviceOptions, usesLiveMonitoringData],
  );
  const availableStatusOptions = React.useMemo(
    () =>
      usesLiveMonitoringData
        ? ["Semua status", ...filterValues.statusOptions]
        : [
            "Semua status",
            ...(filterValues.statusOptions.length
              ? filterValues.statusOptions
              : ["Menunggu", "Dipanggil", "Sedang Dilayani", "Selesai"]),
          ],
    [filterValues.statusOptions, usesLiveMonitoringData],
  );
  const availableWalkInOptions = React.useMemo(
    () =>
      usesLiveMonitoringData
        ? ["Semua jenis", ...filterValues.walkInOptions]
        : [
            "Semua jenis",
            ...(filterValues.walkInOptions.length
              ? filterValues.walkInOptions
              : ["Datang Langsung", "Terjadwal"]),
          ],
    [filterValues.walkInOptions, usesLiveMonitoringData],
  );

  React.useEffect(() => {
    if (
      unitFilter !== "all" &&
      !availableUnitOptions.includes(unitFilter)
    ) {
      setUnitFilter("all");
    }

    if (
      serviceFilter !== "all" &&
      !availableServiceOptions.includes(serviceFilter)
    ) {
      setServiceFilter("all");
    }
    if (statusFilter !== "all" && !availableStatusOptions.includes(statusFilter)) {
      setStatusFilter("all");
    }

    if (walkInFilter !== "all" && !availableWalkInOptions.includes(walkInFilter)) {
      setWalkInFilter("all");
    }
  }, [
    availableServiceOptions,
    availableStatusOptions,
    availableUnitOptions,
    availableWalkInOptions,
    serviceFilter,
    statusFilter,
    unitFilter,
    walkInFilter,
  ]);
  const filteredLiveAppointments = React.useMemo(
    () =>
      usesLiveMonitoringData
        ? filterLiveMonitoringAppointments(liveAppointments, {
            searchQuery,
            unitFilter,
            serviceFilter,
            statusFilter,
            walkInFilter,
            datePredicate: (value) => isDateWithinAppDateFilter(value, dateFilter),
          })
        : [],
    [
      dateFilter,
      liveAppointments,
      searchQuery,
      serviceFilter,
      statusFilter,
      unitFilter,
      usesLiveMonitoringData,
      walkInFilter,
    ],
  );
  const filteredPriorityRows = React.useMemo(() => {
    if (usesLiveMonitoringData) {
      return buildLiveMonitoringPriorityRows(filteredLiveAppointments);
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    return priorityRows.filter((row) => {
      if (unitFilter !== "all" && row.unitLabel !== unitFilter) {
        return false;
      }

      if (serviceFilter !== "all" && row.serviceTitle !== serviceFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [row.queueNumber, row.serviceTitle, row.unitLabel, row.note]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [
    filteredLiveAppointments,
    priorityRows,
    searchQuery,
    serviceFilter,
    unitFilter,
    usesLiveMonitoringData,
  ]);

  const filteredUnitSignals = React.useMemo(() => {
    if (usesLiveMonitoringData) {
      return buildLiveMonitoringUnitSignals(filteredLiveAppointments);
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    return unitSignals.filter((row) => {
      if (unitFilter !== "all" && row.label !== unitFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [row.label, row.note, row.status]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [filteredLiveAppointments, searchQuery, unitFilter, unitSignals, usesLiveMonitoringData]);

  const filteredServiceRanks = React.useMemo(() => {
    if (usesLiveMonitoringData) {
      return buildLiveMonitoringServiceRanks(filteredLiveAppointments);
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    return serviceRanks.filter((row) => {
      if (serviceFilter !== "all" && row.label !== serviceFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [row.label, row.trend]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [
    filteredLiveAppointments,
    searchQuery,
    serviceFilter,
    serviceRanks,
    usesLiveMonitoringData,
  ]);

  const filteredExportRows = React.useMemo(() => {
    if (usesLiveMonitoringData) {
      return buildLiveMonitoringExportRows(filteredLiveAppointments);
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    return exportRows.filter((row) => {
      const dateKey = toDateKeyFromLabel(row.dateLabel);
      if (dateKey && !isDateWithinAppDateFilter(dateKey, dateFilter)) {
        return false;
      }

      if (unitFilter !== "all" && row.unitLabel !== unitFilter) {
        return false;
      }

      if (serviceFilter !== "all" && row.serviceTitle !== serviceFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        row.queueNumber,
        row.visitorName,
        row.serviceTitle,
        row.unitLabel,
        row.complaint,
        row.note,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [
    dateFilter,
    exportRows,
    filteredLiveAppointments,
    searchQuery,
    serviceFilter,
    unitFilter,
    usesLiveMonitoringData,
  ]);
  const displayPriorityRows = React.useMemo(
    () =>
      monitoringSettings.prioritizeAttention
        ? sortPriorityRowsByAttention(filteredPriorityRows)
        : filteredPriorityRows,
    [filteredPriorityRows, monitoringSettings.prioritizeAttention],
  );
  const displayUnitSignals = React.useMemo(
    () =>
      monitoringSettings.prioritizeAttention
        ? sortUnitSignalsByAttention(filteredUnitSignals)
        : filteredUnitSignals,
    [filteredUnitSignals, monitoringSettings.prioritizeAttention],
  );
  const exportWorkspaceRows = React.useMemo(() => {
    const scopedRows = monitoringSettings.includeCompletedRows
      ? filteredExportRows
      : filteredExportRows.filter((row) => normalizeMonitoringStatus(row) !== "completed");

    return monitoringSettings.prioritizeAttention
      ? sortExportRowsByAttention(scopedRows, role)
      : scopedRows;
  }, [
    filteredExportRows,
    monitoringSettings.includeCompletedRows,
    monitoringSettings.prioritizeAttention,
    role,
  ]);
  const derivedStats = React.useMemo(
    () => {
      if (page !== "dashboard" && page !== "monitoring" && !isExportPage) {
        return pageConfig?.stats ?? [];
      }

      return buildDerivedMonitoringStats({
        role,
        page: isExportPage ? exportPage : page,
        priorityRows: displayPriorityRows,
        unitSignals: displayUnitSignals,
        exportRows: isExportPage ? exportWorkspaceRows : filteredExportRows,
      });
    },
    [
      displayPriorityRows,
      displayUnitSignals,
      exportWorkspaceRows,
      filteredExportRows,
      isExportPage,
      exportPage,
      page,
      pageConfig?.stats,
      role,
    ],
  );
  const qualityMetrics = React.useMemo(
    () =>
      usesLiveMonitoringData
        ? buildDerivedMonitoringQualityMetrics(filteredExportRows)
        : monitoringQualityMetrics,
    [filteredExportRows, usesLiveMonitoringData],
  );
  const primaryChartItems = React.useMemo<MonitoringChartItem[]>(
    () =>
      role === "supervisor-monitoring"
        ? displayUnitSignals.slice(0, 6).map((item, index) => ({
            label: item.label,
            value: item.queueCount,
            meta: item.avgWait,
            tone:
              item.status === "Perlu Tinjau"
                ? "warning"
                : index === 0
                  ? "role"
                  : index === 1
                    ? "info"
                    : "neutral",
          }))
        : filteredServiceRanks.slice(0, 6).map((item, index) => ({
            label: item.label,
            value: item.volume,
            tone:
              index === 0
                ? "warning"
                : index === 1
                  ? "role"
                  : index % 2 === 0
                    ? "info"
                    : "neutral",
          })),
    [displayUnitSignals, filteredServiceRanks, role],
  );
  const statusBreakdown = React.useMemo(
    () =>
      buildMonitoringStatusBreakdown(
        isExportPage ? exportWorkspaceRows : filteredExportRows,
      ),
    [exportWorkspaceRows, filteredExportRows, isExportPage],
  );
  const publicSignalItems = React.useMemo(
    () =>
      buildHumasPublicSignalBreakdown(
        isExportPage ? exportWorkspaceRows : filteredExportRows,
      ),
    [exportWorkspaceRows, filteredExportRows, isExportPage],
  );
  const weeklyBreakdown = React.useMemo(
    () => buildMonitoringWeekBreakdown(filteredExportRows),
    [filteredExportRows],
  );
  const primaryTrend = React.useMemo(
    () =>
      buildMonitoringPrimaryTrendSeries(
        filteredExportRows,
        primaryChartItems,
        role === "supervisor-monitoring" ? "unitLabel" : "serviceTitle",
      ),
    [filteredExportRows, primaryChartItems, role],
  );
  const qualityChartItems = React.useMemo(
    () => buildMonitoringQualityChartItems(qualityMetrics),
    [qualityMetrics],
  );
  const unitExportSummary = React.useMemo(
    () => buildMonitoringAggregates(exportWorkspaceRows, "unitLabel"),
    [exportWorkspaceRows],
  );
  const serviceExportSummary = React.useMemo(
    () => buildMonitoringAggregates(exportWorkspaceRows, "serviceTitle"),
    [exportWorkspaceRows],
  );
  const unitExportSummaryItems = React.useMemo<MonitoringChartItem[]>(
    () =>
      unitExportSummary.slice(0, 6).map((item, index) => ({
        label: item.label,
        value: item.total,
        meta: `${item.active} aktif • ${item.waiting} menunggu`,
        tone:
          item.noShow > 0
            ? "warning"
            : index === 0
              ? "role"
              : index === 1
                ? "info"
                : "neutral",
      })),
    [unitExportSummary],
  );
  const serviceExportSummaryItems = React.useMemo<MonitoringChartItem[]>(
    () =>
      serviceExportSummary.slice(0, 6).map((item, index) => ({
        label: item.label,
        value: item.total,
        meta: `${item.total} antrean • ${item.completed} selesai`,
        tone:
          item.waiting + item.noShow > 0
            ? "warning"
            : index === 0
              ? "role"
              : index === 1
                ? "info"
                : "neutral",
      })),
    [serviceExportSummary],
  );
  const followUpExportRows = React.useMemo(
    () => buildMonitoringFollowUpRows(exportWorkspaceRows, role),
    [exportWorkspaceRows, role],
  );
  const dashboardControlItems = React.useMemo(
    () =>
      buildSupervisorControlItems(
        displayPriorityRows,
        displayUnitSignals,
        filteredExportRows,
      ),
    [displayPriorityRows, displayUnitSignals, filteredExportRows],
  );
  const communicationSignals = React.useMemo(
    () =>
      role === "humas-monitoring"
        ? buildHumasCommunicationSignals(
            filteredServiceRanks,
            displayUnitSignals,
            filteredExportRows,
          )
        : [],
    [displayUnitSignals, filteredExportRows, filteredServiceRanks, role],
  );
  const displayCommunicationSignals = React.useMemo(
    () =>
      monitoringSettings.prioritizeAttention
        ? sortCommunicationSignalsByAttention(communicationSignals)
        : communicationSignals,
    [communicationSignals, monitoringSettings.prioritizeAttention],
  );

  React.useEffect(() => {
    if (!monitoringSettings.playAlerts || !live.isLiveSession) {
      alertCountRef.current = null;
      return;
    }

    const nextCount =
      role === "supervisor-monitoring"
        ? priorityRows.filter((row) => row.status === "Perlu Tinjau").length +
          unitSignals.filter((row) => row.status === "Perlu Tinjau").length
        : buildMonitoringFollowUpRows(exportRows, role).length;

    if (alertCountRef.current !== null && nextCount > alertCountRef.current) {
      toast.message(
        role === "supervisor-monitoring"
          ? "Sinyal supervisor bertambah"
          : "Follow-up publik bertambah",
        {
          description:
            role === "supervisor-monitoring"
              ? "Ada bottleneck baru yang perlu dibaca di monitoring."
              : "Ada item publik baru yang perlu dicek di monitoring humas.",
        },
      );
    }

    alertCountRef.current = nextCount;
  }, [
    alertCountRef,
    exportRows,
    live.isLiveSession,
    monitoringSettings.playAlerts,
    priorityRows,
    role,
    unitSignals,
  ]);

  const [previewExport, setPreviewExport] = React.useState<{
    open: boolean;
    scope: MonitoringExportScope;
    format: MonitoringExportFormat;
  } | null>(null);
  const [isExportingPreview, setIsExportingPreview] = React.useState(false);

  const summaryExportRows = React.useMemo(
    () =>
      role === "supervisor-monitoring"
        ? unitExportSummary
        : serviceExportSummary,
    [role, unitExportSummary, serviceExportSummary],
  );

  const previewPayload = React.useMemo(
    () =>
      previewExport
        ? buildMonitoringExportPreviewPayload(previewExport.scope, previewExport.format, {
            role,
            exportRows: exportWorkspaceRows,
            summaryAggregateRows: summaryExportRows,
            followUpRows: followUpExportRows,
            exportPrefix: persona.exportPrefix,
          })
        : null,
    [
      exportWorkspaceRows,
      followUpExportRows,
      persona.exportPrefix,
      previewExport,
      role,
      summaryExportRows,
    ],
  );

  const handleOpenExportPreview = React.useCallback(
    (scope: MonitoringExportScope, format: MonitoringExportFormat) => {
      if (!canExportData) {
        toast.error(EXPORT_BLOCKED_MESSAGE);
        return;
      }

      if (!isMonitoringExportFormatAllowed(scope, format)) {
        toast.error("Format ini tidak tersedia untuk kumpulan data ini.");
        return;
      }

      const candidate = buildMonitoringExportPreviewPayload(scope, format, {
        role,
        exportRows: exportWorkspaceRows,
        summaryAggregateRows: summaryExportRows,
        followUpRows: followUpExportRows,
        exportPrefix: persona.exportPrefix,
      });

      if (!candidate) {
        toast.error("Belum ada data monitoring untuk diekspor pada filter aktif.");
        return;
      }

      setPreviewExport({
        open: true,
        scope,
        format,
      });
    },
    [canExportData, exportWorkspaceRows, followUpExportRows, persona.exportPrefix, role, summaryExportRows],
  );

  const handlePreviewFormatChange = React.useCallback((format: MonitoringExportFormat) => {
    if (!previewExport) {
      return;
    }

    if (!isMonitoringExportFormatAllowed(previewExport.scope, format)) {
      return;
    }

    setPreviewExport((prev) =>
      prev ? { ...prev, format } : null,
    );
  }, [previewExport]);

  const handleExportFromPreview = React.useCallback(
    (format: MonitoringExportFormat) => {
      if (!canExportData) {
        toast.error(EXPORT_BLOCKED_MESSAGE);
        return;
      }

      if (!previewExport) {
        toast.error("Tidak ada data untuk diekspor.");
        return;
      }

      if (!isMonitoringExportFormatAllowed(previewExport.scope, format)) {
        toast.error("Tidak ada data untuk diekspor.");
        return;
      }

      setIsExportingPreview(true);
      const payload = buildMonitoringExportPreviewPayload(
        previewExport.scope,
        format,
        {
          role,
          exportRows: exportWorkspaceRows,
          summaryAggregateRows: summaryExportRows,
          followUpRows: followUpExportRows,
          exportPrefix: persona.exportPrefix,
        },
      );

      if (!payload) {
        setIsExportingPreview(false);
        toast.error("Sumber data untuk ekspor ini kosong.");
        return;
      }

      try {
        const success = triggerDownload(payload.content, payload.filename, payload.mimeType);
        if (!success) {
          setIsExportingPreview(false);
          toast.error("Unduhan belum bisa dijalankan di perangkat ini.");
          return;
        }

        toast.success(
          `Ekspor ${payload.scopeLabel.toLowerCase()} berhasil dibuat (${payload.rowCount} baris).`,
        );
        setPreviewExport(null);
        setIsExportingPreview(false);
      } catch {
        setIsExportingPreview(false);
        toast.error("Ekspor gagal dijalankan.");
      }
    },
    [
      canExportData,
      exportWorkspaceRows,
      followUpExportRows,
      persona.exportPrefix,
      previewExport,
      role,
      summaryExportRows,
    ],
  );

  const handleOpenExportPreviewSummary = React.useCallback(
    () => handleOpenExportPreview("summary", "csv"),
    [handleOpenExportPreview],
  );
  const handleOpenExportPreviewFollowUp = React.useCallback(
    () => handleOpenExportPreview("follow-up", "csv"),
    [handleOpenExportPreview],
  );
  const handleOpenExportPreviewRawCsv = React.useCallback(
    () => handleOpenExportPreview("raw", "csv"),
    [handleOpenExportPreview],
  );
  const handleOpenExportPreviewRawJson = React.useCallback(
    () => handleOpenExportPreview("raw", "json"),
    [handleOpenExportPreview],
  );
  const handleOpenExportPreviewRawPdf = React.useCallback(
    () => handleOpenExportPreview("raw", "pdf"),
    [handleOpenExportPreview],
  );
  const handleOpenExportPreviewRawSql = React.useCallback(
    () => handleOpenExportPreview("raw", "sql"),
    [handleOpenExportPreview],
  );

  const handleRefresh = React.useCallback(async () => {
    if (live.isLiveSession && live.staffId) {
      await queryClient.invalidateQueries({
        queryKey: ["staff-live-appointments", live.staffId],
      });
      toast.success("Data monitoring berhasil dimuat ulang.");
      return;
    }

    window.location.reload();
  }, [live.isLiveSession, live.staffId, queryClient]);

  const handlePageAction = React.useCallback(
    async (actionIcon: "filter" | "refresh" | "download") => {
      if (actionIcon === "filter") {
        if (page === "profil") {
          router.push(getInternalPagePath(role, "monitoring"));
          return;
        }
        setShowAdvancedFilters((value) => !value);
        return;
      }

      if (actionIcon === "refresh") {
        await handleRefresh();
        return;
      }

      if (isExportPage) {
        handleOpenExportPreviewRawCsv();
        return;
      }

      if (!canExportData) {
        toast.error(EXPORT_BLOCKED_MESSAGE);
        return;
      }

      router.push(getInternalPagePath(role, exportPage));
    },
    [
      canExportData,
      exportPage,
      handleOpenExportPreviewRawCsv,
      handleRefresh,
      isExportPage,
      page,
      role,
      router,
    ],
  );

  if (!pageConfig) {
    const fallback = getInternalUnavailableCopy(role);
    return (
      <DashboardShell
        role={role}
        currentPath={getInternalPagePath(role, "dashboard")}
        title={fallback.title}
        subtitle={fallback.description}
      >
        <InternalWorkspaceUnavailable {...fallback} />
      </DashboardShell>
    );
  }

  const pageCopy =
    role === "supervisor-monitoring"
      ? page === "dashboard"
        ? {
            title: "Dashboard Supervisor Monitoring",
            description: "Ringkasan bottleneck dan antrean prioritas lintas unit.",
            heroEyebrow: "Control Room",
            heroTitle: "Baca bottleneck lintas unit dengan cepat",
            heroDescription: "Fokus ke unit kritis dan antrean yang perlu keputusan cepat.",
          }
        : page === "monitoring"
          ? {
              title: "Monitoring Supervisor",
              description: "Panel keputusan untuk bottleneck yang perlu intervensi.",
              heroEyebrow: "Monitoring Aktif",
              heroTitle: "Ambil keputusan saat bottleneck muncul",
              heroDescription: "Pantau unit yang menekan SLA dan antrean prioritas.",
            }
      : isExportPage
            ? {
                title: pageConfig?.title ?? "Ekspor Data Supervisor",
                description: "Ekspor data sesuai filter aktif.",
                heroEyebrow: pageConfig?.heroEyebrow ?? "Ekspor Data",
                heroTitle: "Ekspor data lintas unit",
                heroDescription: "Unduh data supervisor sesuai filter aktif.",
              }
            : {
                title: "Profil Supervisor",
                description: "Akun dan cakupan pengawasan supervisor.",
                heroEyebrow: "Profil",
                heroTitle: "Cakupan pengawasan supervisor",
                heroDescription: "Lihat akun aktif dan cakupan unit.",
              }
      : page === "dashboard"
        ? {
            title: "Dashboard Humas Monitoring",
            description: "Ringkasan layanan dan status yang paling terasa ke warga.",
            heroEyebrow: "Sinyal Publik",
            heroTitle: "Pantau layanan yang perlu dijelaskan",
            heroDescription: "Fokus ke layanan ramai dan status yang perlu dijaga.",
          }
        : page === "monitoring"
          ? {
              title: "Monitoring Humas",
              description: "Pantau perubahan layanan yang perlu dijelaskan ke publik.",
              heroEyebrow: "Monitoring Publik",
              heroTitle: "Pantau info layanan yang perlu dijaga",
              heroDescription: "Sorot unit prioritas, status utama, dan tindak lanjut.",
            }
          : isExportPage
            ? {
                title: pageConfig?.title ?? "Ekspor Data Humas",
                description: "Ekspor data sesuai filter aktif.",
                heroEyebrow: pageConfig?.heroEyebrow ?? "Ekspor Data",
                heroTitle:
                  role === "humas-admin" ? "Ekspor data humas admin" : "Ekspor data humas monitoring",
                heroDescription: "Unduh data humas sesuai filter aktif.",
              }
            : {
                title: "Profil Humas Monitoring",
                description: "Akun dan kanal pantau humas monitoring.",
                heroEyebrow: "Profil",
                heroTitle: "Cakupan monitoring publik",
                heroDescription: "Lihat akun aktif dan kanal pantau.",
              };

  if (isPermissionLoading) {
    return (
      <DashboardShell
        role={role}
        currentPath={currentPath}
        title={pageCopy.title}
        subtitle={pageCopy.description}
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {["Radar Aktif", "Perlu Tinjau", "Diproses", "Selesai"].map((label) => (
            <AppStatCard key={label} label={label} value="..." description="Memuat hak akses monitoring." />
          ))}
        </div>
      </DashboardShell>
    );
  }

  if (!hydrated || isLiveMonitoringPending) {
    return (
      <DashboardShell
        role={role}
        currentPath={currentPath}
        title={pageCopy.title}
        subtitle={pageCopy.description}
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {["Radar Aktif", "Perlu Tinjau", "Diproses", "Selesai"].map((label) => (
            <AppStatCard
              key={label}
              label={label}
              value="..."
              description="Memuat data monitoring live."
            />
          ))}
        </div>
      </DashboardShell>
    );
  }

  if (missingRoutePermissions.length) {
    return (
      <InternalPermissionFallback
        role={role}
        currentPath={currentPath}
        title={pageCopy.title}
        subtitle={pageCopy.description}
        message={`Akses untuk ${describeStaffPermissionRequirement(routeRequirement)} belum tersedia pada akun monitoring ini.`}
        primaryHref={fallbackPath}
        primaryLabel="Buka halaman lain"
        secondaryHref={getInternalPagePath(role, "profil")}
        secondaryLabel="Lihat profil monitoring"
      />
    );
  }

  if (needsStatisticsAccess && !canViewStatistics) {
    const fallbackPath = canExportData
      ? getInternalPagePath(role, exportPage)
      : getInternalPagePath(role, "profil");

    return (
      <DashboardShell
        role={role}
        currentPath={currentPath}
        title={pageCopy.title}
        subtitle={pageCopy.description}
      >
        <div className="space-y-6">
          <p className="text-sm leading-6 text-muted-foreground">Akses statistik belum tersedia.</p>
          <div className="flex flex-wrap gap-3">
            <AppButton onClick={() => router.push(fallbackPath)}>
              {canExportData ? "Buka data ekspor" : "Buka profil"}
            </AppButton>
            <AppButton
              variant="outline"
              onClick={() => router.push(getInternalPagePath(role, "profil"))}
            >
              Lihat profil monitoring
            </AppButton>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (needsExportAccess && !canExportData) {
    const fallbackPath = canViewStatistics
      ? getInternalPagePath(role, "dashboard")
      : getInternalPagePath(role, "profil");

    return (
      <DashboardShell
        role={role}
        currentPath={currentPath}
        title={pageCopy.title}
        subtitle={pageCopy.description}
      >
        <div className="space-y-6">
          <p className="text-sm leading-6 text-muted-foreground">Akses ekspor belum tersedia.</p>
          <div className="flex flex-wrap gap-3">
            <AppButton onClick={() => router.push(fallbackPath)}>
              {canViewStatistics ? "Kembali ke dashboard" : "Buka profil"}
            </AppButton>
            <AppButton
              variant="outline"
              onClick={() => router.push(getInternalPagePath(role, "profil"))}
            >
              Lihat profil monitoring
            </AppButton>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const renderContent = () => {
    if (page === "dashboard") {
      if (role === "supervisor-monitoring") {
        return (
          <SupervisorMonitoringDashboard
            primaryItems={primaryChartItems}
            primaryTrendLabels={primaryTrend.labels}
            primaryTrendSeries={primaryTrend.series}
            weeklyBreakdown={weeklyBreakdown}
            qualityItems={qualityChartItems}
            controlItems={dashboardControlItems}
            priorityRows={displayPriorityRows}
            showTrendPanels={monitoringSettings.showTrendPanels}
          />
        );
      }

      return (
        <HumasMonitoringDashboard
          primaryItems={primaryChartItems}
          weeklyBreakdown={weeklyBreakdown}
          publicSignalItems={publicSignalItems}
          communicationSignals={displayCommunicationSignals}
          showTrendPanels={monitoringSettings.showTrendPanels}
        />
      );
    }

    if (page === "monitoring") {
      if (role === "supervisor-monitoring") {
        return (
          <SupervisorMonitoringDetail
            primaryItems={primaryChartItems}
            statusBreakdown={statusBreakdown}
            weeklyBreakdown={weeklyBreakdown}
            unitSignals={displayUnitSignals}
            serviceRanks={filteredServiceRanks}
            priorityRows={displayPriorityRows}
          canExportData={canExportData}
            onOpenExportCenter={() => router.push(getInternalPagePath(role, exportPage))}
            onPreviewCsv={handleOpenExportPreviewRawCsv}
            onPreviewJson={handleOpenExportPreviewRawJson}
            showTrendPanels={monitoringSettings.showTrendPanels}
          />
        );
      }

      return (
        <HumasMonitoringDetail
          primaryItems={primaryChartItems}
          publicSignalItems={publicSignalItems}
          weeklyBreakdown={weeklyBreakdown}
          communicationSignals={displayCommunicationSignals}
          unitSignals={displayUnitSignals}
          canExportData={canExportData}
          onOpenExportCenter={() => router.push(getInternalPagePath(role, exportPage))}
          onPreviewCsv={handleOpenExportPreviewRawCsv}
          onPreviewJson={handleOpenExportPreviewRawJson}
          showTrendPanels={monitoringSettings.showTrendPanels}
        />
      );
    }

    if (isExportPage) {
      return (
        <MonitoringExportWorkspace
          role={role}
          rows={exportWorkspaceRows}
          unitSummaryItems={unitExportSummaryItems}
          serviceSummaryItems={serviceExportSummaryItems}
          statusItems={role === "supervisor-monitoring" ? statusBreakdown : publicSignalItems}
          compactDensity={monitoringSettings.compactDensity}
          canExportData={canExportData}
          onPreviewSummaryCsv={handleOpenExportPreviewSummary}
          onPreviewFollowUpCsv={handleOpenExportPreviewFollowUp}
          onPreviewRawPdf={handleOpenExportPreviewRawPdf}
          onPreviewRawCsv={handleOpenExportPreviewRawCsv}
          onPreviewRawJson={handleOpenExportPreviewRawJson}
          onPreviewRawSql={handleOpenExportPreviewRawSql}
        />
      );
    }

    return <MonitoringProfilePanel role={role} />;
  };
  const introActions = monitoringPageActions.filter((action) => {
    if (action.icon === "filter") {
      return false;
    }

    if (isExportPage && action.icon === "download") {
      return false;
    }

    if (page === "profil" && action.icon === "download") {
      return false;
    }

    return true;
  });

  return (
    <DashboardShell
      role={role}
      currentPath={currentPath}
      title={pageCopy.title}
      subtitle={pageCopy.description}
    >
      <div className="space-y-8">
        <AppPageIntro
          eyebrow={pageCopy.heroEyebrow}
          title={pageCopy.heroTitle}
          description={pageCopy.heroDescription}
          actions={
            <>
              {introActions.map((action) => {
                const Icon = resolveMonitoringIcon(action.icon);
                return (
                  <AppButton
                    key={action.label}
                    type="button"
                    variant={action.variant ?? "default"}
                    disabled={action.icon === "download" && !canExportData}
                    onClick={() => {
                      void handlePageAction(action.icon);
                    }}
                  >
                    <Icon className="size-4" />
                    {action.label}
                  </AppButton>
                );
              })}
            </>
          }
        />

        {page !== "profil" ? (
          <MonitoringFilterBar
            role={role}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            unitFilter={unitFilter}
            onUnitFilterChange={setUnitFilter}
            serviceFilter={serviceFilter}
            onServiceFilterChange={setServiceFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            walkInFilter={walkInFilter}
            onWalkInFilterChange={setWalkInFilter}
            availableUnitOptions={availableUnitOptions}
            availableServiceOptions={availableServiceOptions}
            availableStatusOptions={availableStatusOptions}
            availableWalkInOptions={availableWalkInOptions}
            showAdvancedFilters={showAdvancedFilters}
            onToggleAdvancedFilters={() => setShowAdvancedFilters((value) => !value)}
            onResetFilters={() => {
              setSearchQuery("");
              setDateFilter(createAppDateFilterValue("last30Days"));
              setUnitFilter("all");
              setServiceFilter("all");
              setStatusFilter("all");
              setWalkInFilter("all");
            }}
          />
        ) : null}

        {live.isLiveSession && live.isError ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Data monitoring live belum bisa dimuat.
          </p>
        ) : null}

        {canViewStatistics ? (
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
        ) : null}

        {renderContent()}
        <MonitoringExportPreviewDialog
          open={Boolean(previewExport?.open)}
          onOpenChange={(open) => {
            if (!open) {
              setPreviewExport(null);
              setIsExportingPreview(false);
            }
          }}
          payload={previewPayload}
          onFormatChange={handlePreviewFormatChange}
          onExport={handleExportFromPreview}
          canExportData={canExportData}
          isLoading={isExportingPreview}
        />
      </div>
    </DashboardShell>
  );
}
