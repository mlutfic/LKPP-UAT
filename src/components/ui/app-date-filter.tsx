"use client";

import * as React from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { AppButton } from "@/components/ui/app-button";
import { cn } from "@/lib/utils";

export type AppDateFilterPreset =
  | "today"
  | "yesterday"
  | "tomorrow"
  | "thisWeek"
  | "last7Days"
  | "thisMonth"
  | "last30Days"
  | "last90Days"
  | "custom";

export type AppDateFilterValue = {
  preset: AppDateFilterPreset;
  startDate: string;
  endDate: string;
  anchorDate: string;
};

export type AppDateFilterMode = "range" | "single";

const JAKARTA_DATE_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Jakarta",
});

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const RANGE_LABEL_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const PRESET_LABELS: Record<AppDateFilterPreset, string> = {
  today: "Hari Ini",
  yesterday: "Kemarin",
  tomorrow: "Besok",
  thisWeek: "Minggu Ini",
  last7Days: "1 Minggu Terakhir",
  thisMonth: "Bulan Ini",
  last30Days: "1 Bulan Terakhir",
  last90Days: "3 Bulan Terakhir",
  custom: "Kalender",
};

const WEEKDAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const ACTIVE_SURFACE_CLASS =
  "border-role-accent/18 bg-role-accent-soft text-role-accent-strong";
const ACTIVE_SOLID_CLASS =
  "bg-primary text-primary-foreground font-semibold shadow-(--shadow-soft)";

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

function startOfMonth(dateKey: string) {
  const date = dateKeyToUtcDate(dateKey);
  date.setUTCDate(1);
  return utcDateToKey(date);
}

function shiftMonthKey(dateKey: string, offsetMonths: number) {
  const date = dateKeyToUtcDate(startOfMonth(dateKey));
  date.setUTCMonth(date.getUTCMonth() + offsetMonths, 1);
  return utcDateToKey(date);
}

function endOfMonth(dateKey: string) {
  const date = dateKeyToUtcDate(dateKey);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return utcDateToKey(date);
}

function startOfWeek(dateKey: string) {
  const date = dateKeyToUtcDate(dateKey);
  const weekDay = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekDay);
  return utcDateToKey(date);
}

function endOfWeek(dateKey: string) {
  const start = dateKeyToUtcDate(startOfWeek(dateKey));
  start.setUTCDate(start.getUTCDate() + 6);
  return utcDateToKey(start);
}

function compareDateKeys(left: string, right: string) {
  return left.localeCompare(right);
}

function formatDateKeyLabel(dateKey: string) {
  return DAY_LABEL_FORMATTER.format(dateKeyToUtcDate(dateKey));
}

function formatRangeLabel(startDate: string, endDate: string) {
  const startLabel = RANGE_LABEL_FORMATTER.format(dateKeyToUtcDate(startDate));
  const endLabel = RANGE_LABEL_FORMATTER.format(dateKeyToUtcDate(endDate));
  return `${startLabel} - ${endLabel}`;
}

function createCustomDateFilterValue(
  startDate: string,
  endDate: string,
  anchorDate = endDate,
): AppDateFilterValue {
  const normalizedStart =
    compareDateKeys(startDate, endDate) <= 0 ? startDate : endDate;
  const normalizedEnd =
    compareDateKeys(startDate, endDate) <= 0 ? endDate : startDate;

  return {
    preset: "custom",
    startDate: normalizedStart,
    endDate: normalizedEnd,
    anchorDate,
  };
}

export function getJakartaTodayKey() {
  return JAKARTA_DATE_FORMATTER.format(new Date());
}

