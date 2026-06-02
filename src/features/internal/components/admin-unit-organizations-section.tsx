"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  PencilLine,
  Plus,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
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
import { AppFilterBar } from "@/components/ui/app-filter-bar";
import { AppFilterTrigger } from "@/components/ui/app-filter-trigger";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";
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
import {
  AdminEditorSection,
  AdminFormField,
} from "@/features/internal/components/admin-editor-section";
import {
  bookingServices,
  bookingUnitEntries,
  getBookingServiceById,
  getBookingUnitEntryById,
} from "@/content/service-booking-content";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAdminUnitCountersQuery } from "@/features/internal/use-admin-unit-counters-query";
import { syncAdminUnitCounters } from "@/lib/api/admin-unit-counters";
import {
  deleteUnorConfig,
  updateUnorConfig,
} from "@/lib/api/admin-unor";
import { getScopedData } from "@/lib/api/services";

type HolidayEntry = {
  date: string;
};

type AdminUnitService = {
  id: string;
  name: string;
  enabled: boolean;
  unorId: string;
  source: "live" | "fallback";
};

type AdminUnitRecord = {
  id: string;
  name: string;
  shortName: string;
  dailyQuota: number;
  holidays: HolidayEntry[];
  serviceIds: string[];
  ownedServices: AdminUnitService[];
  orphanServiceIds: string[];
  staffCount: number;
  counters: AdminUnitCounterRecord[];
  activeCounterCount: number;
  explicitConfig: boolean;
  isDefaultUnit: boolean;
  source: "live" | "fallback";
};

type AdminUnitCounterRecord = {
  id: string;
  counterNumber: number;
  label: string;
  active: boolean;
};

type AdminUnitDirectory = {
  units: AdminUnitRecord[];
  services: AdminUnitService[];
};

type AdminUnitCounterDraft = {
  id?: string;
  counterNumber: string;
  label: string;
  active: boolean;
};

type AdminUnitDraft = {
  id: string;
  name: string;
  shortName: string;
  dailyQuota: string;
  serviceIds: string[];
  holidays: HolidayEntry[];
  counters: AdminUnitCounterDraft[];
};

type UnitFieldErrors = {
  id?: string;
  name?: string;
  shortName?: string;
  dailyQuota?: string;
  holidays?: string;
  counters?: string;
};

type HolidayBulkCancellationSummary = {
  addedDates: string[];
  cancelledCount: number;
};

type UnitStatusFilter = "all" | "configured" | "attention" | "holidays";

type UnitTypeFilter = "all" | "default" | "custom";

const DEFAULT_UNIT_IDS = new Set(bookingUnitEntries.map((entry) => entry.id));

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function sortHolidayEntries(entries: HolidayEntry[]) {
  return [...entries].sort((left, right) => left.date.localeCompare(right.date));
}

function normalizeHolidayEntries(rawHolidays: unknown) {
  const holidaySet = new Set(
    asStringArray(rawHolidays)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length >= 10),
  );

  return sortHolidayEntries(Array.from(holidaySet).map((date) => ({ date })));
}

function normalizeServices(rawServices: unknown, includeFallback = true) {
  const merged = new Map<string, AdminUnitService>();

  if (includeFallback) {
    for (const entry of bookingServices) {
      merged.set(entry.id, {
        id: entry.id,
        name: entry.title,
        enabled: true,
        unorId: entry.unitId,
        source: "fallback",
      });
    }
  }

  if (Array.isArray(rawServices)) {
    for (const entry of rawServices) {
      if (!isRecord(entry)) continue;
      const id = asString(entry.id).trim().toUpperCase();
      const unorId = asString(entry.unorId).trim().toUpperCase();
      if (!id || !unorId) continue;

      merged.set(id, {
        id,
        name: asString(entry.name, getBookingServiceById(id)?.title ?? id).trim() || id,
        enabled: entry.enabled !== false,
        unorId,
        source: "live",
      });
    }
  }

  return Array.from(merged.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function normalizeUnitCounterRecords(rawCounters: unknown) {
  if (!Array.isArray(rawCounters)) {
    return [] as AdminUnitCounterRecord[];
  }

  return rawCounters
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const id = asString(entry.id).trim().toUpperCase();
      const counterNumber = Math.trunc(
        typeof entry.counterNumber === "number" && Number.isFinite(entry.counterNumber)
          ? entry.counterNumber
          : asNumber(entry.counterNumber, 0),
      );

      if (!id || counterNumber < 1) {
        return null;
      }

      return {
        id,
        counterNumber,
        label: asString(entry.label, `Loket ${counterNumber}`).trim() || `Loket ${counterNumber}`,
        active: entry.active !== false,
      } satisfies AdminUnitCounterRecord;
    })
    .filter((entry): entry is AdminUnitCounterRecord => entry !== null)
    .sort((left, right) => left.counterNumber - right.counterNumber);
}

