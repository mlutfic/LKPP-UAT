"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Clock3,
  Download,
  Filter,
  RefreshCcw,
  Search,
  X,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { AppActionBar } from "@/components/ui/app-action-bar";
import { AppBadge } from "@/components/ui/app-badge";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import {
  AppDateFilter,
  createAppDateFilterValue,
  formatAppDateFilterLabel,
  getJakartaTodayKey,
  isDateWithinAppDateFilter,
  type AppDateFilterValue,
} from "@/components/ui/app-date-filter";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppFilterBar } from "@/components/ui/app-filter-bar";
import { AppFilterTrigger } from "@/components/ui/app-filter-trigger";
import { AppInput } from "@/components/ui/app-input";
import { AppPagination } from "@/components/ui/app-pagination";
import { AppSearchSelect, type AppSearchSelectOption } from "@/components/ui/app-search-select";
import { AppStatCard } from "@/components/ui/app-stat-card";
import {
  AppTable,
  AppTableCell,
  AppTableHead,
  AppTableHeaderCell,
  AppTableRow,
} from "@/components/ui/app-table";
import { getAdminSectionChrome } from "@/features/internal/admin-panel-content";
import type { StaffPermissionSet } from "@/lib/internal-role-policy";

type ActivityTone = "role" | "info" | "warning" | "success" | "danger";

type ActivityLogItem = {
  id: string;
  timestamp: string;
  actor: string;
  actorLabel: string;
  module: string;
  action: string;
  summary: string;
  result: string;
  tone: ActivityTone;
  details: string[];
  reference: string;
};

const ACTION_EVENT_PREFIX = "lkpp:admin-managed";
const LOGS_PAGE_SIZE = 10;
const EMPTY_ACTIVITY_LOGS: ActivityLogItem[] = [];

function useManagedEvent(action: "primary" | "secondary", handler: () => void) {
  React.useEffect(() => {
    const eventName = `${ACTION_EVENT_PREFIX}:aktivitas:${action}`;

    function onEvent() {
      handler();
    }

    window.addEventListener(eventName, onEvent);
    return () => window.removeEventListener(eventName, onEvent);
  }, [action, handler]);
}

type ActivityLogsResponse = {
  ok: boolean;
  generatedAt: string;
  logs: ActivityLogItem[];
};

async function fetchActivityLogs(): Promise<ActivityLogsResponse> {
  const response = await fetch("/api/admin/activity-logs", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<ActivityLogsResponse> & {
    error?: string;
  };

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Log aktivitas live belum dapat dibaca.");
  }

  return {
    ok: true,
    generatedAt:
      typeof payload.generatedAt === "string"
        ? payload.generatedAt
        : new Date().toISOString(),
    logs: Array.isArray(payload.logs) ? payload.logs : [],
  };
}

const DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

function toDateKey(timestamp: string) {
  return timestamp.slice(0, 10);
}

function formatActivityDate(timestamp: string) {
  return DATE_FORMATTER.format(new Date(timestamp));
}

function formatActivityTime(timestamp: string) {
  return `${TIME_FORMATTER.format(new Date(timestamp))} WIB`;
}