export function createAppDateFilterValue(
  preset: AppDateFilterPreset,
  anchorDate = getJakartaTodayKey(),
): AppDateFilterValue {
  const today = getJakartaTodayKey();

  switch (preset) {
    case "today":
      return { preset, startDate: today, endDate: today, anchorDate: today };
    case "yesterday": {
      const date = shiftDateKey(today, -1);
      return { preset, startDate: date, endDate: date, anchorDate: date };
    }
    case "tomorrow": {
      const date = shiftDateKey(today, 1);
      return { preset, startDate: date, endDate: date, anchorDate: date };
    }
    case "thisWeek":
      return {
        preset,
        startDate: startOfWeek(today),
        endDate: endOfWeek(today),
        anchorDate: today,
      };
    case "last7Days":
      return {
        preset,
        startDate: shiftDateKey(today, -6),
        endDate: today,
        anchorDate: today,
      };
    case "thisMonth":
      return {
        preset,
        startDate: startOfMonth(today),
        endDate: endOfMonth(today),
        anchorDate: today,
      };
    case "last30Days":
      return {
        preset,
        startDate: shiftDateKey(today, -29),
        endDate: today,
        anchorDate: today,
      };
    case "last90Days":
      return {
        preset,
        startDate: shiftDateKey(today, -89),
        endDate: today,
        anchorDate: today,
      };
    case "custom":
    default:
      return {
        preset: "custom",
        startDate: anchorDate,
        endDate: anchorDate,
        anchorDate,
      };
  }
}

export function formatAppDateFilterLabel(value: AppDateFilterValue) {
  if (value.preset === "today") return PRESET_LABELS.today;
  if (value.preset === "yesterday") return PRESET_LABELS.yesterday;
  if (value.preset === "tomorrow") return PRESET_LABELS.tomorrow;
  if (value.startDate === value.endDate) {
    return `Kalender • ${formatDateKeyLabel(value.startDate)}`;
  }
  return formatRangeLabel(value.startDate, value.endDate);
}

export function isDateWithinAppDateFilter(dateKey: string, value: AppDateFilterValue) {
  return (
    compareDateKeys(dateKey, value.startDate) >= 0 &&
    compareDateKeys(dateKey, value.endDate) <= 0
  );
}

function buildCalendarCells(monthAnchorKey: string) {
  const monthStart = startOfMonth(monthAnchorKey);
  const gridStart = startOfWeek(monthStart);

  return Array.from({ length: 42 }, (_, index) => {
    const dateKey = shiftDateKey(gridStart, index);
    return {
      dateKey,
      inCurrentMonth: startOfMonth(dateKey) === monthStart,
    };
  });
}

