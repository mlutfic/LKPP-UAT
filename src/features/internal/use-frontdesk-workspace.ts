"use client";

import * as React from "react";

import {
  createAppDateFilterValue,
  getJakartaTodayKey,
  isDateWithinAppDateFilter,
  type AppDateFilterValue,
} from "@/components/ui/app-date-filter";
import { type AppSearchSelectOption } from "@/components/ui/app-search-select";
import {
  bookingServices,
  bookingUnitEntries,
} from "@/content/service-booking-content";
import {
  buildFrontdeskRows,
  buildFrontdeskFallbackRows,
  type FrontdeskRow,
} from "@/features/internal/components/frontdesk-row-utils";
import {
  getInternalPageConfig,
  type InternalPageKey,
} from "@/features/internal/internal-workspace-config";
import { useLiveStaffAppointments } from "@/features/internal/use-live-staff-appointments";
import { useHydrated } from "@/hooks/use-hydrated";
import { buildQueueNumberSearchTokens } from "@/lib/queue-number";

type FrontdeskPage = Extract<InternalPageKey, "dashboard" | "riwayat">;
type FrontdeskFilterSection = "active" | "history";

function resolveFrontdeskHistoryOutcome(row: FrontdeskRow) {
  return row.finalStatusLabel;
}

function buildFrontdeskStats(
  page: FrontdeskPage,
  dateScopedRows: FrontdeskRow[],
  fallbackStats: NonNullable<ReturnType<typeof getInternalPageConfig>>["stats"] | undefined,
  allowFallbackStats: boolean,
) {
  if (!dateScopedRows.length) {
    if (allowFallbackStats) {
      return fallbackStats ?? [];
    }

    if (page === "riwayat") {
      return [
        {
          label: "Total",
          value: "0",
          description: "Seluruh antrean yang tercatat hari ini.",
        },
        {
          label: "Selesai",
          value: "0",
          description: "Ditutup tanpa kendala.",
          tone: "success" as const,
        },
        {
          label: "Tidak Diproses",
          value: "0",
          description: "Hari layanan berganti sebelum antrean selesai diproses.",
          tone: "warning" as const,
        },
        {
          label: "Batal",
          value: "0",
          description: "Tidak dilanjutkan ke unit.",
          tone: "warning" as const,
        },
        {
          label: "Tidak Hadir",
          value: "0",
          description: "Lewat slot kehadiran.",
          tone: "neutral" as const,
        },
      ];
    }

    return [
      {
        label: "Belum Check-in",
        value: "0",
        description: "Belum hadir di frontdesk.",
      },
      {
        label: "Sudah Hadir",
        value: "0",
        description: "Siap diarahkan ke unit.",
        tone: "info" as const,
      },
      {
        label: "Dipanggil Unit",
        value: "0",
        description: "Sedang ditangani unit.",
        tone: "warning" as const,
      },
      {
        label: "Selesai",
        value: "0",
        description: "Layanan tuntas hari ini.",
        tone: "success" as const,
      },
    ];
  }

  const countBy = (predicate: (row: FrontdeskRow) => boolean) =>
    String(dateScopedRows.filter(predicate).length);
  const countHistoryBy = (predicate: (row: FrontdeskRow) => boolean) =>
    String(dateScopedRows.filter(predicate).length);

  if (page === "riwayat") {
    return [
      {
        label: "Total",
        value: String(dateScopedRows.length),
        description: "Seluruh antrean yang tercatat hari ini.",
      },
      {
        label: "Selesai",
        value: countHistoryBy(
          (row) => resolveFrontdeskHistoryOutcome(row) === "Selesai",
        ),
        description: "Ditutup tanpa kendala.",
        tone: "success" as const,
      },
      {
        label: "Tidak Diproses",
        value: countHistoryBy(
          (row) => resolveFrontdeskHistoryOutcome(row) === "Tidak Diproses",
        ),
        description: "Hari layanan berganti sebelum antrean selesai diproses.",
        tone: "warning" as const,
      },
      {
        label: "Batal",
        value: countHistoryBy(
          (row) =>
            resolveFrontdeskHistoryOutcome(row) === "Tidak Aktif" ||
            (row.statusLabel === "Pindah Layanan / Eskalasi" && !row.finalStatusLabel),
        ),
        description: "Tidak dilanjutkan ke unit awal.",
        tone: "warning" as const,
      },
      {
        label: "Tidak Hadir",
        value: countHistoryBy(
          (row) => resolveFrontdeskHistoryOutcome(row) === "Tidak Hadir",
        ),
        description: "Lewat slot kehadiran.",
        tone: "neutral" as const,
      },
    ];
  }

  return [
    {
      label: "Belum Check-in",
      value: countBy((row) => row.statusLabel === "Belum Check-in"),
      description: "Belum hadir di frontdesk.",
    },
    {
      label: "Sudah Hadir",
      value: countBy((row) => row.statusLabel === "Sudah Hadir"),
      description: "Siap diarahkan ke unit.",
      tone: "info" as const,
    },
    {
      label: "Dipanggil Unit",
      value: countBy((row) => row.statusLabel === "Dipanggil Unit"),
      description: "Sedang ditangani unit.",
      tone: "warning" as const,
    },
    {
      label: "Selesai",
      value: countBy((row) => resolveFrontdeskHistoryOutcome(row) === "Selesai"),
      description: "Layanan tuntas hari ini.",
      tone: "success" as const,
    },
  ];
}

