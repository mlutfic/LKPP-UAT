"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthSessionQuery } from "@/features/auth/hooks/use-auth-session-query";
import { AppButton } from "@/components/ui/app-button";
import {
  AppCard,
  AppCardDescription,
  AppCardTitle,
} from "@/components/ui/app-card";
import { AppCheckbox } from "@/components/ui/app-checkbox";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppInput } from "@/components/ui/app-input";
import { AppStatCard } from "@/components/ui/app-stat-card";
import {
  AppDateFilter,
  getJakartaTodayKey,
} from "@/components/ui/app-date-filter";
import { AdminFormField } from "@/features/internal/components/admin-editor-section";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  getSettings,
  updateAdminSettings,
} from "@/lib/api/admin-settings";
import { cn } from "@/lib/utils";

const OPERATING_DAY_OPTIONS = [
  { value: 1, label: "Senin", shortLabel: "Sen" },
  { value: 2, label: "Selasa", shortLabel: "Sel" },
  { value: 3, label: "Rabu", shortLabel: "Rab" },
  { value: 4, label: "Kamis", shortLabel: "Kam" },
  { value: 5, label: "Jumat", shortLabel: "Jum" },
  { value: 6, label: "Sabtu", shortLabel: "Sab" },
  { value: 0, label: "Minggu", shortLabel: "Min" },
] as const;

type OperationalHolidayEntry = {
  date: string;
  label: string;
};

type AdminOperationalSettingsDraft = {
  operatingHours: {
    start: string;
    end: string;
  };
  breakHours: {
    start: string;
    end: string;
  };
  operatingDays: number[];
  maxAdvanceBookingDays: string;
  holidays: OperationalHolidayEntry[];
};

type OperationalFieldErrors = {
  start?: string;
  end?: string;
  breakStart?: string;
  breakEnd?: string;
  operatingDays?: string;
  maxAdvanceBookingDays?: string;
};