export function AppDateFilter({
  value,
  onChange,
  id,
  mode = "range",
  disabled = false,
  className,
  buttonClassName,
}: {
  value: AppDateFilterValue;
  onChange: (value: AppDateFilterValue) => void;
  id?: string;
  mode?: AppDateFilterMode;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
}) {
  const isSingleDateMode = mode === "single";
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [visibleMonthKey, setVisibleMonthKey] = React.useState(startOfMonth(value.anchorDate));
  const [pendingRangeStart, setPendingRangeStart] = React.useState<string | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [offsetX, setOffsetX] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;

    setDraft(value);
    setVisibleMonthKey(startOfMonth(value.anchorDate));
    setPendingRangeStart(null);
  }, [open, value]);

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (!open) return;

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  React.useEffect(() => {
    function reposition() {
      if (!open || !rootRef.current || !panelRef.current) return;

      const viewportPadding = 16;
      const triggerRect = rootRef.current.getBoundingClientRect();
      const panelRect = panelRef.current.getBoundingClientRect();

      let nextOffset = 0;

      const overflowRight =
        triggerRect.left + panelRect.width - (window.innerWidth - viewportPadding);
      if (overflowRight > 0) {
        nextOffset -= overflowRight;
      }

      const overflowLeft = triggerRect.left + nextOffset - viewportPadding;
      if (overflowLeft < 0) {
        nextOffset -= overflowLeft;
      }

      setOffsetX(nextOffset);
    }

    if (!open) return;

    const frame = window.requestAnimationFrame(reposition);
    window.addEventListener("resize", reposition);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", reposition);
    };
  }, [open, visibleMonthKey]);

  const calendarCells = React.useMemo(
    () => buildCalendarCells(visibleMonthKey),
    [visibleMonthKey],
  );

  const triggerActive = open || value.preset !== "today";
  const triggerLabel = isSingleDateMode
    ? value.startDate
      ? value.preset === "today"
        ? `${PRESET_LABELS.today} • ${formatDateKeyLabel(value.startDate)}`
        : `${PRESET_LABELS.custom} • ${formatDateKeyLabel(value.startDate)}`
      : PRESET_LABELS.custom
    : formatAppDateFilterLabel(value);

  function updateDraftPreset(preset: AppDateFilterPreset) {
    const next = createAppDateFilterValue(preset, draft.anchorDate || getJakartaTodayKey());
    setDraft(next);
    setVisibleMonthKey(startOfMonth(next.anchorDate));
    setPendingRangeStart(null);
  }

  function applyDraft() {
    onChange(draft);
    setPendingRangeStart(null);
    setOpen(false);
  }

  function handleSelectDate(dateKey: string) {
    if (isSingleDateMode) {
      const next = createAppDateFilterValue("custom", dateKey);
      setDraft(next);
      setVisibleMonthKey(startOfMonth(dateKey));
      onChange(next);
      setOpen(false);
      return;
    }

    if (!pendingRangeStart) {
      const next = createCustomDateFilterValue(dateKey, dateKey, dateKey);
      setDraft(next);
      setVisibleMonthKey(startOfMonth(dateKey));
      setPendingRangeStart(dateKey);
      return;
    }

    const next = createCustomDateFilterValue(pendingRangeStart, dateKey, dateKey);
    setDraft(next);
    setVisibleMonthKey(startOfMonth(dateKey));
    setPendingRangeStart(null);
  }

  const activeRangeLabel = React.useMemo(() => {
    if (isSingleDateMode) {
      return formatAppDateFilterLabel(draft);
    }

    if (pendingRangeStart) {
      return `${formatDateKeyLabel(pendingRangeStart)} - pilih tanggal akhir`;
    }

    return formatAppDateFilterLabel(draft);
  }, [draft, isSingleDateMode, pendingRangeStart]);
  const intervalStartLabel = React.useMemo(
    () => formatDateKeyLabel(draft.startDate),
    [draft.startDate],
  );
  const intervalEndLabel = React.useMemo(
    () =>
      pendingRangeStart
        ? "Pilih tanggal akhir"
        : formatDateKeyLabel(draft.endDate),
    [draft.endDate, pendingRangeStart],
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={cn(
          "inline-flex h-11 min-w-[220px] items-center gap-2 rounded-[var(--radius-2xl)] border px-4 text-sm font-semibold transition-colors",
          buttonClassName,
          triggerActive
            ? ACTIVE_SURFACE_CLASS
            : "border-border bg-surface-container-lowest text-foreground hover:bg-surface-container-low",
          disabled && "cursor-not-allowed border-border/60 bg-surface-container-low/60 text-muted-foreground",
        )}
        disabled={disabled}
      >
        <CalendarDays className="size-4" />
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className="ml-auto size-4 opacity-60" />
      </button>

      {open ? (
        <div
          ref={panelRef}
          className={cn(
            "absolute left-0 top-[calc(100%+0.75rem)] z-(--z-popover) rounded-[calc(var(--radius-2xl)+4px)] border border-border bg-popover shadow-(--shadow-float)",
            isSingleDateMode
              ? "w-[min(28rem,calc(100vw-2rem))]"
              : "w-[min(44rem,calc(100vw-2rem))]",
          )}
          style={{ transform: `translateX(${offsetX}px)` }}
        >
          <div className={cn("grid gap-0", isSingleDateMode ? "" : "md:grid-cols-[220px_minmax(0,1fr)]")}>
            {!isSingleDateMode ? (
              <div className="border-b border-border p-4 md:border-b-0 md:border-r">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Semua Waktu
                </p>
                <div className="space-y-1">
                  {(Object.keys(PRESET_LABELS) as AppDateFilterPreset[]).map((preset) => {
                    const active = draft.preset === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => updateDraftPreset(preset)}
                        className={cn(
                          "flex min-h-10 w-full items-center rounded-[var(--radius-xl)] border border-transparent px-3 text-left text-sm font-medium transition-colors",
                          active
                            ? ACTIVE_SURFACE_CLASS
                            : "text-foreground hover:bg-surface-container-low",
                        )}
                      >
                        {PRESET_LABELS[preset]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setVisibleMonthKey(shiftMonthKey(visibleMonthKey, -1))}
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface-container-lowest text-foreground transition-colors hover:bg-surface-container-low"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <p className="text-lg font-semibold text-foreground">
                  {MONTH_LABEL_FORMATTER.format(dateKeyToUtcDate(visibleMonthKey))}
                </p>
                <button
                  type="button"
                  onClick={() => setVisibleMonthKey(shiftMonthKey(visibleMonthKey, 1))}
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface-container-lowest text-foreground transition-colors hover:bg-surface-container-low"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {!isSingleDateMode ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingRangeStart(null);
                      setVisibleMonthKey(startOfMonth(draft.startDate || draft.anchorDate));
                    }}
                    className={cn(
                      "rounded-[var(--radius-xl)] border px-4 py-3 text-left transition-colors",
                      !pendingRangeStart
                        ? ACTIVE_SURFACE_CLASS
                        : "border-border bg-surface-container-lowest hover:bg-surface-container-low",
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Dari
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {intervalStartLabel}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingRangeStart(draft.startDate || draft.anchorDate);
                      setVisibleMonthKey(
                        startOfMonth(draft.endDate || draft.startDate || draft.anchorDate),
                      );
                    }}
                    className={cn(
                      "rounded-[var(--radius-xl)] border px-4 py-3 text-left transition-colors",
                      pendingRangeStart
                        ? ACTIVE_SURFACE_CLASS
                        : "border-border bg-surface-container-lowest hover:bg-surface-container-low",
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Sampai
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {intervalEndLabel}
                    </p>
                  </button>
                </div>
              ) : null}

              <div className="grid grid-cols-7 gap-2">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="flex h-9 items-center justify-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    {label}
                  </div>
                ))}
                {calendarCells.map((cell) => {
                  const inRange = isDateWithinAppDateFilter(cell.dateKey, draft);
                  const selected = isSingleDateMode
                    ? cell.dateKey === draft.startDate
                    : cell.dateKey === draft.startDate || cell.dateKey === draft.endDate;
                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => {
                        handleSelectDate(cell.dateKey);
                      }}
                      className={cn(
                        "flex h-11 items-center justify-center rounded-xl text-sm font-medium transition-colors",
                        selected
                          ? ACTIVE_SOLID_CLASS
                          : inRange
                            ? ACTIVE_SURFACE_CLASS
                            : cell.inCurrentMonth
                              ? "text-foreground hover:bg-surface-container-low"
                              : "text-muted-foreground/55 hover:bg-surface-container-low",
                      )}
                    >
                      {Number(cell.dateKey.slice(-2))}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {isSingleDateMode
                      ? "Tanggal aktif"
                      : pendingRangeStart
                        ? "Pilih tanggal sampai"
                        : "Rentang aktif"}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {activeRangeLabel}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {!isSingleDateMode ? (
                    <>
                      <AppButton
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const next = createAppDateFilterValue("today");
                          setDraft(next);
                          setVisibleMonthKey(startOfMonth(next.anchorDate));
                          setPendingRangeStart(null);
                        }}
                      >
                        Hari Ini
                      </AppButton>
                      <AppButton size="sm" onClick={applyDraft}>
                        Terapkan
                      </AppButton>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
