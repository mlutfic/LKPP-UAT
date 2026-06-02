"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Database,
  Download,
  Eye,
  FileText,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { AppActionBar } from "@/components/ui/app-action-bar";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import {
  AppDateFilter,
  createAppDateFilterValue,
  formatAppDateFilterLabel,
  getJakartaTodayKey,
  type AppDateFilterValue,
} from "@/components/ui/app-date-filter";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppFilterBar } from "@/components/ui/app-filter-bar";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";
import {
  AppSearchSelect,
  type AppSearchSelectOption,
} from "@/components/ui/app-search-select";
import { AppSkeleton } from "@/components/ui/app-skeleton";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import {
  AppTable,
  AppTableCell,
  AppTableHead,
  AppTableHeaderCell,
  AppTableRow,
} from "@/components/ui/app-table";
import {
  getAdminExportWorkspace,
  type AdminExportWorkspacePackage,
} from "@/lib/api/admin-export-workspace";
import { resolveWorkspaceStatusTone } from "@/features/internal/internal-workspace-actions";

type AdminExportWorkspaceChrome = {
  actionEyebrow?: string;
  actionDescription?: string;
  actionPills?: string[];
};

type ExportFormat = "csv" | "pdf";
type ExportScope = "rekap" | "audit" | "publik";

type ExportPreviewPayload = {
  packageItem: AdminExportWorkspacePackage;
  format: ExportFormat;
  filename: string;
  mimeType: string;
  rowCount: number;
  previewText: string;
  content: string;
};

const EXPORT_FORMAT_LABEL: Record<ExportFormat, string> = {
  csv: "CSV",
  pdf: "PDF",
};

const EXPORT_SCOPE_LABEL: Record<ExportScope, string> = {
  rekap: "Rekap layanan",
  audit: "Audit sistem",
  publik: "Komunikasi publik",
};

const EXPORT_SCOPE_OPTIONS: AppSearchSelectOption[] = [
  { value: "all", label: "Semua scope" },
  { value: "rekap", label: "Rekap layanan", keywords: ["ringkasan", "antrean"] },
  { value: "audit", label: "Audit sistem", keywords: ["log", "riwayat", "perubahan"] },
  { value: "publik", label: "Komunikasi publik", keywords: ["pengumuman", "informasi"] },
];

const EXPORT_STATUS_OPTIONS: AppSearchSelectOption[] = [
  { value: "all", label: "Semua status" },
  { value: "Siap", label: "Siap" },
  { value: "Terkirim", label: "Terkirim" },
  { value: "Perlu Review", label: "Perlu Review" },
];

const EXPORT_FORMAT_OPTIONS: AppSearchSelectOption[] = [
  { value: "all", label: "Semua format" },
  { value: "csv", label: "CSV", keywords: ["comma", "spreadsheet"] },
  { value: "pdf", label: "PDF", keywords: ["dokumen", "laporan"] },
];

function compareDateKeys(left: string, right: string) {
  return left.localeCompare(right);
}

function dateKeyToUtcDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function utcDateToKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDateKey(dateKey: string, offsetDays: number) {
  const date = dateKeyToUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return utcDateToKey(date);
}