type HolidayBulkCancellationSummary = {
  addedDates: string[];
  cancelledCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeTimeInputValue(value: unknown, fallback = "") {
  const normalized = asString(value, fallback).trim().replace(/\./g, ":");
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) {
    return fallback;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return fallback;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function sortHolidayEntries(entries: OperationalHolidayEntry[]) {
  return [...entries].sort((left, right) => left.date.localeCompare(right.date));
}

function addDaysByUtc(dateKey: string, offset = 1) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function dateRangeInclusive(startDateKey: string, endDateKey: string) {
  if (startDateKey > endDateKey) {
    const swappedStart = endDateKey;
    const swappedEnd = startDateKey;
    return dateRangeInclusive(swappedStart, swappedEnd);
  }

  const dates: string[] = [];
  let current = startDateKey;

  while (current <= endDateKey) {
    dates.push(current);
    current = addDaysByUtc(current, 1);
  }

  return dates;
}

function readTimeSetting(
  root: Record<string, unknown>,
  nested: Record<string, unknown>,
  keys: {
    camel: string;
    snake: string;
  },
) {
  return normalizeTimeInputValue(
    nested.start ??
      nested.start_time ??
      root[keys.camel] ??
      root[keys.snake],
    "",
  );
}

function readTimeSettingEnd(
  root: Record<string, unknown>,
  nested: Record<string, unknown>,
  keys: {
    camel: string;
    snake: string;
  },
) {
  return normalizeTimeInputValue(
    nested.end ??
      nested.end_time ??
      root[keys.camel] ??
      root[keys.snake],
    "",
  );
}

function normalizeOperationalSettings(settings: unknown): AdminOperationalSettingsDraft {
  const root = isRecord(settings) ? settings : {};
  const operatingHoursCandidate = root.operatingHours ?? root.operating_hours;
  const operatingHoursRoot = isRecord(operatingHoursCandidate) ? operatingHoursCandidate : {};
  const breakHoursCandidate = root.breakHours ?? root.break_hours;
  const breakHoursRoot = isRecord(breakHoursCandidate) ? breakHoursCandidate : {};
  const operatingDaysValue = root.operatingDays ?? root.operating_days;
  const operatingDaySet = new Set(
    Array.isArray(operatingDaysValue)
      ? operatingDaysValue.filter(
          (entry): entry is number => typeof entry === "number",
        )
      : [1, 2, 3, 4, 5],
  );
  const holidayLabelsCandidate = root.holidayLabels ?? root.holiday_labels;
  const holidayLabelsRoot = isRecord(holidayLabelsCandidate) ? holidayLabelsCandidate : {};
  const holidays = Array.isArray(root.holidays)
    ? root.holidays
        .filter((entry): entry is string => typeof entry === "string" && entry.length >= 10)
        .map((date) => ({
          date,
          label: asString(holidayLabelsRoot[date]).trim(),
        }))
    : [];

  return {
    operatingHours: {
      start:
        readTimeSetting(root, operatingHoursRoot, {
          camel: "operatingStart",
          snake: "operating_start",
        }) || "08:00",
      end:
        readTimeSettingEnd(root, operatingHoursRoot, {
          camel: "operatingEnd",
          snake: "operating_end",
        }) || "15:00",
    },
    breakHours: {
      start: readTimeSetting(root, breakHoursRoot, {
        camel: "breakStart",
        snake: "break_start",
      }),
      end: readTimeSettingEnd(root, breakHoursRoot, {
        camel: "breakEnd",
        snake: "break_end",
      }),
    },
    operatingDays: OPERATING_DAY_OPTIONS
      .filter((option) => operatingDaySet.has(option.value))
      .map((option) => option.value),
    maxAdvanceBookingDays: String(
      asNumber(root.maxAdvanceBookingDays ?? root.max_advance_booking_days, 14),
    ),
    holidays: sortHolidayEntries(holidays),
  };
}

function serializeOperationalSettings(draft: AdminOperationalSettingsDraft) {
  const maxAdvanceBookingDays = Number.parseInt(draft.maxAdvanceBookingDays, 10);
  const operatingHours = {
    start: draft.operatingHours.start,
    end: draft.operatingHours.end,
  };
  const operatingHoursLegacy = {
    start: draft.operatingHours.start,
    end: draft.operatingHours.end,
    start_time: draft.operatingHours.start,
    end_time: draft.operatingHours.end,
  };
  const breakHours =
    draft.breakHours.start && draft.breakHours.end
      ? {
          start: draft.breakHours.start,
          end: draft.breakHours.end,
        }
      : null;
  const breakHoursLegacy = breakHours
    ? {
        start: breakHours.start,
        end: breakHours.end,
        start_time: breakHours.start,
        end_time: breakHours.end,
      }
    : null;
  const operatingDays = [...draft.operatingDays].sort((left, right) => left - right);
  const holidays = draft.holidays.map((entry) => entry.date);
  const holidayLabels = Object.fromEntries(
    draft.holidays
      .filter((entry) => entry.label.trim())
      .map((entry) => [entry.date, entry.label.trim()]),
  );

  return {
    operatingHours,
    operating_hours: operatingHoursLegacy,
    breakHours,
    break_hours: breakHoursLegacy,
    operatingDays,
    operating_days: operatingDays,
    maxAdvanceBookingDays,
    max_advance_booking_days: maxAdvanceBookingDays,
    holidays,
    holidayLabels,
    holiday_labels: holidayLabels,
  };
}

function serializeOperationalDraftForComparison(
  draft: AdminOperationalSettingsDraft,
) {
  return {
    operatingHours: {
      start: draft.operatingHours.start,
      end: draft.operatingHours.end,
    },
    breakHours: {
      start: draft.breakHours.start,
      end: draft.breakHours.end,
    },
    operatingDays: [...draft.operatingDays].sort((left, right) => left - right),
    maxAdvanceBookingDays: draft.maxAdvanceBookingDays.trim(),
    holidays: sortHolidayEntries(
      draft.holidays.map((entry) => ({
        date: entry.date,
        label: entry.label.trim(),
      })),
    ),
  };
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number.parseInt(part, 10));
  return hours * 60 + minutes;
}

function openNativeTimePicker(event: React.MouseEvent<HTMLInputElement>) {
  const input = event.currentTarget as HTMLInputElement & {
    showPicker?: () => void;
  };

  input.focus();
  try {
    input.showPicker?.();
  } catch {
    // Ignore browsers that block programmatic picker open.
  }
}

function validateOperationalSettings(
  draft: AdminOperationalSettingsDraft,
): OperationalFieldErrors {
  const errors: OperationalFieldErrors = {};
  const maxAdvanceBookingDays = Number.parseInt(draft.maxAdvanceBookingDays, 10);

  if (!isValidTime(draft.operatingHours.start)) {
    errors.start = "Jam buka wajib memakai format HH:MM.";
  }

  if (!isValidTime(draft.operatingHours.end)) {
    errors.end = "Jam tutup wajib memakai format HH:MM.";
  }

  if (
    !errors.start &&
    !errors.end &&
    timeToMinutes(draft.operatingHours.end) <= timeToMinutes(draft.operatingHours.start)
  ) {
    errors.end = "Jam tutup harus lebih besar daripada jam buka.";
  }

  const hasBreakStart = draft.breakHours.start.trim().length > 0;
  const hasBreakEnd = draft.breakHours.end.trim().length > 0;

  if (hasBreakStart && !isValidTime(draft.breakHours.start)) {
    errors.breakStart = "Jam istirahat mulai wajib memakai format HH:MM.";
  }

  if (hasBreakEnd && !isValidTime(draft.breakHours.end)) {
    errors.breakEnd = "Jam istirahat selesai wajib memakai format HH:MM.";
  }

  if (hasBreakStart !== hasBreakEnd) {
    if (!hasBreakStart) {
      errors.breakStart = "Isi jam istirahat mulai atau kosongkan keduanya.";
    }
    if (!hasBreakEnd) {
      errors.breakEnd = "Isi jam istirahat selesai atau kosongkan keduanya.";
    }
  }

  if (
    hasBreakStart &&
    hasBreakEnd &&
    !errors.breakStart &&
    !errors.breakEnd &&
    timeToMinutes(draft.breakHours.end) <= timeToMinutes(draft.breakHours.start)
  ) {
    errors.breakEnd = "Jam istirahat selesai harus lebih besar daripada jam istirahat mulai.";
  }

  if (
    hasBreakStart &&
    hasBreakEnd &&
    !errors.start &&
    !errors.end &&
    !errors.breakStart &&
    !errors.breakEnd
  ) {
    const operatingStartMinutes = timeToMinutes(draft.operatingHours.start);
    const operatingEndMinutes = timeToMinutes(draft.operatingHours.end);
    const breakStartMinutes = timeToMinutes(draft.breakHours.start);
    const breakEndMinutes = timeToMinutes(draft.breakHours.end);

    if (breakStartMinutes < operatingStartMinutes) {
      errors.breakStart = "Jam istirahat mulai harus berada di dalam jam operasional.";
    }

    if (breakEndMinutes > operatingEndMinutes) {
      errors.breakEnd = "Jam istirahat selesai harus berada di dalam jam operasional.";
    }
  }

  if (draft.operatingDays.length === 0) {
    errors.operatingDays = "Pilih minimal satu hari operasional.";
  }

  if (
    !Number.isInteger(maxAdvanceBookingDays) ||
    maxAdvanceBookingDays < 1 ||
    maxAdvanceBookingDays > 365
  ) {
    errors.maxAdvanceBookingDays =
      "Batas booking maju harus berupa angka 1 sampai 365 hari.";
  }

  return errors;
}

function formatHolidayDateLabel(date: string) {
  return new Date(`${date}T08:00:00+07:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildOperatingDaySummary(days: number[]) {
  const selected = OPERATING_DAY_OPTIONS.filter((option) => days.includes(option.value));
  if (selected.length === 0) {
    return "Belum ada hari aktif";
  }

  return selected.map((option) => option.shortLabel).join(", ");
}

function formatBreakHoursSummary(draft: AdminOperationalSettingsDraft) {
  if (!draft.breakHours.start || !draft.breakHours.end) {
    return "Tidak diatur";
  }

  return `${draft.breakHours.start} - ${draft.breakHours.end}`;
}

function normalizeHolidayImpact(summary: unknown): HolidayBulkCancellationSummary | null {
  if (!isRecord(summary)) {
    return null;
  }

  return {
    addedDates: Array.isArray(summary.addedDates)
      ? summary.addedDates.filter(
          (entry): entry is string => typeof entry === "string" && entry.length >= 10,
        )
      : [],
    cancelledCount: asNumber(summary.cancelledCount, 0),
  };
}

function DayToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-surface-container-lowest px-4 py-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <AppCheckbox
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function AdminOperationalSettingsSection() {
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const sessionQuery = useAuthSessionQuery();
  const session = sessionQuery.data?.session;
  const isHumasAdminSession =
    session?.variant === "staff" && session.role === "humas-admin";
  const canPersistChanges =
    isHumasAdminSession &&
    session?.authMode === "live" &&
    Boolean(session.staffId);

  const settingsQuery = useQuery({
    queryKey: ["admin-operational-settings"],
    queryFn: () => getSettings("no-store"),
    enabled: hydrated && isHumasAdminSession,
    staleTime: 60_000,
  });
  const hasLoadedServerSettings = Boolean(settingsQuery.data);

  const serverDraft = React.useMemo(
    () => normalizeOperationalSettings(settingsQuery.data?.settings),
    [settingsQuery.data],
  );
  const serializedServerDraft = React.useMemo(
    () => JSON.stringify(serializeOperationalDraftForComparison(serverDraft)),
    [serverDraft],
  );

  const [draftSettings, setDraftSettings] =
    React.useState<AdminOperationalSettingsDraft | null>(null);
  const [newHolidayStartDate, setNewHolidayStartDate] = React.useState("");
  const [newHolidayEndDate, setNewHolidayEndDate] = React.useState("");
  const [newHolidayLabel, setNewHolidayLabel] = React.useState("");
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);
  const [lastHolidayImpact, setLastHolidayImpact] =
    React.useState<HolidayBulkCancellationSummary | null>(null);
  const newHolidayStartValue = React.useMemo(
    () =>
      newHolidayStartDate
        ? {
            preset: "custom" as const,
            startDate: newHolidayStartDate,
            endDate: newHolidayStartDate,
            anchorDate: newHolidayStartDate,
          }
        : ({
            preset: "today",
            startDate: getJakartaTodayKey(),
            endDate: getJakartaTodayKey(),
            anchorDate: getJakartaTodayKey(),
          } as const),
    [newHolidayStartDate],
  );
  const newHolidayEndValue = React.useMemo(
    () =>
      newHolidayEndDate
        ? {
            preset: "custom" as const,
            startDate: newHolidayEndDate,
            endDate: newHolidayEndDate,
            anchorDate: newHolidayEndDate,
          }
        : ({
            preset: "today",
            startDate: getJakartaTodayKey(),
            endDate: getJakartaTodayKey(),
            anchorDate: getJakartaTodayKey(),
          } as const),
    [newHolidayEndDate],
  );

  const currentDraft = draftSettings ?? serverDraft;
  const isDirty =
    JSON.stringify(serializeOperationalDraftForComparison(currentDraft)) !==
    serializedServerDraft;
  const validationErrors = React.useMemo(
    () => validateOperationalSettings(currentDraft),
    [currentDraft],
  );
  const hasValidationErrors = Object.values(validationErrors).some(Boolean);

  React.useEffect(() => {
    if (!hasLoadedServerSettings) {
      return;
    }

    if (draftSettings === null || !isDirty) {
      setDraftSettings(serverDraft);
    }
  }, [draftSettings, hasLoadedServerSettings, isDirty, serverDraft]);

  const saveMutation = useMutation({
    mutationFn: async (draft: AdminOperationalSettingsDraft) => {
      if (!session?.staffId) {
        throw new Error("Masuk sebagai Humas Admin live terlebih dahulu.");
      }

      return updateAdminSettings(serializeOperationalSettings(draft), {
        staffId: session.staffId,
      });
    },
    onSuccess: async (response) => {
      const holidayImpact = normalizeHolidayImpact(response.holidayBulkCancellation);
      setLastHolidayImpact(holidayImpact);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-operational-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["booking-runtime-data"] }),
        queryClient.invalidateQueries({ queryKey: ["offline-visitor-runtime"] }),
      ]);

      if (holidayImpact?.cancelledCount) {
        toast.success(
          `${holidayImpact.cancelledCount} booking dibatalkan karena hari libur baru.`,
        );
        return;
      }

      toast.success("Pengaturan operasional berhasil disimpan.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal menyimpan pengaturan operasional.";
      toast.error(message);
    },
  });

  function updateOperatingDay(day: number, checked: boolean) {
    setDraftSettings((currentValue) => {
      const base = currentValue ?? serverDraft;
      const operatingDaySet = new Set(base.operatingDays);

      if (checked) {
        operatingDaySet.add(day);
      } else {
        operatingDaySet.delete(day);
      }

      return {
        ...base,
        operatingDays: OPERATING_DAY_OPTIONS
          .filter((option) => operatingDaySet.has(option.value))
          .map((option) => option.value),
      };
    });
  }

  function updateHolidayLabel(date: string, label: string) {
    setDraftSettings((currentValue) => {
      const base = currentValue ?? serverDraft;
      return {
        ...base,
        holidays: base.holidays.map((entry) =>
          entry.date === date ? { ...entry, label } : entry,
        ),
      };
    });
  }

  function removeHoliday(date: string) {
    setDraftSettings((currentValue) => {
      const base = currentValue ?? serverDraft;
      return {
        ...base,
        holidays: base.holidays.filter((entry) => entry.date !== date),
      };
    });
  }

  function handleAddHoliday() {
    if (!newHolidayStartDate || !newHolidayEndDate) {
      toast.error("Pilih rentang tanggal libur terlebih dahulu.");
      return;
    }

    const selectedDateRange = dateRangeInclusive(newHolidayStartDate, newHolidayEndDate);
    const existingDateSet = new Set(currentDraft.holidays.map((entry) => entry.date));
    const uniqueDates = selectedDateRange.filter((date) => !existingDateSet.has(date));

    if (uniqueDates.length === 0) {
      toast.error("Semua tanggal di rentang itu sudah ada di daftar.");
      return;
    }

    setDraftSettings((currentValue) => {
      const base = currentValue ?? serverDraft;
      return {
        ...base,
        holidays: sortHolidayEntries(
          [
            ...base.holidays,
            ...uniqueDates.map((date) => ({
              date,
              label: newHolidayLabel.trim(),
            })),
          ],
        ),
      };
    });
    setNewHolidayStartDate("");
    setNewHolidayEndDate("");
    setNewHolidayLabel("");

    const total = uniqueDates.length;
    toast.success(
      `${total} ${total === 1 ? "tanggal" : "tanggal"} libur berhasil ditambahkan.`,
    );
  }

  function handleReset() {
    setDraftSettings(serverDraft);
    setNewHolidayStartDate("");
    setNewHolidayEndDate("");
    setNewHolidayLabel("");
    toast.success("Draft operasional dikembalikan ke data terakhir.");
  }

  async function handleSave() {
    if (!canPersistChanges) {
      toast.error("Masuk sebagai Humas Admin live terlebih dahulu untuk menyimpan.");
      return;
    }

    if (hasValidationErrors) {
      toast.error("Periksa kembali jam operasional, jam istirahat, hari aktif, dan batas booking maju.");
      return;
    }

    await saveMutation.mutateAsync(currentDraft);
  }

  if (!hydrated) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        {["Hari aktif", "Jam layanan", "Jam istirahat", "Hari libur", "Booking maju"].map((label) => (
          <AppStatCard
            key={label}
            label={label}
            value="..."
            description="Menyiapkan pengaturan operasional"
          />
        ))}
      </div>
    );
  }

  if (!isHumasAdminSession) {
    return (
      <AppCard tone="soft" padding="lg" className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Akses dibatasi</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Buka sebagai Humas Admin untuk mengubah pengaturan operasional.
        </p>
      </AppCard>
    );
  }

  if (settingsQuery.isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        {[
          "Hari Aktif",
          "Jam Layanan",
          "Jam Istirahat",
          "Hari Libur",
          "Booking Maju",
        ].map((label) => (
            <AppStatCard
              key={label}
              label={label}
              value="..."
              description="Memuat pengaturan operasional"
            />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        <AppStatCard
          label="Hari Aktif"
          value={String(currentDraft.operatingDays.length)}
          description={buildOperatingDaySummary(currentDraft.operatingDays)}
          tone="success"
        />
        <AppStatCard
          label="Jam Layanan"
          value={`${currentDraft.operatingHours.start} - ${currentDraft.operatingHours.end}`}
          description="Dipakai booking, check-in, dan rule auto no-show."
          tone="role"
        />
        <AppStatCard
          label="Jam Istirahat"
          value={formatBreakHoursSummary(currentDraft)}
          description="Slot pada interval ini tidak ditawarkan ke pengguna umum."
          tone={currentDraft.breakHours.start && currentDraft.breakHours.end ? "warning" : "info"}
        />
        <AppStatCard
          label="Hari Libur"
          value={String(currentDraft.holidays.length)}
          description="Tanggal yang menutup booking dan memicu pembatalan otomatis."
          tone={currentDraft.holidays.length > 0 ? "warning" : "info"}
        />
        <AppStatCard
          label="Booking Maju"
          value={`${currentDraft.maxAdvanceBookingDays} hari`}
          description="Batas paling jauh warga bisa memilih slot."
          tone="info"
        />
      </div>

      <AppCard tone="soft" padding="md" className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            Editor operasional
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            Perubahan di sini langsung mengubah jam layanan, jam istirahat, hari aktif, hari libur, dan batas booking maju.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AppButton
            variant="outline"
            onClick={() => setResetConfirmOpen(true)}
            disabled={!isDirty || saveMutation.isPending}
          >
            <RefreshCw className="size-4" />
            Kembalikan Draft
          </AppButton>
          <AppButton
            onClick={handleSave}
            loading={saveMutation.isPending}
            loadingLabel="Menyimpan..."
            disabled={!isDirty || hasValidationErrors || !canPersistChanges}
          >
            <Save className="size-4" />
            Simpan Operasional
          </AppButton>
        </div>
      </AppCard>

      <div
        className={cn(
          "grid gap-6",
          lastHolidayImpact
            ? "xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)]"
            : "xl:grid-cols-1",
        )}
      >
        <div className="space-y-6">
          <AppCard padding="lg" className="space-y-5">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                Jadwal Utama
              </p>
              <AppCardTitle className="text-2xl">Jam dan hari operasional</AppCardTitle>
              <AppCardDescription>
                Bagian ini menjadi sumber aturan untuk slot booking publik dan batas operasional harian.
              </AppCardDescription>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <AdminFormField
                label="Jam buka"
                error={validationErrors.start}
                controlId="admin-operational-start"
              >
                <AppInput
                  id="admin-operational-start"
                  type="time"
                  step={300}
                  value={currentDraft.operatingHours.start}
                  className="cursor-pointer"
                  disabled={!canPersistChanges || saveMutation.isPending}
                  onClick={openNativeTimePicker}
                  onChange={(event) =>
                    setDraftSettings((currentValue) => ({
                      ...(currentValue ?? serverDraft),
                      operatingHours: {
                        ...(currentValue ?? serverDraft).operatingHours,
                        start: event.target.value,
                      },
                    }))
                  }
                />
              </AdminFormField>

              <AdminFormField
                label="Jam tutup"
                error={validationErrors.end}
                controlId="admin-operational-end"
              >
                <AppInput
                  id="admin-operational-end"
                  type="time"
                  step={300}
                  value={currentDraft.operatingHours.end}
                  className="cursor-pointer"
                  disabled={!canPersistChanges || saveMutation.isPending}
                  onClick={openNativeTimePicker}
                  onChange={(event) =>
                    setDraftSettings((currentValue) => ({
                      ...(currentValue ?? serverDraft),
                      operatingHours: {
                        ...(currentValue ?? serverDraft).operatingHours,
                        end: event.target.value,
                      },
                    }))
                  }
                />
              </AdminFormField>

              <AdminFormField
                label="Booking maju"
                error={validationErrors.maxAdvanceBookingDays}
                controlId="admin-operational-max-advance"
              >
                <AppInput
                  id="admin-operational-max-advance"
                  type="number"
                  min={1}
                  max={365}
                  inputMode="numeric"
                  value={currentDraft.maxAdvanceBookingDays}
                  disabled={!canPersistChanges || saveMutation.isPending}
                  onChange={(event) =>
                    setDraftSettings((currentValue) => ({
                      ...(currentValue ?? serverDraft),
                      maxAdvanceBookingDays: event.target.value,
                    }))
                  }
                />
              </AdminFormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <AdminFormField
                label="Jam istirahat mulai"
                error={validationErrors.breakStart}
                controlId="admin-operational-break-start"
              >
                <AppInput
                  id="admin-operational-break-start"
                  type="time"
                  step={300}
                  value={currentDraft.breakHours.start}
                  className="cursor-pointer"
                  disabled={!canPersistChanges || saveMutation.isPending}
                  onClick={openNativeTimePicker}
                  onChange={(event) =>
                    setDraftSettings((currentValue) => ({
                      ...(currentValue ?? serverDraft),
                      breakHours: {
                        ...(currentValue ?? serverDraft).breakHours,
                        start: event.target.value,
                      },
                    }))
                  }
                />
              </AdminFormField>

              <AdminFormField
                label="Jam istirahat selesai"
                error={validationErrors.breakEnd}
                controlId="admin-operational-break-end"
              >
                <AppInput
                  id="admin-operational-break-end"
                  type="time"
                  step={300}
                  value={currentDraft.breakHours.end}
                  className="cursor-pointer"
                  disabled={!canPersistChanges || saveMutation.isPending}
                  onClick={openNativeTimePicker}
                  onChange={(event) =>
                    setDraftSettings((currentValue) => ({
                      ...(currentValue ?? serverDraft),
                      breakHours: {
                        ...(currentValue ?? serverDraft).breakHours,
                        end: event.target.value,
                      },
                    }))
                  }
                />
              </AdminFormField>
            </div>

            <div className="rounded-[20px] border border-border bg-surface-container-low px-4 py-4 text-sm leading-6 text-muted-foreground">
              Kosongkan dua field jam istirahat jika tidak ada jeda layanan. Jika diisi, pengguna umum tidak akan mendapat slot pada interval tersebut.
            </div>

            <AdminFormField
              label="Hari aktif"
              error={validationErrors.operatingDays}
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {OPERATING_DAY_OPTIONS.map((option) => (
                  <DayToggle
                    key={option.value}
                    label={option.label}
                    checked={currentDraft.operatingDays.includes(option.value)}
                    disabled={!canPersistChanges || saveMutation.isPending}
                    onChange={(checked) => updateOperatingDay(option.value, checked)}
                  />
                ))}
              </div>
            </AdminFormField>
          </AppCard>

          <AppCard padding="lg" className="space-y-5">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                Hari Libur
              </p>
              <AppCardTitle className="text-2xl">Penutupan kalender layanan</AppCardTitle>
              <AppCardDescription>
                Tanggal yang ditambahkan di sini menutup booking global dan dapat membatalkan appointment yang masih aktif di tanggal tersebut.
              </AppCardDescription>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <AdminFormField
                label="Tanggal mulai"
                controlId="admin-holiday-date-start"
                className="min-w-0"
              >
                <AppDateFilter
                  id="admin-holiday-date-start"
                  value={newHolidayStartValue}
                  mode="single"
                  disabled={!canPersistChanges || saveMutation.isPending}
                  className="w-full min-w-0"
                  buttonClassName="w-full min-w-0"
                  onChange={(nextValue) => setNewHolidayStartDate(nextValue.startDate)}
                />
              </AdminFormField>
              <AdminFormField
                label="Tanggal sampai"
                controlId="admin-holiday-date-end"
                className="min-w-0"
              >
                <AppDateFilter
                  id="admin-holiday-date-end"
                  value={newHolidayEndValue}
                  mode="single"
                  disabled={!canPersistChanges || saveMutation.isPending}
                  className="w-full min-w-0"
                  buttonClassName="w-full min-w-0"
                  onChange={(nextValue) => setNewHolidayEndDate(nextValue.startDate)}
                />
              </AdminFormField>
              <AdminFormField
                label="Label libur"
                controlId="admin-holiday-label-new"
                className="min-w-0"
              >
                <AppInput
                  id="admin-holiday-label-new"
                  placeholder="Contoh: Libur nasional"
                  value={newHolidayLabel}
                  disabled={!canPersistChanges || saveMutation.isPending}
                  onChange={(event) => setNewHolidayLabel(event.target.value)}
                />
              </AdminFormField>
              <div className="flex items-end md:col-span-2 xl:col-span-1 xl:justify-end">
                <AppButton
                  type="button"
                  variant="outline"
                  onClick={handleAddHoliday}
                  disabled={!canPersistChanges || saveMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Plus className="size-4" />
                  Tambah
                </AppButton>
              </div>
            </div>

            {currentDraft.holidays.length ? (
              <div className="space-y-3">
                {currentDraft.holidays.map((entry) => (
                  <div
                    key={entry.date}
                    className="rounded-[24px] border border-border bg-surface-container-lowest px-5 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {formatHolidayDateLabel(entry.date)}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground">
                          {entry.date}
                        </p>
                      </div>
                      <AppButton
                        type="button"
                        size="xs"
                        variant="ghost"
                        disabled={!canPersistChanges || saveMutation.isPending}
                        onClick={() => removeHoliday(entry.date)}
                      >
                        <Trash2 className="size-3.5" />
                        Hapus
                      </AppButton>
                    </div>
                    <div className="mt-4">
                      <AdminFormField
                        label="Keterangan"
                        controlId={`admin-holiday-label-${entry.date}`}
                      >
                        <AppInput
                          id={`admin-holiday-label-${entry.date}`}
                          placeholder="Contoh: Cuti bersama Idulfitri"
                          value={entry.label}
                          disabled={!canPersistChanges || saveMutation.isPending}
                          onChange={(event) =>
                            updateHolidayLabel(entry.date, event.target.value)
                          }
                        />
                      </AdminFormField>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-surface-container-low px-5 py-10 text-center">
                <p className="text-sm font-semibold">Belum ada hari libur global</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Tambahkan tanggal jika layanan publik perlu ditutup untuk hari tertentu.
                </p>
              </div>
            )}
          </AppCard>
        </div>

        <div className="space-y-6">
          {lastHolidayImpact ? (
            <AppCard tone="soft" padding="lg" className="space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                  Dampak Simpan Terakhir
                </p>
                <AppCardTitle className="text-2xl">
                  {lastHolidayImpact.cancelledCount > 0
                    ? `${lastHolidayImpact.cancelledCount} booking terdampak`
                    : "Tidak ada booking yang terdampak"}
                </AppCardTitle>
                <AppCardDescription>
                  Ringkasan booking yang ikut terdampak oleh perubahan terbaru.
                </AppCardDescription>
              </div>

              {lastHolidayImpact.addedDates.length ? (
                <div className="flex flex-wrap gap-2">
                  {lastHolidayImpact.addedDates.map((date) => (
                    <span
                      key={date}
                      className="inline-flex items-center rounded-full bg-surface-container-lowest px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {date}
                    </span>
                  ))}
                </div>
              ) : null}
            </AppCard>
          ) : null}
        </div>
      </div>

      <AppConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Kembalikan pengaturan operasional?"
        description="Perubahan yang belum disimpan akan dibuang dan pengaturan kembali ke data terakhir yang tersimpan."
        confirmLabel="Kembalikan Draft"
        confirmVariant="default"
        onConfirm={async () => {
          setResetConfirmOpen(false);
          handleReset();
        }}
      />
    </div>
  );
}