export function useFrontdeskWorkspace(page: FrontdeskPage) {
  const hydrated = useHydrated();
  const live = useLiveStaffAppointments();
  const config =
    getInternalPageConfig("resepsionis", page) ??
    getInternalPageConfig("resepsionis", "dashboard");

  const [section, setSection] = React.useState<FrontdeskFilterSection>(
    page === "riwayat" ? "history" : "active",
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<AppDateFilterValue>(() =>
    createAppDateFilterValue("today"),
  );
  const [unitFilter, setUnitFilter] = React.useState("all");
  const [serviceFilter, setServiceFilter] = React.useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const effectiveSection: FrontdeskFilterSection =
    page === "riwayat" ? "history" : section;

  const rows = React.useMemo(() => {
    if (!hydrated) {
      return [] as FrontdeskRow[];
    }

    if (live.isLiveSession) {
      return live.appointments ? buildFrontdeskRows(live.appointments) : [];
    }

    if (live.appointments) {
      return buildFrontdeskRows(live.appointments);
    }

    return buildFrontdeskFallbackRows(config?.rows);
  }, [config?.rows, hydrated, live.appointments, live.isLiveSession]);

  const allowFallbackStats = hydrated && !live.isLiveSession;

  const todayKey = React.useMemo(() => getJakartaTodayKey(), []);
  const allowProcessing =
    dateFilter.startDate === todayKey && dateFilter.endDate === todayKey;

  const unitOptions = React.useMemo<AppSearchSelectOption[]>(
    () =>
      bookingUnitEntries.map((entry) => ({
        value: entry.id,
        label: entry.label,
        keywords: [entry.id, entry.groupLabel, entry.description],
      })),
    [],
  );

  const serviceOptions = React.useMemo<AppSearchSelectOption[]>(() => {
    return bookingServices
      .filter((service) => unitFilter === "all" || service.unitId === unitFilter)
      .map((service) => ({
        value: service.id,
        label: service.title,
        keywords: [
          service.id,
          service.unitLabel,
          service.groupLabel,
          service.description,
        ],
      }));
  }, [unitFilter]);

  const filteredRows = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
      if (row.section !== effectiveSection) {
        return false;
      }

      const rowDate = row.date || getJakartaTodayKey();
      if (!isDateWithinAppDateFilter(rowDate, dateFilter)) {
        return false;
      }

      if (unitFilter !== "all" && row.unitId !== unitFilter) {
        return false;
      }

      if (serviceFilter !== "all" && row.serviceId !== serviceFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        ...buildQueueNumberSearchTokens(row.queueNumber),
        row.userName,
        row.userNik,
        row.serviceTitle,
        row.unitLabel,
        row.attendanceStatusLabel,
        row.queueStatusLabel,
        row.note,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [dateFilter, effectiveSection, rows, searchQuery, serviceFilter, unitFilter]);

  const dateScopedRows = React.useMemo(() => {
    return rows.filter((row) => {
      const rowDate = row.date || getJakartaTodayKey();
      return isDateWithinAppDateFilter(rowDate, dateFilter);
    });
  }, [dateFilter, rows]);
  const historyDateScopedRows = React.useMemo(
    () => dateScopedRows.filter((row) => row.section === "history"),
    [dateScopedRows],
  );

  const activeCount = React.useMemo(
    () => dateScopedRows.filter((row) => row.section === "active").length,
    [dateScopedRows],
  );
  const historyCount = React.useMemo(
    () => dateScopedRows.filter((row) => row.section === "history").length,
    [dateScopedRows],
  );

  const stats = React.useMemo(
    () =>
      buildFrontdeskStats(
        page,
        page === "riwayat" ? historyDateScopedRows : dateScopedRows,
        config?.stats,
        allowFallbackStats,
      ),
    [allowFallbackStats, config?.stats, dateScopedRows, historyDateScopedRows, page],
  );

  const resetFilters = React.useCallback(() => {
    setSearchQuery("");
    setDateFilter(createAppDateFilterValue("today"));
    setUnitFilter("all");
    setServiceFilter("all");
  }, []);

  return {
    live,
    config,
    rows,
    filteredRows,
    stats,
    section: effectiveSection,
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
  };
}