function formatDateKey(dateKey: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${dateKey}T00:00:00+07:00`));
}

function getStatusWeight(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("perlu review")) {
    return 0;
  }

  if (normalized.includes("siap")) {
    return 1;
  }

  if (normalized.includes("terkirim")) {
    return 2;
  }

  return 1;
}

function sortPackagesByAttention(packages: AdminExportWorkspacePackage[]) {
  return [...packages].sort((left, right) => {
    const diff = getStatusWeight(left.status) - getStatusWeight(right.status);
    if (diff !== 0) {
      return diff;
    }

    return right.rowCount - left.rowCount;
  });
}

function escapeCsvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function buildCsvTable(headers: string[], rows: Array<Array<string | number | boolean>>) {
  return [headers, ...rows]
    .map((columns) => columns.map((value) => escapeCsvValue(String(value))).join(","))
    .join("\n");
}

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function buildPdfDocument(title: string, lines: string[]) {
  const bodyLines = [
    "BT",
    "/F1 15 Tf",
    "48 760 Td",
    `(${escapePdfText(title)}) Tj`,
    "/F1 10 Tf",
    "0 -24 Td",
    ...lines.flatMap((line) => [`(${escapePdfText(line)}) Tj`, "0 -16 Td"]),
    "ET",
  ].join("\n");

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objects[3] =
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>";
  objects[4] = `<< /Length ${bodyLines.length} >>\nstream\n${bodyLines}\nendstream`;
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index] ?? 0).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function triggerDownload(content: string, filename: string, mimeType: string) {
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

function getPackageKeywords(item: AdminExportWorkspacePackage) {
  return [item.id, item.title, item.note, item.status, item.scopeLabel]
    .join(" ")
    .toLowerCase();
}

function getFormatLabel(value: string) {
  if (value === "all") return "Semua format";
  return EXPORT_FORMAT_LABEL[value as ExportFormat] ?? value.toUpperCase();
}

function getScopeLabel(value: string) {
  if (value === "all") return "Semua scope";
  return EXPORT_SCOPE_LABEL[value as ExportScope] ?? value;
}

function getStatusLabel(value: string) {
  if (value === "all") return "Semua status";
  return value;
}

function buildDefaultDateFilter(maxDate?: string | null): AppDateFilterValue {
  const today = getJakartaTodayKey();
  if (!maxDate || compareDateKeys(maxDate, today) >= 0) {
    return createAppDateFilterValue("last30Days");
  }

  return {
    preset: "custom",
    startDate: shiftDateKey(maxDate, -29),
    endDate: maxDate,
    anchorDate: maxDate,
  };
}

function buildExportPreviewPayload(
  packageItem: AdminExportWorkspacePackage,
  format: ExportFormat,
  filters: {
    rangeLabel: string;
    scopeLabel: string;
    statusLabel: string;
    formatLabel: string;
  },
): ExportPreviewPayload {
  const filenameBase = `laporan-humas-admin-${packageItem.id.toLowerCase()}-${getJakartaTodayKey()}`;
  const previewColumns =
    packageItem.rows.length > 0 && packageItem.columns.length
      ? packageItem.columns
      : ["Info"];
  const previewRows =
    packageItem.rows.length > 0
      ? packageItem.rows
      : [["Belum ada data untuk rentang dan filter saat ini."]];

  if (format === "pdf") {
    const contentLines = [
      `Paket: ${packageItem.title}`,
      `Scope: ${packageItem.scopeLabel}`,
      `Status: ${packageItem.status}`,
      `Baris: ${packageItem.rowCount}`,
      `Tanggal: ${formatDateKey(packageItem.dateKey)}`,
      `Filter: ${filters.rangeLabel} | ${filters.scopeLabel} | ${filters.statusLabel} | ${filters.formatLabel}`,
      "",
      "Kolom ekspor:",
      previewColumns.join(", "),
      "",
      ...previewRows.map(
        (row, rowIndex) =>
          `${rowIndex + 1}. ${previewColumns
            .map((column, columnIndex) => `${column}: ${row[columnIndex] ?? "-"}`)
            .join(" | ")}`,
      ),
    ];

    return {
      packageItem,
      format,
      filename: `${filenameBase}.pdf`,
      mimeType: "application/pdf",
      rowCount: packageItem.rowCount,
      previewText: contentLines.slice(0, 12).join("\n"),
      content: buildPdfDocument(`LKPP Humas Admin - ${packageItem.title}`, contentLines),
    };
  }

  return {
    packageItem,
    format,
    filename: `${filenameBase}.csv`,
    mimeType: "text/csv;charset=utf-8;",
    rowCount: packageItem.rowCount,
    previewText: buildCsvTable(previewColumns, previewRows.slice(0, 8)),
    content: buildCsvTable(previewColumns, previewRows),
  };
}

export function AdminExportWorkspaceSection({
  chrome,
}: {
  chrome: AdminExportWorkspaceChrome;
}) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<AppDateFilterValue>(() =>
    createAppDateFilterValue("last30Days"),
  );
  const [scopeFilter, setScopeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [formatFilter, setFormatFilter] = React.useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(true);
  const [previewTarget, setPreviewTarget] = React.useState<{
    packageId: string;
    format: ExportFormat;
  } | null>(null);
  const didSyncAvailableRangeRef = React.useRef(false);

  const workspaceQuery = useQuery({
    queryKey: ["admin-export-workspace", dateFilter.startDate, dateFilter.endDate],
    queryFn: () =>
      getAdminExportWorkspace({
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate,
      }),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  React.useEffect(() => {
    if (didSyncAvailableRangeRef.current) {
      return;
    }

    const maxDate = workspaceQuery.data?.availableRange.maxDate;
    if (!maxDate) {
      return;
    }

    didSyncAvailableRangeRef.current = true;

    if (compareDateKeys(maxDate, dateFilter.endDate) < 0) {
      setDateFilter(buildDefaultDateFilter(maxDate));
    }
  }, [dateFilter.endDate, workspaceQuery.data?.availableRange.maxDate]);

  const packages = React.useMemo(
    () => sortPackagesByAttention(workspaceQuery.data?.packages ?? []),
    [workspaceQuery.data?.packages],
  );

  const filteredPackages = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return packages.filter((item) => {
      if (scopeFilter !== "all" && item.scope !== scopeFilter) {
        return false;
      }

      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (formatFilter !== "all" && !item.formats.includes(formatFilter as ExportFormat)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return getPackageKeywords(item).includes(normalizedQuery);
    });
  }, [formatFilter, packages, scopeFilter, searchQuery, statusFilter]);

  const visiblePackages = React.useMemo(
    () => sortPackagesByAttention(filteredPackages),
    [filteredPackages],
  );

  const currentPackage = React.useMemo(
    () =>
      previewTarget
        ? visiblePackages.find((item) => item.id === previewTarget.packageId) ??
          packages.find((item) => item.id === previewTarget.packageId) ??
          visiblePackages[0] ??
          null
        : null,
    [packages, previewTarget, visiblePackages],
  );

  const previewPayload = React.useMemo(() => {
    if (!currentPackage) {
      return null;
    }

    return buildExportPreviewPayload(currentPackage, previewTarget?.format ?? "csv", {
      rangeLabel: formatAppDateFilterLabel(dateFilter),
      scopeLabel: getScopeLabel(scopeFilter),
      statusLabel: getStatusLabel(statusFilter),
      formatLabel: getFormatLabel(formatFilter),
    });
  }, [currentPackage, dateFilter, formatFilter, previewTarget?.format, scopeFilter, statusFilter]);

  const stats = React.useMemo(() => {
    const scopedPackages = filteredPackages;
    const readyCount = scopedPackages.filter(
      (item) =>
        item.rowCount > 0 && (item.status === "Siap" || item.status === "Terkirim"),
    ).length;
    const reviewCount = scopedPackages.filter(
      (item) => item.status === "Perlu Review",
    ).length;
    const rowCount = scopedPackages.reduce((sum, item) => sum + item.rowCount, 0);
    const scopeCount = new Set(
      scopedPackages.filter((item) => item.rowCount > 0).map((item) => item.scope),
    ).size;

    return [
      {
        label: "Paket terlihat",
        value: String(scopedPackages.length),
        description: "Paket yang cocok dengan filter aktif.",
        tone: "role" as const,
      },
      {
        label: "Siap unduh",
        value: String(readyCount),
        description: "Paket Supabase yang siap dibagikan.",
        tone: "success" as const,
      },
      {
        label: "Perlu review",
        value: String(reviewCount),
        description: "Paket yang masih perlu ditinjau.",
        tone: "warning" as const,
      },
      {
        label: "Total baris",
        value: String(rowCount),
        description: `${scopeCount || 0} scope aktif dalam workspace.`,
        tone: "info" as const,
      },
    ];
  }, [filteredPackages]);

  const scopeDescription = React.useMemo(() => {
    if (scopeFilter === "all") {
      return "Semua scope";
    }

    return EXPORT_SCOPE_LABEL[scopeFilter as ExportScope];
  }, [scopeFilter]);

  const openPreview = React.useCallback(
    (item?: AdminExportWorkspacePackage | null, format: ExportFormat = "csv") => {
      const target = item ?? visiblePackages[0];
      if (!target) {
        toast.error("Belum ada paket yang bisa dipratinjau.");
        return;
      }

      setPreviewTarget({ packageId: target.id, format });
    },
    [visiblePackages],
  );

  const clearFilters = React.useCallback(() => {
    setSearchQuery("");
    setDateFilter(buildDefaultDateFilter(workspaceQuery.data?.availableRange.maxDate));
    setScopeFilter("all");
    setStatusFilter("all");
    setFormatFilter("all");
    toast.success("Filter ekspor dipulihkan.");
  }, [workspaceQuery.data?.availableRange.maxDate]);

  const quickActions = React.useMemo(() => {
    const labels = chrome.actionPills ?? ["Pratinjau Paket", "Filter Kalender", "CSV", "PDF"];

    return labels.map((label) => {
      const normalized = label.toLowerCase();

      let onClick = () => {
        if (normalized.includes("pratinjau")) {
          openPreview(visiblePackages[0] ?? null, "csv");
          return;
        }

        if (normalized.includes("filter") || normalized.includes("kalender")) {
          setShowAdvancedFilters((value) => !value);
          return;
        }

        if (normalized.includes("csv")) {
          openPreview(visiblePackages[0] ?? null, "csv");
          return;
        }

        if (normalized.includes("pdf")) {
          openPreview(visiblePackages[0] ?? null, "pdf");
          return;
        }

        if (normalized.includes("reset") || normalized.includes("segarkan")) {
          clearFilters();
        }
      };

      if (normalized.includes("filter")) {
        onClick = () => setShowAdvancedFilters((value) => !value);
      }

      return (
        <AppButton
          key={label}
          size="sm"
          variant={normalized.includes("pratinjau") ? "default" : "outline"}
          type="button"
          onClick={onClick}
        >
          {label}
        </AppButton>
      );
    });
  }, [chrome.actionPills, clearFilters, openPreview, visiblePackages]);

  const handlePreviewRequest = React.useCallback(
    (item: AdminExportWorkspacePackage, format: ExportFormat) => {
      setPreviewTarget({ packageId: item.id, format });
    },
    [],
  );

  const handleExportFromPreview = React.useCallback(
    (format: ExportFormat) => {
      if (!previewPayload) {
        toast.error("Belum ada paket yang dipilih.");
        return;
      }

      const payload =
        format === previewPayload.format
          ? previewPayload
          : buildExportPreviewPayload(previewPayload.packageItem, format, {
              rangeLabel: formatAppDateFilterLabel(dateFilter),
              scopeLabel: getScopeLabel(scopeFilter),
              statusLabel: getStatusLabel(statusFilter),
              formatLabel: getFormatLabel(formatFilter),
            });

      const success = triggerDownload(payload.content, payload.filename, payload.mimeType);
      if (!success) {
        toast.error("Unduhan belum bisa dijalankan di perangkat ini.");
        return;
      }

      toast.success(
        `Ekspor ${payload.packageItem.title} berhasil dibuat (${payload.rowCount} baris).`,
      );
      setPreviewTarget(null);
    },
    [dateFilter, formatFilter, previewPayload, scopeFilter, statusFilter],
  );

  const isInitialLoading = workspaceQuery.isLoading && !workspaceQuery.data;

  return (
    <div className="space-y-6">
      {chrome.actionEyebrow && chrome.actionDescription ? (
        <AppActionBar>
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {chrome.actionEyebrow}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">{chrome.actionDescription}</p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-3 md:justify-end">
            {quickActions}
          </div>
        </AppActionBar>
      ) : null}

      <AppCard tone="soft" padding="lg" className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            {EXPORT_SCOPE_LABEL.rekap}
          </p>
          <h2 className="text-2xl font-bold tracking-tight">Pratinjau paket sebelum unduh</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Gunakan filter kalender, scope, status, dan format agar paket ekspor lebih presisi sebelum dibagikan.
          </p>
        </div>

        {workspaceQuery.isError ? (
          <AppNotice
            icon={Database}
            tone="danger"
            title="Data ekspor belum bisa dimuat"
            description={
              workspaceQuery.error instanceof Error
                ? workspaceQuery.error.message
                : "Terjadi kendala saat membaca data Supabase untuk modul ekspor."
            }
          />
        ) : (
          <AppNotice
            icon={ShieldCheck}
            tone="role"
            title="Preview lebih dulu, baru unduh"
            description="Seluruh paket dibaca dari Supabase pada rentang tanggal aktif dan bisa dicek dalam CSV atau PDF."
          />
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isInitialLoading
            ? Array.from({ length: 4 }, (_, index) => (
                <AppSkeleton key={index} className="h-36 rounded-[22px]" />
              ))
            : stats.map((stat) => (
                <AppStatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  description={stat.description}
                  tone={stat.tone}
                />
              ))}
        </div>
      </AppCard>

      <AppFilterBar
        actions={
          <>
            <AppButton variant="outline" size="sm" onClick={() => setShowAdvancedFilters((value) => !value)}>
              <SlidersHorizontal className="size-4" />
              {showAdvancedFilters ? "Sembunyikan filter" : "Filter lanjut"}
            </AppButton>
            <AppButton variant="outline" size="sm" onClick={clearFilters}>
              <RefreshCcw className="size-4" />
              Reset
            </AppButton>
            <AppButton size="sm" onClick={() => openPreview(visiblePackages[0] ?? null, "csv")}>
              <Eye className="size-4" />
              Pratinjau teratas
            </AppButton>
          </>
        }
      >
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <AppInput
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Cari paket, scope, atau catatan"
            className="pl-11"
          />
        </div>
        <AppDateFilter
          value={dateFilter}
          onChange={setDateFilter}
          mode="range"
          buttonClassName="md:min-w-44"
        />
      </AppFilterBar>

      {showAdvancedFilters ? (
        <AppCard padding="md" className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <AppSearchSelect
            value={scopeFilter}
            onValueChange={setScopeFilter}
            options={EXPORT_SCOPE_OPTIONS}
            placeholder="Pilih scope"
            searchPlaceholder="Cari scope"
          />
          <AppSearchSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={EXPORT_STATUS_OPTIONS}
            placeholder="Pilih status"
            searchPlaceholder="Cari status"
          />
          <AppSearchSelect
            value={formatFilter}
            onValueChange={setFormatFilter}
            options={EXPORT_FORMAT_OPTIONS}
            placeholder="Pilih format"
            searchPlaceholder="Cari format"
          />
        </AppCard>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {isInitialLoading
          ? Array.from({ length: 3 }, (_, index) => (
              <AppSkeleton key={index} className="h-[21rem] rounded-[28px]" />
            ))
          : visiblePackages.map((item) => (
              <AppCard key={item.id} padding="lg" className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                    {item.scopeLabel}
                  </p>
                  <h3 className="text-xl font-bold tracking-tight">{item.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{item.note}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-foreground">
                    {item.status}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-role-accent-soft px-3 py-1 text-xs font-semibold text-role-accent">
                    {item.rowCount} baris
                  </span>
                  <span className="inline-flex items-center rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-foreground">
                    {formatDateKey(item.dateKey)}
                  </span>
                </div>

                <div className="space-y-2 rounded-[22px] bg-surface-container-low px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Format siap
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.formats.map((format) => (
                      <span
                        key={format}
                        className="inline-flex items-center rounded-full border border-border bg-surface-container-lowest px-3 py-1 text-xs font-semibold text-foreground"
                      >
                        {EXPORT_FORMAT_LABEL[format]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <AppButton size="sm" variant="outline" onClick={() => handlePreviewRequest(item, "csv")}>
                    <Eye className="size-4" />
                    Preview
                  </AppButton>
                  <AppButton size="sm" variant="outline" onClick={() => handlePreviewRequest(item, "pdf")}>
                    <FileText className="size-4" />
                    PDF
                  </AppButton>
                  <AppButton size="sm" onClick={() => handlePreviewRequest(item, "csv")}>
                    <Download className="size-4" />
                    Unduh
                  </AppButton>
                </div>
              </AppCard>
            ))}
      </div>

      <AppCard padding="lg" className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            Daftar paket
          </p>
          <h2 className="text-xl font-bold tracking-tight">Paket terfilter</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {visiblePackages.length
              ? `Menampilkan ${visiblePackages.length} paket pada ${formatAppDateFilterLabel(dateFilter)}.`
              : "Belum ada paket yang cocok dengan filter aktif."}
          </p>
        </div>

        <AppTable className="table-fixed">
          <AppTableHead>
            <tr>
              <AppTableHeaderCell className="w-[26%]">Paket</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[18%]">Scope</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[12%]">Baris</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[14%]">Status</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[16%]">Tanggal</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[14%]">Aksi</AppTableHeaderCell>
            </tr>
          </AppTableHead>
          <tbody>
            {visiblePackages.length ? (
              visiblePackages.map((item) => (
                <AppTableRow key={item.id}>
                  <AppTableCell className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.note}</p>
                  </AppTableCell>
                  <AppTableCell>
                    <p className="text-sm text-foreground">{item.scopeLabel}</p>
                  </AppTableCell>
                  <AppTableCell>
                    <p className="text-sm font-semibold text-foreground">{item.rowCount}</p>
                  </AppTableCell>
                  <AppTableCell>
                    <AppStatusBadge status={resolveWorkspaceStatusTone(item.status)} label={item.status} />
                  </AppTableCell>
                  <AppTableCell>
                    <p className="text-sm text-foreground">{formatDateKey(item.dateKey)}</p>
                    <p className="text-xs text-muted-foreground">{item.lastUpdatedLabel}</p>
                  </AppTableCell>
                  <AppTableCell>
                    <div className="flex flex-wrap gap-2">
                      <AppButton size="sm" variant="outline" onClick={() => handlePreviewRequest(item, "csv")}>
                        <Eye className="size-4" />
                      </AppButton>
                      <AppButton size="sm" variant="outline" onClick={() => handlePreviewRequest(item, "pdf")}>
                        <FileText className="size-4" />
                      </AppButton>
                      <AppButton size="sm" onClick={() => handlePreviewRequest(item, "csv")}>
                        <Download className="size-4" />
                      </AppButton>
                    </div>
                  </AppTableCell>
                </AppTableRow>
              ))
            ) : (
              <AppTableRow>
                <AppTableCell colSpan={6} className="py-10 text-center">
                  <p className="text-sm font-semibold">Belum ada paket yang cocok</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Ubah filter kalender, scope, atau format untuk melihat paket ekspor yang lain.
                  </p>
                </AppTableCell>
              </AppTableRow>
            )}
          </tbody>
        </AppTable>
      </AppCard>

      <AppDialog
        open={Boolean(previewTarget && previewPayload)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPreviewTarget(null);
          }
        }}
        title="Pratinjau paket ekspor"
        description={
          previewPayload
            ? `${previewPayload.packageItem.title} • ${previewPayload.rowCount} baris • ${EXPORT_FORMAT_LABEL[previewPayload.format]}`
            : "Pilih paket untuk melihat preview."
        }
        className="max-w-4xl"
      >
        <div className="space-y-5">
          <div className="grid gap-3 rounded-[22px] border border-border/80 bg-surface-container-low px-4 py-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Range</p>
              <p className="mt-1 text-sm font-semibold">{formatAppDateFilterLabel(dateFilter)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Scope</p>
              <p className="mt-1 text-sm font-semibold">{scopeDescription}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Status</p>
              <p className="mt-1 text-sm font-semibold">{getStatusLabel(statusFilter)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Format</p>
              <p className="mt-1 text-sm font-semibold">{getFormatLabel(formatFilter)}</p>
            </div>
          </div>

          <AppNotice
            icon={Database}
            tone="role"
            title="Preview ini bisa dipakai sebelum unduh"
            description="Konten preview dibangun dari data Supabase yang sudah difilter pada rentang aktif."
          />

          <div className="flex flex-wrap gap-2">
            {(["csv", "pdf"] as ExportFormat[]).map((format) => (
              <AppButton
                key={format}
                size="sm"
                variant={previewPayload?.format === format ? "default" : "outline"}
                onClick={() => {
                  if (!currentPackage) {
                    return;
                  }
                  setPreviewTarget({ packageId: currentPackage.id, format });
                }}
              >
                {EXPORT_FORMAT_LABEL[format]}
              </AppButton>
            ))}
          </div>

          <pre className="max-h-[28rem] overflow-auto rounded-[18px] border border-border/70 bg-surface-container-lowest px-4 py-4 text-xs leading-6 text-muted-foreground">
            {previewPayload?.previewText ?? "Pilih paket untuk melihat preview."}
          </pre>

          <div className="flex flex-wrap justify-end gap-3">
            <AppButton variant="outline" onClick={() => setPreviewTarget(null)}>
              Batal
            </AppButton>
            <AppButton onClick={() => handleExportFromPreview(previewPayload?.format ?? "csv")}>
              <Download className="size-4" />
              Ambil Unduhan
            </AppButton>
          </div>
        </div>
      </AppDialog>
    </div>
  );
}