function escapeCsvValue(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function AdminActivityLogSection({
  permissions,
}: {
  permissions?: Partial<StaffPermissionSet> | null;
}) {
  const chrome = getAdminSectionChrome("aktivitas");
  const canExportData = permissions?.canExportData ?? true;
  const [dateFilter, setDateFilter] = React.useState<AppDateFilterValue>(() =>
    createAppDateFilterValue("last7Days"),
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [moduleFilter, setModuleFilter] = React.useState("all");
  const [actorFilter, setActorFilter] = React.useState("all");
  const [resultFilter, setResultFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(true);
  const [selectedLog, setSelectedLog] = React.useState<ActivityLogItem | null>(null);
  const logsQuery = useQuery({
    queryKey: ["admin-activity-logs"],
    queryFn: fetchActivityLogs,
    staleTime: 10_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const allLogs = logsQuery.data?.logs ?? EMPTY_ACTIVITY_LOGS;
  const logsCheckedAt = logsQuery.data?.generatedAt
    ? new Date(logsQuery.data.generatedAt).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Belum diperbarui";
  const logsPending = !logsQuery.data && (logsQuery.isPending || logsQuery.isFetching);

  const moduleOptions = React.useMemo<AppSearchSelectOption[]>(() => {
    const modules = Array.from(new Set(allLogs.map((item) => item.module))).sort((left, right) =>
      left.localeCompare(right, "id-ID"),
    );

    return [
      { value: "all", label: "Semua modul" },
      ...modules.map((module) => ({
        value: module,
        label: module,
        keywords: module.toLowerCase().split(/\s+/),
      })),
    ];
  }, [allLogs]);

  const actorOptions = React.useMemo<AppSearchSelectOption[]>(() => {
    const actors = Array.from(
      new Map(allLogs.map((item) => [item.actor, item.actorLabel])).entries(),
    ).sort((left, right) => left[1].localeCompare(right[1], "id-ID"));

    return [
      { value: "all", label: "Semua aktor" },
      ...actors.map(([actor, actorLabel]) => ({
        value: actor,
        label: actorLabel,
        keywords: [actorLabel.toLowerCase(), actor.toLowerCase()],
      })),
    ];
  }, [allLogs]);

  const resultOptions = React.useMemo<AppSearchSelectOption[]>(() => {
    const results = Array.from(new Set(allLogs.map((item) => item.result))).sort((left, right) =>
      left.localeCompare(right, "id-ID"),
    );

    return [
      { value: "all", label: "Semua hasil" },
      ...results.map((result) => ({
        value: result,
        label: result,
        keywords: result.toLowerCase().split(/\s+/),
      })),
    ];
  }, [allLogs]);

  React.useEffect(() => {
    if (moduleFilter !== "all" && !moduleOptions.some((option) => option.value === moduleFilter)) {
      setModuleFilter("all");
    }
  }, [moduleFilter, moduleOptions]);

  React.useEffect(() => {
    if (actorFilter !== "all" && !actorOptions.some((option) => option.value === actorFilter)) {
      setActorFilter("all");
    }
  }, [actorFilter, actorOptions]);

  React.useEffect(() => {
    if (resultFilter !== "all" && !resultOptions.some((option) => option.value === resultFilter)) {
      setResultFilter("all");
    }
  }, [resultFilter, resultOptions]);

  const filteredLogs = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return [...allLogs]
      .filter((item) => {
        if (!isDateWithinAppDateFilter(toDateKey(item.timestamp), dateFilter)) {
          return false;
        }

        if (moduleFilter !== "all" && item.module !== moduleFilter) {
          return false;
        }

        if (actorFilter !== "all" && item.actor !== actorFilter) {
          return false;
        }

        if (resultFilter !== "all" && item.result !== resultFilter) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const haystack = [
          item.id,
          item.actor,
          item.actorLabel,
          item.module,
          item.action,
          item.summary,
          item.result,
          item.reference,
          ...item.details,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  }, [actorFilter, allLogs, dateFilter, moduleFilter, resultFilter, searchQuery]);

  const visibleTodayKey = React.useMemo(() => createAppDateFilterValue("today").startDate, []);
  const activeFilterCount = [
    searchQuery.trim().length > 0,
    dateFilter.preset !== "last7Days",
    moduleFilter !== "all",
    actorFilter !== "all",
    resultFilter !== "all",
  ].filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PAGE_SIZE));
  const currentPageLogs = React.useMemo(
    () => filteredLogs.slice((page - 1) * LOGS_PAGE_SIZE, page * LOGS_PAGE_SIZE),
    [filteredLogs, page],
  );
  const pageStart = filteredLogs.length ? (page - 1) * LOGS_PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(page * LOGS_PAGE_SIZE, filteredLogs.length);
  const paginationResetKey = `${searchQuery}|${dateFilter.preset}|${dateFilter.startDate}|${dateFilter.endDate}|${moduleFilter}|${actorFilter}|${resultFilter}`;

  React.useEffect(() => {
    setPage(1);
  }, [paginationResetKey]);

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const stats = React.useMemo(() => {
    if (logsPending) {
      return [
        {
          label: "Log Terlihat",
          value: "…",
          description: "Sedang membaca log live dari backend.",
          icon: Activity,
          tone: "role" as const,
        },
        {
          label: "Hari Ini",
          value: "…",
          description: "Menghitung aktivitas hari berjalan.",
          icon: Clock3,
          tone: "info" as const,
        },
        {
          label: "Perlu Cek",
          value: "…",
          description: "Menyiapkan status log yang butuh perhatian.",
          icon: ShieldCheck,
          tone: "warning" as const,
        },
        {
          label: "Petugas Aktif",
          value: "…",
          description: "Memuat aktor yang tercatat di audit.",
          icon: Users,
          tone: "success" as const,
        },
      ];
    }

    const visibleCount = filteredLogs.length;
    const todayCount = filteredLogs.filter((item) => toDateKey(item.timestamp) === visibleTodayKey).length;
    const reviewCount = filteredLogs.filter((item) => item.tone === "warning" || item.tone === "danger").length;
    const actorCount = new Set(filteredLogs.map((item) => item.actor)).size;

    return [
      {
        label: "Log Terlihat",
        value: visibleCount,
        description: `Muncul untuk ${formatAppDateFilterLabel(dateFilter).toLowerCase()}.`,
        icon: Activity,
        tone: "role" as const,
      },
      {
        label: "Hari Ini",
        value: todayCount,
        description: "Aktivitas yang tercatat pada tanggal berjalan.",
        icon: Clock3,
        tone: "info" as const,
      },
      {
        label: "Perlu Cek",
        value: reviewCount,
        description: "Log berstatus warning atau butuh perhatian.",
        icon: ShieldCheck,
        tone: "warning" as const,
      },
      {
        label: "Petugas Aktif",
        value: actorCount,
        description: "Akun yang tercatat melakukan perubahan.",
        icon: Users,
        tone: "success" as const,
      },
    ];
  }, [dateFilter, filteredLogs, logsPending, visibleTodayKey]);

  const resetFilters = React.useCallback(() => {
    setDateFilter(createAppDateFilterValue("last7Days"));
    setSearchQuery("");
    setModuleFilter("all");
    setActorFilter("all");
    setResultFilter("all");
    setShowAdvancedFilters(true);
    toast.success("Filter log dibersihkan.");
  }, [
    setActorFilter,
    setDateFilter,
    setModuleFilter,
    setResultFilter,
    setSearchQuery,
    setShowAdvancedFilters,
  ]);

  const refreshActivityData = React.useCallback(async () => {
    const result = await logsQuery.refetch();

    if (result.error) {
      toast.error("Log aktivitas live belum dapat disegarkan.");
      return;
    }

    toast.success("Log aktivitas live disegarkan.");
  }, [logsQuery]);

  const handleExportCsv = React.useCallback(() => {
    if (logsPending) {
      toast.error("Log aktivitas masih dimuat. Coba lagi sesaat.");
      return;
    }

    if (!filteredLogs.length) {
      toast.error("Belum ada log aktivitas untuk diunduh.");
      return;
    }

    const header = [
      "Waktu",
      "Tanggal",
      "Aktor",
      "Identitas",
      "Modul",
      "Aktivitas",
      "Ringkasan",
      "Hasil",
      "Referensi",
      "Detail",
    ];

    const rows = filteredLogs.map((item) => [
      formatActivityTime(item.timestamp),
      formatActivityDate(item.timestamp),
      item.actorLabel,
      item.actor,
      item.module,
      item.action,
      item.summary,
      item.result,
      item.reference,
      item.details.join(" | "),
    ]);

    const csv = [header, ...rows]
      .map((columns) => columns.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `log-aktivitas-${getJakartaTodayKey()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    toast.success(`${filteredLogs.length} log berhasil diunduh sebagai CSV.`);
  }, [filteredLogs, logsPending]);

  const toggleAdvancedFilters = React.useCallback(() => {
    setShowAdvancedFilters((currentValue) => {
      const nextValue = !currentValue;
      toast.success(nextValue ? "Filter log ditampilkan." : "Filter log disembunyikan.");
      return nextValue;
    });
  }, [setShowAdvancedFilters]);

  useManagedEvent("primary", toggleAdvancedFilters);
  useManagedEvent("secondary", refreshActivityData);

  const actionButtons = (chrome.actionPills ?? []).flatMap((label) => {
    const lower = label.toLowerCase();
    const isFilter = lower.includes("filter");
    const isReload = lower.includes("muat") || lower.includes("ulang") || lower.includes("segar");
    const isDownload = lower.includes("unduh") || lower.includes("ekspor");

    if (isDownload && !canExportData) {
      return [];
    }

    return [
      <AppButton
        key={label}
        variant={isFilter ? "default" : "outline"}
        size="sm"
        onClick={() => {
          if (isFilter) {
            toggleAdvancedFilters();
            return;
          }

          if (isReload) {
            refreshActivityData();
            return;
          }

          if (isDownload) {
            handleExportCsv();
          }
        }}
        className="min-w-fit"
      >
        {isFilter ? <Filter className="size-4" /> : null}
        {isReload ? <RefreshCcw className="size-4" /> : null}
        {isDownload ? <Download className="size-4" /> : null}
        {label}
      </AppButton>,
    ];
  });

  return (
    <div className="space-y-6">
      {chrome.actionEyebrow && chrome.actionDescription ? (
        <AppActionBar>
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {chrome.actionEyebrow}
            </p>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {chrome.actionDescription}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-3 md:justify-end">
            {actionButtons}
          </div>
        </AppActionBar>
      ) : null}

      <AppCard tone="soft" padding="lg" className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <AppStatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
              tone={stat.tone}
            />
          ))}
        </div>

        <AppFilterBar
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <AppDateFilter value={dateFilter} onChange={setDateFilter} />
              <AppFilterTrigger
                icon={Filter}
                label="Filter"
                count={activeFilterCount}
                active={showAdvancedFilters}
                onClick={() => setShowAdvancedFilters((currentValue) => !currentValue)}
              />
            </div>
          }
        >
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <AppInput
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari petugas, modul, aksi, atau keterangan"
              className="h-11 pl-10 pr-10"
            />
            {searchQuery ? (
              <button
                type="button"
                aria-label="Hapus pencarian"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        </AppFilterBar>

        {showAdvancedFilters ? (
          <div className="grid gap-3 border-t border-border/80 pt-4 md:grid-cols-3">
            <AppSearchSelect
              value={moduleFilter}
              onValueChange={setModuleFilter}
              options={moduleOptions}
              placeholder="Semua modul"
              searchPlaceholder="Cari modul"
              emptyMessage="Modul tidak ditemukan."
            />
            <AppSearchSelect
              value={actorFilter}
              onValueChange={setActorFilter}
              options={actorOptions}
              placeholder="Semua aktor"
              searchPlaceholder="Cari aktor"
              emptyMessage="Aktor tidak ditemukan."
            />
            <AppSearchSelect
              value={resultFilter}
              onValueChange={setResultFilter}
              options={resultOptions}
              placeholder="Semua hasil"
              searchPlaceholder="Cari hasil"
              emptyMessage="Hasil tidak ditemukan."
            />

            <div className="md:col-span-3 flex flex-wrap justify-end gap-3">
              <AppButton variant="ghost" size="sm" onClick={resetFilters}>
                Bersihkan filter
              </AppButton>
            </div>
          </div>
        ) : null}
      </AppCard>

      <AppCard padding="lg" className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              Daftar log
            </p>
            <h2 className="text-2xl font-bold tracking-tight">Aktivitas yang tercatat di panel admin</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Setiap baris menampilkan aktor, modul, tindakan, dan hasil yang dibaca langsung dari audit backend.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AppBadge tone={logsQuery.isError ? "warning" : "role"}>
              {logsPending ? "Memuat log..." : `${filteredLogs.length} log terbaca`}
            </AppBadge>
            {!logsPending && filteredLogs.length ? (
              <AppBadge tone="default">
                {pageStart}-{pageEnd} dari {filteredLogs.length}
              </AppBadge>
            ) : null}
            <AppBadge tone="default">Update {logsCheckedAt}</AppBadge>
          </div>
        </div>

        {logsQuery.isError ? (
          <div className="rounded-[28px] border border-dashed border-border bg-surface-container-lowest px-6 py-10 text-center">
            <Activity className="mx-auto size-10 text-role-accent" />
            <h3 className="mt-4 text-xl font-bold tracking-tight">Log live belum dapat dimuat</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {logsQuery.error instanceof Error
                ? logsQuery.error.message
                : "Terjadi kendala saat membaca audit backend."}
            </p>
            <div className="mt-6 flex justify-center">
              <AppButton variant="outline" onClick={() => logsQuery.refetch()}>
                Muat ulang log
              </AppButton>
            </div>
          </div>
        ) : logsPending ? (
          <div className="rounded-[28px] border border-dashed border-border bg-surface-container-lowest px-6 py-10 text-center">
            <Activity className="mx-auto size-10 animate-pulse text-role-accent" />
            <h3 className="mt-4 text-xl font-bold tracking-tight">Sedang membaca log live</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Aktivitas backend sedang diambil dari Supabase dan akan muncul otomatis setelah data siap.
            </p>
          </div>
        ) : filteredLogs.length ? (
          <>
            <AppTable className="table-fixed">
              <AppTableHead>
                <tr>
                  <AppTableHeaderCell className="w-[16%]">Waktu</AppTableHeaderCell>
                  <AppTableHeaderCell className="w-[18%]">Petugas</AppTableHeaderCell>
                  <AppTableHeaderCell className="w-[16%]">Modul</AppTableHeaderCell>
                  <AppTableHeaderCell className="w-[34%]">Aktivitas</AppTableHeaderCell>
                  <AppTableHeaderCell className="w-[10%]">Hasil</AppTableHeaderCell>
                  <AppTableHeaderCell className="w-[6%]">Detail</AppTableHeaderCell>
                </tr>
              </AppTableHead>
              <tbody>
                {currentPageLogs.map((item) => (
                  <AppTableRow key={item.id}>
                    <AppTableCell className="space-y-1">
                      <p className="font-semibold text-foreground">{formatActivityTime(item.timestamp)}</p>
                      <p className="text-xs text-muted-foreground">{formatActivityDate(item.timestamp)}</p>
                    </AppTableCell>
                    <AppTableCell className="space-y-1">
                      <div className="flex items-center gap-2">
                        <UserRound className="size-4 text-role-accent" />
                        <p className="font-semibold text-foreground">{item.actorLabel}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.actor}</p>
                    </AppTableCell>
                    <AppTableCell className="space-y-2">
                      <AppBadge tone="default">{item.module}</AppBadge>
                      <p className="text-xs leading-5 text-muted-foreground">{item.reference}</p>
                    </AppTableCell>
                    <AppTableCell className="space-y-2">
                      <p className="font-semibold text-foreground">{item.action}</p>
                      <p className="text-sm leading-6 text-muted-foreground">{item.summary}</p>
                    </AppTableCell>
                    <AppTableCell>
                      <AppBadge tone={item.tone}>{item.result}</AppBadge>
                    </AppTableCell>
                    <AppTableCell>
                      <AppButton size="sm" variant="outline" onClick={() => setSelectedLog(item)}>
                        Lihat
                      </AppButton>
                    </AppTableCell>
                  </AppTableRow>
                ))}
              </tbody>
            </AppTable>
            <div className="pt-2">
              <AppPagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        ) : (
          <div className="rounded-[28px] border border-dashed border-border bg-surface-container-lowest px-6 py-10 text-center">
            <Activity className="mx-auto size-10 text-role-accent" />
            <h3 className="mt-4 text-xl font-bold tracking-tight">Log belum ditemukan</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Coba ubah tanggal, modul, atau kata kunci pencarian. Kalau perlu, bersihkan semua filter untuk melihat seluruh catatan.
            </p>
            <div className="mt-6 flex justify-center">
              <AppButton variant="outline" onClick={resetFilters}>
                Bersihkan filter
              </AppButton>
            </div>
          </div>
        )}
      </AppCard>

      <AppDialog
        open={Boolean(selectedLog)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedLog(null);
          }
        }}
        title={selectedLog ? selectedLog.action : "Detail log"}
        description={selectedLog?.summary}
        className="max-w-3xl"
      >
        {selectedLog ? (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[24px] border border-border bg-surface-container-lowest p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Waktu
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {formatActivityTime(selectedLog.timestamp)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatActivityDate(selectedLog.timestamp)}
                </p>
              </div>
              <div className="rounded-[24px] border border-border bg-surface-container-lowest p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Petugas
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">{selectedLog.actorLabel}</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedLog.actor}</p>
              </div>
              <div className="rounded-[24px] border border-border bg-surface-container-lowest p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Modul
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">{selectedLog.module}</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedLog.reference}</p>
              </div>
              <div className="rounded-[24px] border border-border bg-surface-container-lowest p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Hasil
                </p>
                <div className="mt-2">
                  <AppBadge tone={selectedLog.tone}>{selectedLog.result}</AppBadge>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-border bg-surface-container-lowest p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Keterangan
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">{selectedLog.summary}</p>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Perubahan penting
              </p>
              <div className="space-y-3">
                {selectedLog.details.map((detail) => (
                  <div
                    key={detail}
                    className="rounded-[24px] border border-border bg-surface-container-lowest px-4 py-3 text-sm leading-6 text-muted-foreground"
                  >
                    {detail}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </AppDialog>
    </div>
  );
}
