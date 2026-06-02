"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { AppButton } from "@/components/ui/app-button";
import {
  AppDateFilter,
  type AppDateFilterValue,
  formatAppDateFilterLabel,
  getJakartaTodayKey,
} from "@/components/ui/app-date-filter";
import { AppFilterTrigger } from "@/components/ui/app-filter-trigger";
import { AppInput } from "@/components/ui/app-input";
import {
  AppSearchSelect,
  type AppSearchSelectOption,
} from "@/components/ui/app-search-select";
import { cn } from "@/lib/utils";

export type InternalWorkspaceFilterTab = {
  value: string;
  label: string;
};

export function InternalWorkspaceFilterBar({
  tabs,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
  dateFilter,
  onDateFilterChange,
  unitFilter,
  onUnitFilterChange,
  serviceFilter,
  onServiceFilterChange,
  unitOptions = [],
  serviceOptions = [],
  showAdvancedFilters,
  onToggleAdvancedFilters,
  allowProcessing,
  onResetFilters,
}: {
  tabs?: InternalWorkspaceFilterTab[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchPlaceholder: string;
  dateFilter: AppDateFilterValue;
  onDateFilterChange: (value: AppDateFilterValue) => void;
  unitFilter?: string;
  onUnitFilterChange?: (value: string) => void;
  serviceFilter?: string;
  onServiceFilterChange?: (value: string) => void;
  unitOptions?: AppSearchSelectOption[];
  serviceOptions?: AppSearchSelectOption[];
  showAdvancedFilters: boolean;
  onToggleAdvancedFilters: () => void;
  allowProcessing?: boolean;
  onResetFilters: () => void;
}) {
  const todayKey = getJakartaTodayKey();
  const dateFilterActive = !(
    dateFilter.startDate === todayKey && dateFilter.endDate === todayKey
  );
  const activeFilterCount =
    (dateFilterActive ? 1 : 0) +
    (unitFilter && unitFilter !== "all" ? 1 : 0) +
    (serviceFilter && serviceFilter !== "all" ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  return (
    <div className="space-y-4 rounded-[calc(var(--radius-2xl)+4px)] border border-border bg-surface-container-lowest p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {tabs?.length && activeTab && onTabChange ? (
          <div className="inline-flex w-full rounded-full border border-border bg-surface-container-low p-1 lg:w-auto">
            {tabs.map((tab) => {
              const active = tab.value === activeTab;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => onTabChange(tab.value)}
                  className={cn(
                    "min-h-10 flex-1 rounded-full px-4 text-sm font-semibold transition-colors lg:flex-none",
                    active
                      ? "bg-surface-container-lowest text-role-accent shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : <div />}

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
          placeholder={searchPlaceholder}
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
        <div
          className={cn(
            "grid gap-3 border-t border-border/80 pt-4",
            unitFilter !== undefined && onUnitFilterChange
              ? "md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]"
              : "md:grid-cols-[minmax(0,1fr)_220px]",
          )}
        >
          {unitFilter !== undefined && onUnitFilterChange ? (
            <AppSearchSelect
              value={unitFilter}
              onValueChange={onUnitFilterChange}
              options={[{ value: "all", label: "Semua Unit Organisasi" }, ...unitOptions]}
              placeholder="Semua Unit Organisasi"
              searchPlaceholder="Cari unit organisasi"
              emptyMessage="Unit organisasi tidak ditemukan."
              className="w-full"
            />
          ) : null}

          {serviceFilter !== undefined && onServiceFilterChange ? (
            <AppSearchSelect
              value={serviceFilter}
              onValueChange={onServiceFilterChange}
              options={[{ value: "all", label: "Semua Layanan" }, ...serviceOptions]}
              placeholder="Semua Layanan"
              searchPlaceholder="Cari layanan"
              emptyMessage="Layanan tidak ditemukan."
              className="w-full"
            />
          ) : null}

          <div className="flex items-center justify-end xl:justify-start">
            <AppButton size="sm" variant="ghost" onClick={onResetFilters}>
              Reset filter
            </AppButton>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {activeFilterCount ? (
          <>
            <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
              {formatAppDateFilterLabel(dateFilter)}
            </span>
            {unitFilter && unitFilter !== "all" ? (
              <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
                {unitOptions.find((option) => option.value === unitFilter)?.label || "Unit terpilih"}
              </span>
            ) : null}
            {serviceFilter && serviceFilter !== "all" ? (
              <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
                {serviceOptions.find((option) => option.value === serviceFilter)?.label || "Layanan terpilih"}
              </span>
            ) : null}
            {searchQuery.trim() ? (
              <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
                Cari: {searchQuery.trim()}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold text-role-accent transition-colors hover:bg-role-accent-soft"
            >
              Bersihkan
            </button>
          </>
        ) : null}
      </div>

      {allowProcessing === false ? (
        <p className="rounded-[var(--radius-xl)] border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900/80">
          Tanggal selain hari ini hanya untuk melihat data. Check-in aktif untuk antrean hari ini.
        </p>
      ) : null}
    </div>
  );
}
