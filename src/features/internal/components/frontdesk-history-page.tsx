"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { AppPageIntro } from "@/components/composite/app-page-intro";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { getJakartaTodayKey } from "@/components/ui/app-date-filter";
import { AppPagination } from "@/components/ui/app-pagination";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import {
  AppTable,
  AppTableCell,
  AppTableHead,
  AppTableHeaderCell,
  AppTableRow,
} from "@/components/ui/app-table";
import { FrontdeskFilterBar } from "@/features/internal/components/frontdesk-filter-bar";
import {
  resolveFrontdeskAttendanceTone,
  resolveFrontdeskQueueTone,
} from "@/features/internal/components/frontdesk-row-utils";
import { useFrontdeskSettings } from "@/features/internal/use-frontdesk-settings";
import { useFrontdeskWorkspace } from "@/features/internal/use-frontdesk-workspace";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { STAFF_CANONICAL_ROUTES } from "@/lib/internal-role-policy";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";

export function FrontdeskHistoryPage() {
  const {
    live,
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
  } = useFrontdeskWorkspace("riwayat");
  const { settings } = useFrontdeskSettings();
  const pagination = useClientPagination(filteredRows, 10);

  function handleExportHistory() {
    if (!filteredRows.length) {
      toast.error("Belum ada data riwayat sesuai filter yang diterapkan.");
      return;
    }

    const header = [
      "No Antrean",
      "Pengunjung",
      "NIK",
      "Layanan",
      "Unit",
      "Status Kehadiran",
      "Status Antrian",
      "Keterangan",
      "Tanggal",
    ];
    const rowsToExport = filteredRows.map((row) => [
      formatQueueNumberForDisplay(row.queueNumber),
      row.userName,
      row.userNik,
      row.serviceTitle,
      row.unitLabel,
      row.attendanceStatusLabel,
      row.queueStatusLabel,
      row.note,
      row.date,
    ]);
    const csv = [header, ...rowsToExport]
      .map((columns) =>
        columns
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `riwayat-resepsionis-${getJakartaTodayKey()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success(`${filteredRows.length} data riwayat sesuai filter berhasil diekspor.`);
  }

  return (
    <DashboardShell
      role="resepsionis"
      currentPath={STAFF_CANONICAL_ROUTES.resepsionis.history}
      title="Riwayat Resepsionis"
      subtitle="Telusuri antrean selesai, tidak diproses, batal, dan tidak hadir"
    >
      <div className="space-y-8">
        <AppPageIntro
          eyebrow="Riwayat Layanan"
          title="Jejak antrean yang sudah diproses"
          description="Gunakan riwayat untuk membaca pola kehadiran, membandingkan hasil check-in, dan melihat kasus yang selesai, tidak diproses, atau perlu ditindaklanjuti."
          actions={
            <AppButton onClick={handleExportHistory}>
              <Download className="size-4" />
              Ekspor Riwayat
            </AppButton>
          }
        />

        <div
          className={`grid gap-6 md:grid-cols-2 ${
            stats.length > 4 ? "xl:grid-cols-5" : "xl:grid-cols-4"
          }`}
        >
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
          <p className="text-sm leading-6 text-muted-foreground">Data riwayat belum bisa dimuat.</p>
        ) : null}

        <div className="space-y-4">
          <FrontdeskFilterBar
            section={section}
            onSectionChange={setSection}
            activeCount={activeCount}
            historyCount={historyCount}
            showSectionTabs={false}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
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
            Riwayat antrean
          </p>

          <AppTable className="w-full table-fixed [&_th]:whitespace-normal">
            <AppTableHead>
              <tr>
                <AppTableHeaderCell className="w-[10%]">No. Antrean</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[12%]">Pengunjung</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[12%]">NIK</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[16%]">Layanan</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[12%]">Status Kehadiran</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[17%]">Status Antrian</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[21%]">Keterangan</AppTableHeaderCell>
              </tr>
            </AppTableHead>
            <tbody>
              {pagination.pageItems.length ? (
                pagination.pageItems.map((row) => (
                  <AppTableRow key={row.appointmentId}>
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
                  </AppTableRow>
                ))
              ) : (
                <AppTableRow>
                  <AppTableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Belum ada riwayat antrean untuk filter ini.
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
              itemLabel="riwayat"
            />
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}