function normalizeAdminUnorDirectory(
  payload: unknown,
  counterItems: AdminUnitCounterRecord[] = [],
  includeFallback = true,
): AdminUnitDirectory {
  const root = isRecord(payload) ? payload : {};
  const data = isRecord(root.data) ? root.data : root;
  const services = normalizeServices(data.services, includeFallback);
  const staffCountByUnit = new Map<string, number>();
  const countersByUnit = new Map<string, AdminUnitCounterRecord[]>();

  for (const counter of counterItems) {
    const unitId = counter.id.split("-COUNTER-")[0] || "";
    if (!unitId) {
      continue;
    }

    if (!countersByUnit.has(unitId)) {
      countersByUnit.set(unitId, []);
    }

    countersByUnit.get(unitId)?.push(counter);
  }

  if (Array.isArray(data.staff)) {
    for (const entry of data.staff) {
      if (!isRecord(entry)) continue;
      const unorId = asString(entry.unorId).trim().toUpperCase();
      if (!unorId) continue;
      staffCountByUnit.set(unorId, (staffCountByUnit.get(unorId) ?? 0) + 1);
    }
  }

  const configMap = new Map<
    string,
    { dailyQuota: number; holidays: HolidayEntry[]; serviceIds: string[] }
  >();
  if (Array.isArray(data.unorConfigs)) {
    for (const entry of data.unorConfigs) {
      if (!isRecord(entry)) continue;
      const unorId = asString(entry.unorId).trim().toUpperCase();
      if (!unorId) continue;

      configMap.set(unorId, {
        dailyQuota: Math.max(asNumber(entry.dailyQuota, 30), 0),
        holidays: normalizeHolidayEntries(entry.holidays),
        serviceIds: asStringArray(entry.serviceIds).map((item) => item.trim().toUpperCase()),
      });
    }
  }

  const unitSeedMap = new Map<
    string,
    { id: string; name: string; shortName: string; source: "live" | "fallback" }
  >();

  if (includeFallback) {
    for (const entry of bookingUnitEntries) {
      unitSeedMap.set(entry.id, {
        id: entry.id,
        name: entry.label,
        shortName: entry.groupLabel,
        source: "fallback",
      });
    }
  }

  if (Array.isArray(data.units)) {
    for (const entry of data.units) {
      if (!isRecord(entry)) continue;
      const id = asString(entry.id).trim().toUpperCase();
      if (!id) continue;
      unitSeedMap.set(id, {
        id,
        name: asString(entry.name, getBookingUnitEntryById(id)?.label ?? id).trim() || id,
        shortName:
          asString(
            entry.shortName,
            getBookingUnitEntryById(id)?.groupLabel ?? asString(entry.name, id),
          ).trim() || id,
        source: "live",
      });
    }
  }

  for (const service of services) {
    if (!unitSeedMap.has(service.unorId)) {
      unitSeedMap.set(service.unorId, {
        id: service.unorId,
        name: getBookingUnitEntryById(service.unorId)?.label ?? service.unorId,
        shortName:
          getBookingUnitEntryById(service.unorId)?.groupLabel ?? service.unorId,
        source: "live",
      });
    }
  }

  for (const unorId of configMap.keys()) {
    if (!unitSeedMap.has(unorId)) {
      unitSeedMap.set(unorId, {
        id: unorId,
        name: getBookingUnitEntryById(unorId)?.label ?? unorId,
        shortName: getBookingUnitEntryById(unorId)?.groupLabel ?? unorId,
        source: "live",
      });
    }
  }

  for (const unorId of staffCountByUnit.keys()) {
    if (!unitSeedMap.has(unorId)) {
      unitSeedMap.set(unorId, {
        id: unorId,
        name: getBookingUnitEntryById(unorId)?.label ?? unorId,
        shortName: getBookingUnitEntryById(unorId)?.groupLabel ?? unorId,
        source: "live",
      });
    }
  }

  const units = Array.from(unitSeedMap.values())
    .map((seed) => {
      const ownedServices = services.filter((service) => service.unorId === seed.id);
      const config = configMap.get(seed.id);
      const configuredServiceIds =
        config?.serviceIds.length ? config.serviceIds : ownedServices.map((service) => service.id);
      const ownedServiceIdSet = new Set(ownedServices.map((service) => service.id));
      const counters = countersByUnit.get(seed.id) ?? [];

      return {
        id: seed.id,
        name: seed.name,
        shortName: seed.shortName,
        dailyQuota: config?.dailyQuota ?? 30,
        holidays: config?.holidays ?? [],
        serviceIds: configuredServiceIds,
        ownedServices,
        orphanServiceIds: configuredServiceIds.filter((serviceId) => !ownedServiceIdSet.has(serviceId)),
        staffCount: staffCountByUnit.get(seed.id) ?? 0,
        counters,
        activeCounterCount: counters.filter((counter) => counter.active).length,
        explicitConfig: Boolean(config),
        isDefaultUnit: DEFAULT_UNIT_IDS.has(seed.id),
        source: seed.source,
      } satisfies AdminUnitRecord;
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    units,
    services,
  };
}

function buildFallbackUnorDirectory() {
  return normalizeAdminUnorDirectory({
    units: bookingUnitEntries.map((entry) => ({
      id: entry.id,
      name: entry.label,
      shortName: entry.groupLabel,
    })),
    services: bookingServices.map((entry) => ({
      id: entry.id,
      name: entry.title,
      enabled: true,
      unorId: entry.unitId,
    })),
    unorConfigs: [],
    staff: [],
  });
}

function buildUnitDraft(unit: AdminUnitRecord | null): AdminUnitDraft {
  return {
    id: unit?.id ?? "",
    name: unit?.name ?? "",
    shortName: unit?.shortName ?? "",
    dailyQuota: unit != null ? String(unit.dailyQuota) : "30",
    serviceIds: unit?.serviceIds ?? [],
    holidays: sortHolidayEntries(unit?.holidays ?? []),
    counters:
      unit?.counters.map((counter) => ({
        id: counter.id,
        counterNumber: String(counter.counterNumber),
        label: counter.label,
        active: counter.active,
      })) ?? [],
  };
}

function validateUnitDraft(
  draft: AdminUnitDraft,
  isCreateMode: boolean,
): UnitFieldErrors {
  const errors: UnitFieldErrors = {};
  const dailyQuota = Number.parseInt(draft.dailyQuota, 10);
  const holidaySet = new Set<string>();

  if (isCreateMode) {
    if (!draft.id.trim()) {
      errors.id = "ID unit wajib diisi.";
    } else if (!/^[A-Z0-9-]+$/.test(draft.id.trim().toUpperCase())) {
      errors.id = "Gunakan huruf kapital, angka, atau tanda hubung.";
    }
  }

  if (!draft.name.trim()) {
    errors.name = "Nama unit wajib diisi.";
  }

  if (!draft.shortName.trim()) {
    errors.shortName = "Nama singkat unit wajib diisi.";
  }

  if (!Number.isInteger(dailyQuota) || dailyQuota < 0) {
    errors.dailyQuota = "Kapasitas harian harus berupa angka 0 atau lebih.";
  }

  const counterNumberSet = new Set<number>();
  for (const counter of draft.counters) {
    const counterNumber = Number.parseInt(counter.counterNumber, 10);

    if (!Number.isInteger(counterNumber) || counterNumber < 1) {
      errors.counters = "Nomor loket harus berupa angka 1 atau lebih.";
      break;
    }

    if (!counter.label.trim()) {
      errors.counters = "Label loket wajib diisi.";
      break;
    }

    if (counterNumberSet.has(counterNumber)) {
      errors.counters = "Nomor loket tidak boleh duplikat pada unit yang sama.";
      break;
    }

    counterNumberSet.add(counterNumber);
  }

  for (const holiday of draft.holidays) {
    if (!holiday.date || holiday.date.length < 10) {
      errors.holidays = "Tanggal hari libur wajib valid.";
      break;
    }
    if (holidaySet.has(holiday.date)) {
      errors.holidays = "Tanggal hari libur tidak boleh duplikat.";
      break;
    }
    holidaySet.add(holiday.date);
  }

  return errors;
}

function buildUnitIssues(unit: AdminUnitRecord) {
  const issues: string[] = [];

  if (!unit.explicitConfig) {
    issues.push("Konfigurasi belum final");
  }
  if (unit.dailyQuota <= 0) {
    issues.push("Kapasitas harian belum diatur");
  }
  if (unit.activeCounterCount <= 0) {
    issues.push("Belum ada loket aktif");
  }
  if (unit.ownedServices.length === 0) {
    issues.push("Belum ada layanan");
  }
  if (unit.orphanServiceIds.length > 0) {
    issues.push("Relasi layanan perlu diperiksa");
  }

  return issues;
}

function getUnitStatus(unit: AdminUnitRecord) {
  const issues = buildUnitIssues(unit);

  if (issues.length > 0) {
    return { tone: "warning" as const, label: "Perlu cek" };
  }

  if (unit.holidays.length > 0) {
    return { tone: "diproses" as const, label: "Kalender aktif" };
  }

  return { tone: "aktif" as const, label: "Siap" };
}

function getUnitStatusFilterLabel(filter: UnitStatusFilter) {
  switch (filter) {
    case "configured":
      return "Sudah dikonfigurasi";
    case "attention":
      return "Perlu cek";
    case "holidays":
      return "Punya hari libur";
    default:
      return "Semua status";
  }
}

function getUnitTypeFilterLabel(filter: UnitTypeFilter) {
  switch (filter) {
    case "default":
      return "Unit default";
    case "custom":
      return "Unit custom";
    default:
      return "Semua jenis";
  }
}

function formatHolidayDateLabel(date: string) {
  return new Date(`${date}T08:00:00+07:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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

async function invalidateAdminUnorQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin-unor-directory"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-unit-counters"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-services-directory"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-staff-directory"] }),
    queryClient.invalidateQueries({ queryKey: ["booking-runtime-data"] }),
    queryClient.invalidateQueries({ queryKey: ["offline-visitor-runtime"] }),
    queryClient.invalidateQueries({ queryKey: ["staff-live-appointments"] }),
    queryClient.invalidateQueries({ queryKey: ["user-live-appointments"] }),
  ]);
}

export function AdminUnitOrganizationsSection() {
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const sessionQuery = useAuthSessionQuery();
  const counterQuery = useAdminUnitCountersQuery();
  const session = sessionQuery.data?.session;
  const isHumasAdminSession =
    session?.variant === "staff" && session.role === "humas-admin";
  const canPersistChanges =
    isHumasAdminSession &&
    session?.authMode === "live" &&
    Boolean(session.staffId);
  const fallbackDirectory = React.useMemo(buildFallbackUnorDirectory, []);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] =
    React.useState<UnitStatusFilter>("all");
  const [unitTypeFilter, setUnitTypeFilter] =
    React.useState<UnitTypeFilter>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [selectedUnitId, setSelectedUnitId] =
    React.useState<string | "new" | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<AdminUnitDraft>(() =>
    buildUnitDraft(null),
  );
  const [deleteTarget, setDeleteTarget] =
    React.useState<AdminUnitRecord | null>(null);
  const [rowBusyKey, setRowBusyKey] = React.useState<string | null>(null);
  const [holidayInput, setHolidayInput] = React.useState("");
  const [lastHolidayImpact, setLastHolidayImpact] =
    React.useState<HolidayBulkCancellationSummary | null>(null);

  const runtimeQuery = useQuery({
    queryKey: ["admin-unor-directory", session?.staffId ?? "anonymous"],
    enabled: Boolean(hydrated && canPersistChanges && session?.staffId),
    queryFn: () => getScopedData({ staffId: session?.staffId ?? undefined }),
    staleTime: 60_000,
  });
  const liveCounterItems = React.useMemo(
    () => normalizeUnitCounterRecords(counterQuery.data?.items),
    [counterQuery.data?.items],
  );

  const liveDirectory = React.useMemo(
    () => normalizeAdminUnorDirectory(runtimeQuery.data?.data, liveCounterItems, false),
    [liveCounterItems, runtimeQuery.data],
  );
  const usesLiveDirectory = canPersistChanges;
  const directory = usesLiveDirectory ? liveDirectory : fallbackDirectory;
  const units = directory.units;
  const services = directory.services;
  const hasVisibleDirectoryData = units.length > 0 || services.length > 0 || liveCounterItems.length > 0;

  const filteredUnits = React.useMemo(() => {
    return units.filter((unit) => {
      if (statusFilter === "configured" && !unit.explicitConfig) {
        return false;
      }

      if (
        statusFilter === "attention" &&
        buildUnitIssues(unit).length === 0
      ) {
        return false;
      }

      if (statusFilter === "holidays" && unit.holidays.length === 0) {
        return false;
      }

      if (unitTypeFilter === "default" && !unit.isDefaultUnit) {
        return false;
      }

      if (unitTypeFilter === "custom" && unit.isDefaultUnit) {
        return false;
      }

      if (!searchQuery.trim()) {
        return true;
      }

      const normalizedQuery = searchQuery.trim().toLowerCase();
      return [unit.id, unit.name, unit.shortName]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [searchQuery, statusFilter, unitTypeFilter, units]);

  const selectedUnit =
    selectedUnitId && selectedUnitId !== "new"
      ? units.find((unit) => unit.id === selectedUnitId) ?? null
      : null;
  const isCreateMode = selectedUnitId === "new";
  const baseDraft = React.useMemo(
    () => buildUnitDraft(isCreateMode ? null : selectedUnit),
    [isCreateMode, selectedUnit],
  );
  const isDirty = JSON.stringify(draft) !== JSON.stringify(baseDraft);
  const validationErrors = React.useMemo(
    () => validateUnitDraft(draft, isCreateMode),
    [draft, isCreateMode],
  );
  const hasValidationErrors = Object.values(validationErrors).some(Boolean);
  const activeFilterCount =
    Number(Boolean(searchQuery.trim())) +
    Number(statusFilter !== "all") +
    Number(unitTypeFilter !== "all");

  const statusFilterOptions = React.useMemo<AppSearchSelectOption[]>(
    () => [
      { value: "all", label: "Semua status" },
      {
        value: "configured",
        label: "Sudah dikonfigurasi",
        keywords: ["final", "aktif", "tersimpan"],
      },
      {
        value: "attention",
        label: "Perlu cek",
        keywords: ["cek", "perlu tinjau", "aktif"],
      },
      {
        value: "holidays",
        label: "Punya hari libur",
        keywords: ["kalender", "libur", "cuti"],
      },
    ],
    [],
  );
  const unitTypeFilterOptions = React.useMemo<AppSearchSelectOption[]>(
    () => [
      { value: "all", label: "Semua jenis" },
      {
        value: "default",
        label: "Unit default",
        keywords: ["default", "bawaan", "utama"],
      },
      {
        value: "custom",
        label: "Unit custom",
        keywords: ["custom", "tambahan", "khusus"],
      },
    ],
    [],
  );

  React.useEffect(() => {
    if (selectedUnitId === "new") {
      return;
    }

    if (!selectedUnitId) {
      if (units.length > 0) {
        setSelectedUnitId(units[0].id);
      }
      return;
    }

    if (!units.some((unit) => unit.id === selectedUnitId)) {
      setSelectedUnitId(units[0]?.id ?? null);
    }
  }, [selectedUnitId, units]);

  React.useEffect(() => {
    setDraft(baseDraft);
    setHolidayInput("");
  }, [baseDraft]);

  function openUnitEditor(unitId: string | "new") {
    setSelectedUnitId(unitId);
    setEditorOpen(true);
  }

  function handleEditorOpenChange(nextOpen: boolean) {
    setEditorOpen(nextOpen);

    if (!nextOpen) {
      setDraft(baseDraft);
      setHolidayInput("");
    }
  }

  function resetFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setUnitTypeFilter("all");
    setShowAdvancedFilters(false);
  }

  const currentUnitId = (isCreateMode ? draft.id : selectedUnit?.id ?? "")
    .trim()
    .toUpperCase();
  const eligibleServices = React.useMemo(
    () =>
      services.filter((service) => service.unorId === currentUnitId),
    [currentUnitId, services],
  );
  const eligibleServiceIds = new Set(eligibleServices.map((service) => service.id));
  const orphanDraftServiceIds = draft.serviceIds.filter(
    (serviceId) => !eligibleServiceIds.has(serviceId),
  );

  const totalUnits = units.length;
  const configuredUnits = units.filter((unit) => unit.explicitConfig).length;
  const unitsWithHolidays = units.filter((unit) => unit.holidays.length > 0).length;
  const attentionCount = units.filter(
    (unit) => buildUnitIssues(unit).length > 0,
  ).length;

  const saveMutation = useMutation({
    mutationFn: async (currentDraft: AdminUnitDraft) => {
      if (!session?.staffId) {
        throw new Error("Masuk sebagai Humas Admin live terlebih dahulu.");
      }

      const response = await updateUnorConfig(
        currentDraft.id.trim().toUpperCase(),
        {
          name: currentDraft.name.trim(),
          shortName: currentDraft.shortName.trim(),
          dailyQuota: Number.parseInt(currentDraft.dailyQuota, 10),
          serviceIds: currentDraft.serviceIds,
          holidays: currentDraft.holidays.map((entry) => entry.date),
        },
        { staffId: session.staffId },
      );

      try {
        await syncAdminUnitCounters({
          unitId: currentDraft.id.trim().toUpperCase(),
          counters: currentDraft.counters.map((counter) => ({
            counterNumber: Number.parseInt(counter.counterNumber, 10),
            label: counter.label.trim(),
            active: counter.active,
          })),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Sinkron loket unit gagal.";
        throw new Error(
          `Konfigurasi unit berhasil disimpan, tetapi sinkron loket gagal. ${message}`,
        );
      }

      return response;
    },
    onSuccess: async (response, currentDraft) => {
      const holidayImpact = normalizeHolidayImpact(response.holidayBulkCancellation);
      setLastHolidayImpact(holidayImpact);
      await invalidateAdminUnorQueries(queryClient);

      const nextSelectedId = currentDraft.id.trim().toUpperCase();
      setSelectedUnitId(nextSelectedId);
      setEditorOpen(false);
      setHolidayInput("");

      if (holidayImpact?.cancelledCount) {
        toast.success(
          `${holidayImpact.cancelledCount} booking dibatalkan karena perubahan hari libur unit.`,
        );
        return;
      }

      toast.success(
        isCreateMode
          ? "Unit organisasi baru berhasil disimpan."
          : "Konfigurasi unit berhasil disimpan.",
      );
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal menyimpan konfigurasi unit.";
      toast.error(message);
    },
  });

  async function handleResetDraft() {
    setDraft(baseDraft);
    setHolidayInput("");
    toast.success(
      isCreateMode
        ? "Form unit baru dikembalikan ke default."
        : "Draft unit dikembalikan ke data terakhir.",
    );
  }

  async function handleSave() {
    if (!canPersistChanges) {
      toast.error("Masuk sebagai Humas Admin live terlebih dahulu untuk menyimpan.");
      return;
    }

    if (hasValidationErrors) {
      toast.error("Periksa kembali field unit yang wajib.");
      return;
    }

    await saveMutation.mutateAsync({
      ...draft,
      id: draft.id.trim().toUpperCase(),
    });
  }

  async function handleDelete() {
    if (!deleteTarget || !session?.staffId) {
      return;
    }

    const busyKey = `${deleteTarget.id}:delete`;
    setRowBusyKey(busyKey);

    try {
      const response = await deleteUnorConfig(deleteTarget.id, {
        staffId: session.staffId,
      });
      await invalidateAdminUnorQueries(queryClient);
      setDeleteTarget(null);
      if (selectedUnitId === deleteTarget.id) {
        setSelectedUnitId(null);
      }

      if (response && isRecord(response) && response.unitDeleted === true) {
        toast.success("Konfigurasi dan unit custom berhasil dihapus.");
        return;
      }

      toast.success("Konfigurasi unit berhasil dihapus.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal menghapus konfigurasi unit.";
      toast.error(message);
    } finally {
      setRowBusyKey(null);
    }
  }

  function toggleService(serviceId: string, checked: boolean) {
    setDraft((currentValue) => {
      const currentServiceIds = new Set(currentValue.serviceIds);
      if (checked) {
        currentServiceIds.add(serviceId);
      } else {
        currentServiceIds.delete(serviceId);
      }

      return {
        ...currentValue,
        serviceIds: Array.from(currentServiceIds).sort(),
      };
    });
  }

  function addHoliday() {
    const date = holidayInput.trim();
    if (!date || date.length < 10) {
      toast.error("Pilih tanggal hari libur yang valid.");
      return;
    }

    setDraft((currentValue) => {
      if (currentValue.holidays.some((entry) => entry.date === date)) {
        toast.error("Tanggal hari libur itu sudah ada di daftar.");
        return currentValue;
      }

      return {
        ...currentValue,
        holidays: sortHolidayEntries([...currentValue.holidays, { date }]),
      };
    });
    setHolidayInput("");
  }

  function removeHoliday(date: string) {
    setDraft((currentValue) => ({
      ...currentValue,
      holidays: currentValue.holidays.filter((entry) => entry.date !== date),
    }));
  }

  function addCounter() {
    const nextCounterNumber =
      draft.counters.reduce((maxValue, counter) => {
        const parsed = Number.parseInt(counter.counterNumber, 10);
        return Number.isInteger(parsed) && parsed > maxValue ? parsed : maxValue;
      }, 0) + 1;

    setDraft((currentValue) => ({
      ...currentValue,
      counters: [
        ...currentValue.counters,
        {
          counterNumber: String(nextCounterNumber),
          label: `Loket ${nextCounterNumber}`,
          active: true,
        },
      ],
    }));
  }

  function updateCounter(
    index: number,
    patch: Partial<AdminUnitCounterDraft>,
  ) {
    setDraft((currentValue) => ({
      ...currentValue,
      counters: currentValue.counters.map((counter, counterIndex) =>
        counterIndex === index ? { ...counter, ...patch } : counter,
      ),
    }));
  }

  function removeCounter(index: number) {
    setDraft((currentValue) => ({
      ...currentValue,
      counters: currentValue.counters.filter((_, counterIndex) => counterIndex !== index),
    }));
  }

  function removeOrphanService(serviceId: string) {
    setDraft((currentValue) => ({
      ...currentValue,
      serviceIds: currentValue.serviceIds.filter((entry) => entry !== serviceId),
    }));
  }

  if (!hydrated) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {["Total unit", "Konfigurasi aktif", "Hari libur unit", "Perlu cek"].map(
          (label) => (
            <AppStatCard
              key={label}
              label={label}
              value="..."
              description="Menyiapkan data unit organisasi"
            />
          ),
        )}
      </div>
    );
  }

  if (!isHumasAdminSession) {
    return (
      <AppCard tone="soft" padding="lg" className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Akses dibatasi</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Buka sebagai Humas Admin untuk mengelola unit organisasi.
        </p>
      </AppCard>
    );
  }

  if ((runtimeQuery.isLoading || counterQuery.isLoading) && canPersistChanges) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {["Total unit", "Konfigurasi aktif", "Unit dengan hari libur", "Perlu cek"].map(
          (label) => (
            <AppStatCard
              key={label}
              label={label}
              value="..."
              description="Memuat data unit"
            />
          ),
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {runtimeQuery.isError && !hasVisibleDirectoryData ? (
        <AppCard tone="soft" padding="md" className="rounded-[24px]">
          <p className="text-sm font-semibold text-foreground">Data belum dapat dimuat</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Coba muat ulang halaman setelah koneksi kembali normal.
          </p>
        </AppCard>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <AppStatCard
          label="Total Unit"
          value={String(totalUnits)}
          description="Direktori unit yang terbaca."
        />
        <AppStatCard
          label="Konfigurasi Aktif"
          value={String(configuredUnits)}
          description="Unit yang sudah dikonfigurasi."
          tone="success"
        />
        <AppStatCard
          label="Hari Libur Unit"
          value={String(unitsWithHolidays)}
          description="Unit yang punya kalender khusus."
          tone={unitsWithHolidays > 0 ? "info" : "neutral"}
        />
        <AppStatCard
          label="Perlu Cek"
          value={String(attentionCount)}
          description="Unit yang perlu dirapikan."
          tone={attentionCount > 0 ? "warning" : "success"}
        />
      </div>

      <AppFilterBar
        actions={
          <>
            <AppButton variant="outline" onClick={resetFilters} disabled={!activeFilterCount}>
              <RefreshCw className="size-4" />
              Reset Filter
            </AppButton>
            <AppButton onClick={() => openUnitEditor("new")} disabled={!canPersistChanges}>
              <Plus className="size-4" />
              Unit Baru
            </AppButton>
          </>
        }
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <AppInput
            id="admin-unor-search"
            placeholder="Cari unit..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-11 pl-10 pr-11"
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
        <AppFilterTrigger
          icon={SlidersHorizontal}
          label="Filter"
          count={activeFilterCount}
          active={showAdvancedFilters}
          onClick={() => setShowAdvancedFilters((currentValue) => !currentValue)}
        />
      </AppFilterBar>

      {showAdvancedFilters ? (
        <div className="grid gap-3 rounded-[calc(var(--radius-2xl)+4px)] border border-border bg-surface-container-lowest p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <AppSearchSelect
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as UnitStatusFilter)}
            options={statusFilterOptions}
            placeholder="Semua status"
            searchPlaceholder="Cari status"
            emptyMessage="Status tidak ditemukan."
            className="w-full"
          />
          <AppSearchSelect
            value={unitTypeFilter}
            onValueChange={(value) => setUnitTypeFilter(value as UnitTypeFilter)}
            options={unitTypeFilterOptions}
            placeholder="Semua jenis"
            searchPlaceholder="Cari jenis"
            emptyMessage="Jenis unit tidak ditemukan."
            className="w-full"
          />
          <div className="flex items-end justify-end">
            <AppButton size="sm" variant="ghost" onClick={resetFilters} disabled={!activeFilterCount}>
              Reset filter
            </AppButton>
          </div>
        </div>
      ) : null}

      {activeFilterCount ? (
        <div className="flex flex-wrap items-center gap-2">
          {searchQuery.trim() ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
              Cari: {searchQuery.trim()}
            </span>
          ) : null}
          {statusFilter !== "all" ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
              {getUnitStatusFilterLabel(statusFilter)}
            </span>
          ) : null}
          {unitTypeFilter !== "all" ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
              {getUnitTypeFilterLabel(unitTypeFilter)}
            </span>
          ) : null}
        </div>
      ) : null}

      <AppCard padding="lg" className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            Unit organisasi
          </p>
          <AppCardTitle className="text-2xl">Daftar unit organisasi</AppCardTitle>
          <AppCardDescription>
            Kelola master unit, kapasitas harian, relasi layanan, dan kalender kerja dari satu panel.
          </AppCardDescription>
        </div>

        <AppTable className="table-fixed">
          <AppTableHead>
            <tr>
              <AppTableHeaderCell className="w-[26%]">Unit</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[18%]">Layanan</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[16%]">Petugas</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[16%]">Kalender</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[12%]">Status</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[12%]">Aksi</AppTableHeaderCell>
            </tr>
          </AppTableHead>
          <tbody>
            {filteredUnits.length ? (
              filteredUnits.map((unit) => {
                const status = getUnitStatus(unit);
                const issues = buildUnitIssues(unit);
                const isSelected = selectedUnitId === unit.id;
                const canDeleteMeaningfully =
                  unit.explicitConfig ||
                  (!unit.isDefaultUnit &&
                    unit.staffCount === 0 &&
                    unit.ownedServices.length === 0);

                return (
                  <AppTableRow
                    key={unit.id}
                    className={isSelected ? "bg-role-accent-soft/25" : undefined}
                  >
                    <AppTableCell className="space-y-1">
                      <p className="font-semibold text-foreground">{unit.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {unit.id} · {unit.shortName}
                      </p>
                    </AppTableCell>
                    <AppTableCell className="space-y-1">
                      <p className="font-medium text-foreground">
                        {unit.ownedServices.length} layanan
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {unit.serviceIds.length} relasi aktif
                      </p>
                    </AppTableCell>
                    <AppTableCell className="space-y-1">
                      <p className="font-medium text-foreground">
                        {unit.staffCount} petugas
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {unit.activeCounterCount} loket aktif · {unit.isDefaultUnit ? "Unit default" : "Unit custom"}
                      </p>
                    </AppTableCell>
                    <AppTableCell className="space-y-1">
                      <p className="font-medium text-foreground">
                        {unit.dailyQuota} booking / hari
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {unit.holidays.length} hari libur
                      </p>
                    </AppTableCell>
                    <AppTableCell className="space-y-2">
                      <AppStatusBadge status={status.tone} label={status.label} />
                      {issues.length ? (
                        <p className="text-xs leading-5 text-muted-foreground">
                          {issues.join(" · ")}
                        </p>
                      ) : null}
                    </AppTableCell>
                    <AppTableCell>
                      <div className="flex flex-wrap gap-2">
                        <AppButton
                          size="xs"
                          variant="outline"
                          onClick={() => openUnitEditor(unit.id)}
                        >
                          <PencilLine className="size-3.5" />
                          Edit
                        </AppButton>
                        <AppButton
                          size="xs"
                          variant="ghost"
                          disabled={!canPersistChanges || !canDeleteMeaningfully}
                          loading={rowBusyKey === `${unit.id}:delete`}
                          loadingLabel="Menghapus..."
                          onClick={() => setDeleteTarget(unit)}
                        >
                          <Trash2 className="size-3.5" />
                          Hapus
                        </AppButton>
                      </div>
                    </AppTableCell>
                  </AppTableRow>
                );
              })
            ) : (
              <AppTableRow>
                <AppTableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Belum ada unit yang cocok dengan filter aktif.
                </AppTableCell>
              </AppTableRow>
            )}
          </tbody>
        </AppTable>
      </AppCard>

      <AppDialog
        open={editorOpen}
        onOpenChange={handleEditorOpenChange}
        title={isCreateMode ? "Tambah unit organisasi" : "Ubah unit organisasi"}
        className="max-w-5xl"
        description={
          isCreateMode
            ? "Tambahkan master unit dan kalender kerjanya."
            : "Ubah unit tanpa mengacaukan hierarki panel utama."
        }
      >
        <div className="space-y-4">
          <AdminEditorSection
            eyebrow="Identitas unit"
            title="Data dasar unit organisasi"
            description="Gunakan identitas resmi yang dipakai lintas modul."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AdminFormField
                label="ID unit"
                error={validationErrors.id}
                controlId="admin-unor-id"
              >
                <AppInput
                  id="admin-unor-id"
                  value={draft.id}
                  placeholder={isCreateMode ? "D51 atau BIRO-01" : undefined}
                  disabled={!isCreateMode || !canPersistChanges || saveMutation.isPending}
                  onChange={(event) =>
                    setDraft((currentValue) => ({
                      ...currentValue,
                      id: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </AdminFormField>

              <AdminFormField
                label="Nama singkat"
                error={validationErrors.shortName}
                controlId="admin-unor-short-name"
              >
                <AppInput
                  id="admin-unor-short-name"
                  value={draft.shortName}
                  disabled={!canPersistChanges || saveMutation.isPending}
                  onChange={(event) =>
                    setDraft((currentValue) => ({
                      ...currentValue,
                      shortName: event.target.value,
                    }))
                  }
                />
              </AdminFormField>

              <AdminFormField
                label="Nama unit"
                error={validationErrors.name}
                controlId="admin-unor-name"
                className="md:col-span-2"
              >
                <AppInput
                  id="admin-unor-name"
                  value={draft.name}
                  disabled={!canPersistChanges || saveMutation.isPending}
                  onChange={(event) =>
                    setDraft((currentValue) => ({
                      ...currentValue,
                      name: event.target.value,
                    }))
                  }
                />
              </AdminFormField>

              <AdminFormField
                label="Kapasitas harian"
                error={validationErrors.dailyQuota}
                controlId="admin-unor-daily-quota"
              >
                <AppInput
                  id="admin-unor-daily-quota"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={draft.dailyQuota}
                  disabled={!canPersistChanges || saveMutation.isPending}
                  onChange={(event) =>
                    setDraft((currentValue) => ({
                      ...currentValue,
                      dailyQuota: event.target.value,
                    }))
                  }
                />
              </AdminFormField>

              <AdminFormField label="Jenis unit">
                <div className="flex min-h-12 items-center rounded-[var(--radius-xl)] border border-input bg-surface-container-low px-4 text-sm font-medium text-foreground">
                  {selectedUnit?.isDefaultUnit
                    ? "Unit bawaan"
                    : isCreateMode
                      ? "Unit baru"
                      : "Unit tambahan"}
                </div>
              </AdminFormField>
            </div>
          </AdminEditorSection>

          {lastHolidayImpact ? (
            <AppNotice
              icon={CalendarDays}
              title="Dampak jadwal libur"
              description={
                lastHolidayImpact.cancelledCount > 0
                  ? `${lastHolidayImpact.cancelledCount} booking terdampak karena hari libur baru.`
                  : "Perubahan hari libur terakhir tidak membatalkan booking aktif."
              }
              tone={lastHolidayImpact.cancelledCount > 0 ? "warning" : "role"}
            />
          ) : null}

          <AdminEditorSection
            eyebrow="Loket operasional"
            title="Loket yang bisa dipakai unit"
            description="Loket dipakai untuk membagi operator unit pada satu pool antrean yang sama."
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm leading-6 text-muted-foreground">
                Gunakan nomor loket yang akan diumumkan ke pengguna saat antrean dipanggil.
              </p>
              <AppButton
                type="button"
                variant="outline"
                onClick={addCounter}
                disabled={!canPersistChanges || saveMutation.isPending}
              >
                <Plus className="size-4" />
                Tambah Loket
              </AppButton>
            </div>

            {draft.counters.length ? (
              <div className="grid gap-3">
                {draft.counters.map((counter, index) => (
                  <div
                    key={counter.id ?? `draft-counter-${index}`}
                    className="grid gap-3 rounded-[20px] border border-border bg-surface-container-low px-4 py-4 md:grid-cols-[120px_minmax(0,1fr)_120px_auto]"
                  >
                    <AdminFormField
                      label="Nomor"
                      controlId={`admin-unor-counter-number-${index}`}
                    >
                      <AppInput
                        id={`admin-unor-counter-number-${index}`}
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={counter.counterNumber}
                        disabled={!canPersistChanges || saveMutation.isPending}
                        onChange={(event) =>
                          updateCounter(index, {
                            counterNumber: event.target.value,
                          })
                        }
                      />
                    </AdminFormField>

                    <AdminFormField
                      label="Label loket"
                      controlId={`admin-unor-counter-label-${index}`}
                    >
                      <AppInput
                        id={`admin-unor-counter-label-${index}`}
                        value={counter.label}
                        disabled={!canPersistChanges || saveMutation.isPending}
                        onChange={(event) =>
                          updateCounter(index, {
                            label: event.target.value,
                          })
                        }
                      />
                    </AdminFormField>

                    <label className="flex items-end justify-between gap-3 rounded-[16px] border border-border bg-surface-container-lowest px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">Aktif</p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          Loket aktif bisa dipilih operator unit.
                        </p>
                      </div>
                      <AppCheckbox
                        checked={counter.active}
                        disabled={!canPersistChanges || saveMutation.isPending}
                        onChange={(event) =>
                          updateCounter(index, {
                            active: event.target.checked,
                          })
                        }
                      />
                    </label>

                    <div className="flex items-end justify-end">
                      <AppButton
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() => removeCounter(index)}
                        disabled={!canPersistChanges || saveMutation.isPending}
                      >
                        <Trash2 className="size-3.5" />
                        Hapus
                      </AppButton>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <AppNotice
                icon={BriefcaseBusiness}
                title="Belum ada loket"
                description="Unit tetap bisa disimpan lebih dulu, tetapi operator unit belum bisa dibagi per loket sebelum daftar ini diisi."
                tone="warning"
              />
            )}

            {validationErrors.counters ? (
              <p className="text-sm font-medium text-danger">
                {validationErrors.counters}
              </p>
            ) : null}
          </AdminEditorSection>

          <AdminEditorSection
            eyebrow="Relasi layanan"
            title="Layanan yang dimiliki unit"
            description="Pilih layanan yang memang menjadi milik unit ini."
          >
            {currentUnitId ? null : (
              <AppNotice
                icon={BriefcaseBusiness}
                title="Tentukan ID unit terlebih dahulu"
                description="Daftar layanan akan muncul setelah ID unit diisi."
              />
            )}

            {currentUnitId && eligibleServices.length === 0 ? (
              <AppNotice
                icon={BriefcaseBusiness}
                title="Belum ada layanan pada unit ini"
                description="Unit tetap dapat disimpan terlebih dahulu."
                tone="warning"
              />
            ) : null}

            {eligibleServices.length ? (
              <div className="grid gap-3">
                {eligibleServices.map((service) => (
                  <label
                    key={service.id}
                    className="flex items-start gap-3 rounded-[20px] border border-border bg-surface-container-low px-4 py-3"
                  >
                    <AppCheckbox
                      checked={draft.serviceIds.includes(service.id)}
                      disabled={!canPersistChanges || saveMutation.isPending}
                      onChange={(event) =>
                        toggleService(service.id, event.target.checked)
                      }
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {service.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {service.id} · {service.enabled ? "Aktif" : "Nonaktif"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            ) : null}

            {orphanDraftServiceIds.length ? (
              <div className="space-y-3">
                <AppNotice
                  icon={AlertCircle}
                  title="Relasi layanan perlu ditinjau"
                  description="Masih ada layanan yang tidak sesuai dengan unit ini."
                  tone="warning"
                />
                <div className="flex flex-wrap gap-2">
                  {orphanDraftServiceIds.map((serviceId) => (
                    <AppButton
                      key={serviceId}
                      size="xs"
                      variant="outline"
                      onClick={() => removeOrphanService(serviceId)}
                      disabled={!canPersistChanges || saveMutation.isPending}
                    >
                      <Trash2 className="size-3.5" />
                      Lepas {serviceId}
                    </AppButton>
                  ))}
                </div>
              </div>
            ) : null}
          </AdminEditorSection>

          <AdminEditorSection
            eyebrow="Kalender kerja"
            title="Hari libur unit"
            description="Tanggal di sini hanya berlaku untuk unit ini."
          >
            <AdminFormField
              label="Tambah hari libur"
              error={validationErrors.holidays}
              controlId="admin-unor-holiday"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <AppInput
                  id="admin-unor-holiday"
                  type="date"
                  value={holidayInput}
                  disabled={!canPersistChanges || saveMutation.isPending}
                  onChange={(event) => setHolidayInput(event.target.value)}
                />
                <AppButton
                  type="button"
                  variant="outline"
                  onClick={addHoliday}
                  disabled={!canPersistChanges || saveMutation.isPending}
                >
                  <Plus className="size-4" />
                  Tambah
                </AppButton>
              </div>
            </AdminFormField>

            {draft.holidays.length ? (
              <div className="space-y-3">
                {draft.holidays.map((holiday) => (
                  <div
                    key={holiday.date}
                    className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-surface-container-low px-4 py-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {formatHolidayDateLabel(holiday.date)}
                      </p>
                      <p className="text-xs text-muted-foreground">{holiday.date}</p>
                    </div>
                    <AppButton
                      size="xs"
                      variant="ghost"
                      onClick={() => removeHoliday(holiday.date)}
                      disabled={!canPersistChanges || saveMutation.isPending}
                    >
                      <Trash2 className="size-3.5" />
                      Hapus
                    </AppButton>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada hari libur khusus untuk unit ini.
              </p>
            )}
          </AdminEditorSection>

          <div className="flex flex-wrap gap-3">
            <AppButton
              variant="outline"
              onClick={() => setResetConfirmOpen(true)}
              disabled={!isDirty || saveMutation.isPending}
            >
              <RefreshCw className="size-4" />
              Reset Draft
            </AppButton>
            <AppButton
              onClick={() => void handleSave()}
              loading={saveMutation.isPending}
              loadingLabel="Menyimpan..."
              disabled={!canPersistChanges || !isDirty || hasValidationErrors}
            >
              <Save className="size-4" />
              {isCreateMode ? "Buat Unit" : "Simpan Perubahan"}
            </AppButton>
          </div>
        </div>
      </AppDialog>

      <AppDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Hapus konfigurasi unit"
        description={
          deleteTarget
            ? `Konfigurasi unit ${deleteTarget.name} (${deleteTarget.id}) akan dihapus.`
            : "Pastikan konfigurasi unit ini sudah tidak dipakai."
        }
      >
        <div className="space-y-6">
          <AppNotice
            icon={AlertCircle}
            title="Periksa data terkait"
            description={
              deleteTarget
                ? `${deleteTarget.ownedServices.length} layanan katalog dan ${deleteTarget.staffCount} petugas masih terhubung dengan unit ini.`
                : "Pastikan data terkait sudah diperiksa."
            }
            tone="danger"
          />
          <div className="flex flex-wrap justify-end gap-3">
            <AppButton variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </AppButton>
            <AppButton
              variant="destructive"
              onClick={() => void handleDelete()}
              loading={deleteTarget != null && rowBusyKey === `${deleteTarget.id}:delete`}
              loadingLabel="Menghapus..."
              disabled={!canPersistChanges}
            >
              <Trash2 className="size-4" />
              Hapus konfigurasi
            </AppButton>
          </div>
        </div>
      </AppDialog>

      <AppConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Kembalikan draft unit?"
        description="Perubahan yang belum disimpan akan dibuang dan form kembali ke data terakhir yang tersimpan."
        confirmLabel="Kembalikan Draft"
        confirmVariant="default"
        onConfirm={async () => {
          setResetConfirmOpen(false);
          await handleResetDraft();
        }}
      />
    </div>
  );
}
