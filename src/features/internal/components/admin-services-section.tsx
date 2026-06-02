"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
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
import { AppCheckbox } from "@/components/ui/app-checkbox";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import {
  AppCard,
  AppCardDescription,
  AppCardTitle,
} from "@/components/ui/app-card";
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
import { AppTextarea } from "@/components/ui/app-textarea";
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
import {
  createService,
  deleteService,
  getAdminServiceCatalogMeta,
  updateService,
} from "@/lib/api/admin-services";
import {
  type AdminServiceLevelEntry,
  getAdminServiceLevels,
  saveAdminServiceLevel,
} from "@/lib/api/admin-service-levels";
import { getScopedData } from "@/lib/api/services";
import { useHydrated } from "@/hooks/use-hydrated";

type AdminUnitOption = {
  id: string;
  label: string;
  shortName: string;
};

type AdminServiceRecord = {
  id: string;
  name: string;
  prefix: string;
  description: string;
  enabled: boolean;
  serviceLevel: 1 | 2;
  slotDurationMinutes: number;
  dailyQuota: number;
  unorId: string;
  unitLabel: string;
  createdAt: string;
  updatedAt: string;
  source: "live" | "fallback";
};

type AdminServicesDirectory = {
  units: AdminUnitOption[];
  services: AdminServiceRecord[];
};

type AdminServiceDraft = {
  id: string;
  name: string;
  prefix: string;
  description: string;
  enabled: boolean;
  serviceLevel: 1 | 2;
  slotDurationEnabled: boolean;
  slotDurationMinutes: string;
  dailyQuota: string;
  unorId: string;
};

type ServiceFieldErrors = {
  id?: string;
  name?: string;
  prefix?: string;
  unorId?: string;
  slotDurationMinutes?: string;
  dailyQuota?: string;
};

type ServiceStatusFilter = "all" | "active" | "inactive" | "attention";
type ServiceLevelLookup = Map<string, 1 | 2>;

type AdminServiceLevelsQueryData = {
  serviceLevels: AdminServiceLevelEntry[];
};

type AdminServiceCatalogMetaQueryData = {
  services: Array<{
    id: string;
    createdAt: string;
    updatedAt: string;
  }>;
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

function compareAdminServiceRecords(left: AdminServiceRecord, right: AdminServiceRecord) {
  const leftCreatedAt = left.createdAt.trim();
  const rightCreatedAt = right.createdAt.trim();
  const createdAtComparison = rightCreatedAt.localeCompare(leftCreatedAt);
  if (createdAtComparison !== 0) {
    return createdAtComparison;
  }

  const leftUpdatedAt = left.updatedAt.trim();
  const rightUpdatedAt = right.updatedAt.trim();
  const updatedAtComparison = rightUpdatedAt.localeCompare(leftUpdatedAt);
  if (updatedAtComparison !== 0) {
    return updatedAtComparison;
  }

  if (left.source !== right.source) {
    return left.source === "live" ? -1 : 1;
  }

  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}

function normalizeUnitOptions(rawUnits: unknown, includeFallback = true) {
  const merged = new Map<string, AdminUnitOption>();

  if (includeFallback) {
    for (const entry of bookingUnitEntries) {
      merged.set(entry.id, {
        id: entry.id,
        label: entry.label,
        shortName: entry.groupLabel,
      });
    }
  }

  if (Array.isArray(rawUnits)) {
    for (const entry of rawUnits) {
      if (!isRecord(entry)) continue;
      const id = asString(entry.id).trim().toUpperCase();
      if (!id) continue;
      merged.set(id, {
        id,
        label: asString(entry.name, id).trim() || id,
        shortName: asString(entry.shortName, asString(entry.name, id)).trim() || id,
      });
    }
  }

  merged.set("UNASSIGNED", {
    id: "UNASSIGNED",
    label: "Belum ditetapkan",
    shortName: "Unassigned",
  });

  return Array.from(merged.values()).sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

function normalizeServiceRecords(
  rawServices: unknown,
  units: AdminUnitOption[],
  includeFallback = true,
) {
  const merged = new Map<string, AdminServiceRecord>();

  if (includeFallback) {
    for (const service of bookingServices) {
      const normalized = normalizeServiceRecord(
        {
          id: service.id,
          name: service.title,
          prefix: service.id,
          description: service.description,
          enabled: true,
          serviceLevel: service.serviceLevel,
          slotDurationMinutes: service.durationMinutes,
          dailyQuota: service.dailyQuota,
          unorId: service.unitId,
        },
        units,
        "fallback",
      );

      if (normalized) {
        merged.set(normalized.id, normalized);
      }
    }
  }

  if (Array.isArray(rawServices)) {
    for (const service of rawServices) {
      const normalized = normalizeServiceRecord(service, units, "live");
      if (!normalized) {
        continue;
      }

      merged.set(normalized.id, normalized);
    }
  }

  return Array.from(merged.values()).sort(compareAdminServiceRecords);
}

function normalizeServiceRecord(
  rawService: unknown,
  units: AdminUnitOption[],
  source: "live" | "fallback",
): AdminServiceRecord | null {
  if (!isRecord(rawService)) {
    return null;
  }

  const id = asString(rawService.id).trim().toUpperCase();
  if (!id) {
    return null;
  }

  const catalogService = getBookingServiceById(id);
  const unorId = asString(rawService.unorId, catalogService?.unitId ?? "UNASSIGNED")
    .trim()
    .toUpperCase() || "UNASSIGNED";
  const unitLabel =
    units.find((unit) => unit.id === unorId)?.label ||
    getBookingUnitEntryById(unorId)?.label ||
    (unorId === "UNASSIGNED" ? "Belum ditetapkan" : unorId);
  const normalizedLevel =
    rawService.serviceLevel === 2 || catalogService?.serviceLevel === 2 ? 2 : 1;

  return {
    id,
    name: asString(rawService.name, catalogService?.title ?? id).trim() || id,
    prefix: asString(rawService.prefix, id).trim() || id,
    description: asString(rawService.description, catalogService?.description ?? "").trim(),
    enabled:
      typeof rawService.enabled === "boolean"
        ? rawService.enabled
        : catalogService != null,
    serviceLevel: normalizedLevel,
    slotDurationMinutes: asNumber(
      rawService.slotDurationMinutes,
      catalogService?.durationMinutes ?? 30,
    ),
    dailyQuota: asNumber(rawService.dailyQuota, catalogService?.dailyQuota ?? 0),
    unorId,
    unitLabel,
    createdAt: asString(rawService.createdAt, asString(rawService.created_at)).trim(),
    updatedAt: asString(rawService.updatedAt, asString(rawService.updated_at)).trim(),
    source,
  };
}

function normalizeAdminServicesDirectory(
  payload: unknown,
  includeFallback = true,
): AdminServicesDirectory {
  const root = isRecord(payload) ? payload : {};
  const data = isRecord(root.data) ? root.data : root;
  const units = normalizeUnitOptions(data.units, includeFallback);
  const services = normalizeServiceRecords(data.services, units, includeFallback);
  const mergedUnits = new Map(units.map((unit) => [unit.id, unit] as const));

  for (const service of services) {
    if (mergedUnits.has(service.unorId) || service.unorId === "UNASSIGNED") {
      continue;
    }

    mergedUnits.set(service.unorId, {
      id: service.unorId,
      label: service.unitLabel,
      shortName: getBookingUnitEntryById(service.unorId)?.groupLabel ?? service.unorId,
    });
  }

  return {
    units: Array.from(mergedUnits.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    ),
    services,
  };
}

function buildFallbackDirectory(): AdminServicesDirectory {
  const units = normalizeUnitOptions([]);
  const services = bookingServices
    .map((service) =>
      normalizeServiceRecord(
        {
          id: service.id,
          name: service.title,
          prefix: service.id,
          description: service.description,
          enabled: true,
          serviceLevel: service.serviceLevel,
          slotDurationMinutes: service.durationMinutes,
          dailyQuota: service.dailyQuota,
          unorId: service.unitId,
        },
        units,
        "fallback",
      ),
    )
    .filter((service): service is AdminServiceRecord => service !== null)
    .sort((left, right) => left.name.localeCompare(right.name));

  return { units, services };
}

function buildServiceDraft(service: AdminServiceRecord | null): AdminServiceDraft {
  const serviceLevel = service?.serviceLevel ?? 1;
  return {
    id: service?.id ?? "",
    name: service?.name ?? "",
    prefix: service?.prefix ?? "",
    description: service?.description ?? "",
    enabled: service?.enabled ?? true,
    serviceLevel,
    slotDurationEnabled: service == null ? true : service.slotDurationMinutes > 0,
    slotDurationMinutes:
      service != null
        ? String(service.slotDurationMinutes > 0 ? service.slotDurationMinutes : 30)
        : "30",
    dailyQuota: service != null ? String(service.dailyQuota) : "20",
    unorId: service?.unorId ?? "UNASSIGNED",
  };
}

function validateServiceDraft(
  draft: AdminServiceDraft,
  isCreateMode: boolean,
): ServiceFieldErrors {
  const errors: ServiceFieldErrors = {};
  const slotDurationMinutes = Number.parseInt(draft.slotDurationMinutes, 10);
  const dailyQuota = Number.parseInt(draft.dailyQuota, 10);

  if (isCreateMode) {
    if (!draft.id.trim()) {
      errors.id = "ID layanan wajib diisi.";
    } else if (!/^[A-Z0-9-]+$/.test(draft.id.trim().toUpperCase())) {
      errors.id = "Gunakan huruf kapital, angka, atau tanda hubung.";
    }
  }

  if (!draft.name.trim()) {
    errors.name = "Nama layanan wajib diisi.";
  }

  if (!draft.prefix.trim()) {
    errors.prefix = "Prefix layanan wajib diisi.";
  }

  if (draft.slotDurationEnabled && (!Number.isInteger(slotDurationMinutes) || slotDurationMinutes < 1)) {
    errors.slotDurationMinutes =
      "Durasi slot aktif harus berupa angka 1 atau lebih.";
  }

  if (!Number.isInteger(dailyQuota) || dailyQuota < 0) {
    errors.dailyQuota = "Kuota harian harus berupa angka 0 atau lebih.";
  }

  return errors;
}

function buildServiceIssues(service: AdminServiceRecord) {
  const issues: string[] = [];

  if (!service.enabled) {
    issues.push("Layanan nonaktif");
  }
  if (!service.unorId || service.unorId === "UNASSIGNED") {
    issues.push("Unit belum ditetapkan");
  }
  if (service.slotDurationMinutes <= 0) {
    issues.push("Durasi slot 0 menit");
  }
  if (service.dailyQuota <= 0) {
    issues.push("Kuota harian 0");
  }

  return issues;
}

function getServiceStatus(service: AdminServiceRecord) {
  const issues = buildServiceIssues(service);

  if (!service.enabled) {
    return { tone: "warning" as const, label: "Nonaktif" };
  }

  if (issues.length > 0) {
    return { tone: "diproses" as const, label: "Perlu cek" };
  }

  return { tone: "aktif" as const, label: "Aktif" };
}

function getServiceStatusFilterLabel(filter: ServiceStatusFilter) {
  switch (filter) {
    case "active":
      return "Aktif";
    case "inactive":
      return "Nonaktif";
    case "attention":
      return "Perlu cek";
    default:
      return "Semua status";
  }
}

function upsertAdminServiceLevelEntry(
  currentEntries: AdminServiceLevelEntry[],
  nextEntry: AdminServiceLevelEntry,
) {
  const filteredEntries = currentEntries.filter(
    (entry) => entry.serviceId !== nextEntry.serviceId,
  );

  return [...filteredEntries, nextEntry].sort((left, right) =>
    left.serviceId.localeCompare(right.serviceId),
  );
}

async function invalidateAdminServiceQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin-services-directory"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-service-levels"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-service-catalog-meta"] }),
    queryClient.invalidateQueries({ queryKey: ["booking-runtime-data"] }),
    queryClient.invalidateQueries({ queryKey: ["offline-visitor-runtime"] }),
    queryClient.invalidateQueries({ queryKey: ["staff-live-appointments"] }),
    queryClient.invalidateQueries({ queryKey: ["user-live-appointments"] }),
  ]);
}

export function AdminServicesSection() {
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
  const fallbackDirectory = React.useMemo(() => buildFallbackDirectory(), []);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [unitFilter, setUnitFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] =
    React.useState<ServiceStatusFilter>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);
  const [selectedServiceId, setSelectedServiceId] = React.useState<string | "new" | null>(
    null,
  );
  const [draft, setDraft] = React.useState<AdminServiceDraft>(() =>
    buildServiceDraft(null),
  );
  const [deleteTarget, setDeleteTarget] =
    React.useState<AdminServiceRecord | null>(null);
  const [rowBusyKey, setRowBusyKey] = React.useState<string | null>(null);

  const servicesQuery = useQuery({
    queryKey: ["admin-services-directory", session?.staffId ?? "anonymous"],
    enabled: Boolean(hydrated && canPersistChanges && session?.staffId),
    queryFn: () => getScopedData({ staffId: session?.staffId ?? undefined }),
    staleTime: 60_000,
  });
  const serviceLevelsQuery = useQuery({
    queryKey: ["admin-service-levels", session?.staffId ?? "anonymous"],
    enabled: Boolean(hydrated && canPersistChanges && session?.staffId),
    queryFn: getAdminServiceLevels,
    staleTime: 60_000,
  });
  const serviceCatalogMetaQuery = useQuery({
    queryKey: ["admin-service-catalog-meta", session?.staffId ?? "anonymous"],
    enabled: Boolean(hydrated && canPersistChanges && session?.staffId),
    queryFn: getAdminServiceCatalogMeta,
    staleTime: 60_000,
  });
  const serviceLevelLookup = React.useMemo<ServiceLevelLookup>(
    () =>
      new Map(
        (serviceLevelsQuery.data?.serviceLevels ?? []).map((entry) => [
          entry.serviceId,
          entry.serviceLevel,
        ]),
      ),
    [serviceLevelsQuery.data],
  );
  const serviceCatalogMetaLookup = React.useMemo(
    () =>
      new Map(
        (serviceCatalogMetaQuery.data?.services ?? []).map((entry) => [
          entry.id,
          entry,
        ]),
      ),
    [serviceCatalogMetaQuery.data],
  );

  const liveDirectory = React.useMemo(
    () => normalizeAdminServicesDirectory(servicesQuery.data?.data, false),
    [servicesQuery.data],
  );
  const usesLiveDirectory = canPersistChanges;
  const directory = React.useMemo(() => {
    const baseDirectory = usesLiveDirectory ? liveDirectory : fallbackDirectory;

    if (!serviceLevelLookup.size) {
      return {
        ...baseDirectory,
        services: baseDirectory.services
          .map((service) => {
            const serviceMeta = serviceCatalogMetaLookup.get(service.id);
            return {
              ...service,
              createdAt: serviceMeta?.createdAt || service.createdAt,
              updatedAt: serviceMeta?.updatedAt || service.updatedAt,
            };
          })
          .sort(compareAdminServiceRecords),
      };
    }

    return {
      ...baseDirectory,
      services: baseDirectory.services
        .map((service) => {
          const serviceMeta = serviceCatalogMetaLookup.get(service.id);
          return {
            ...service,
            serviceLevel: serviceLevelLookup.get(service.id) ?? service.serviceLevel,
            createdAt: serviceMeta?.createdAt || service.createdAt,
            updatedAt: serviceMeta?.updatedAt || service.updatedAt,
          };
        })
        .sort(compareAdminServiceRecords),
    };
  }, [fallbackDirectory, liveDirectory, serviceCatalogMetaLookup, serviceLevelLookup, usesLiveDirectory]);
  const services = directory.services;
  const unitOptions = directory.units;
  const hasVisibleDirectoryData =
    services.length > 0 || unitOptions.some((unit) => unit.id !== "UNASSIGNED");

  const unitFilterOptions = React.useMemo<AppSearchSelectOption[]>(
    () => [
      { value: "all", label: "Semua unit" },
      ...unitOptions.map((unit) => ({
        value: unit.id,
        label: unit.label,
        keywords: [unit.shortName, unit.id],
      })),
    ],
    [unitOptions],
  );

  const serviceUnitOptions = React.useMemo<AppSearchSelectOption[]>(
    () =>
      unitOptions.map((unit) => ({
        value: unit.id,
        label: unit.label,
        keywords: [unit.shortName, unit.id],
      })),
    [unitOptions],
  );

  const statusFilterOptions = React.useMemo<AppSearchSelectOption[]>(
    () => [
      { value: "all", label: "Semua status" },
      { value: "active", label: "Aktif", keywords: ["aktif", "open"] },
      { value: "inactive", label: "Nonaktif", keywords: ["mati", "closed"] },
      { value: "attention", label: "Perlu cek", keywords: ["cek", "warning"] },
    ],
    [],
  );

  const filteredServices = React.useMemo(() => {
    return services.filter((service) => {
      if (
        unitFilter !== "all" &&
        service.unorId !== unitFilter
      ) {
        return false;
      }

      if (statusFilter === "active" && !service.enabled) {
        return false;
      }

      if (statusFilter === "inactive" && service.enabled) {
        return false;
      }

      if (statusFilter === "attention" && buildServiceIssues(service).length === 0) {
        return false;
      }

      if (!searchQuery.trim()) {
        return true;
      }

      const normalizedQuery = searchQuery.trim().toLowerCase();
      return [
        service.id,
        service.name,
        service.prefix,
        service.unitLabel,
        service.description,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [searchQuery, services, statusFilter, unitFilter]);

  const selectedService =
    selectedServiceId && selectedServiceId !== "new"
      ? services.find((service) => service.id === selectedServiceId) ?? null
      : null;
  const isCreateMode = selectedServiceId === "new";
  const baseDraft = React.useMemo(
    () => buildServiceDraft(isCreateMode ? null : selectedService),
    [isCreateMode, selectedService],
  );
  const isDirty = JSON.stringify(draft) !== JSON.stringify(baseDraft);
  const validationErrors = React.useMemo(
    () => validateServiceDraft(draft, isCreateMode),
    [draft, isCreateMode],
  );
  const hasValidationErrors = Object.values(validationErrors).some(Boolean);
  const activeFilterCount = [
    searchQuery.trim(),
    unitFilter !== "all",
    statusFilter !== "all",
  ].filter(Boolean).length;

  React.useEffect(() => {
    if (selectedServiceId === "new") {
      return;
    }

    if (!selectedServiceId) {
      if (services.length > 0) {
        setSelectedServiceId(services[0].id);
      }
      return;
    }

    if (!services.some((service) => service.id === selectedServiceId)) {
      setSelectedServiceId(services[0]?.id ?? null);
    }
  }, [selectedServiceId, services]);

  React.useEffect(() => {
    setDraft(baseDraft);
  }, [baseDraft]);

  const totalServices = services.length;
  const activeServices = services.filter((service) => service.enabled).length;
  const attentionCount = services.filter(
    (service) => buildServiceIssues(service).length > 0,
  ).length;
  const coveredUnitCount = new Set(
    services
      .map((service) => service.unorId)
      .filter((unorId) => unorId && unorId !== "UNASSIGNED"),
  ).size;

  const saveMutation = useMutation({
    mutationFn: async (currentDraft: AdminServiceDraft) => {
      if (!session?.staffId) {
        throw new Error("Masuk sebagai Humas Admin live terlebih dahulu.");
      }

      const payload = {
        id: currentDraft.id.trim().toUpperCase(),
        name: currentDraft.name.trim(),
        prefix: currentDraft.prefix.trim().toUpperCase(),
        description: currentDraft.description.trim(),
        enabled: currentDraft.enabled,
        slotDurationMinutes: currentDraft.slotDurationEnabled
          ? Number.parseInt(currentDraft.slotDurationMinutes, 10)
          : 0,
        dailyQuota: Number.parseInt(currentDraft.dailyQuota, 10),
        unorId: currentDraft.unorId,
      };

      const response = isCreateMode
        ? await createService(payload, { staffId: session.staffId })
        : await updateService(payload.id, payload, { staffId: session.staffId });

      const savedServiceLevel = await saveAdminServiceLevel(
        payload.id,
        currentDraft.serviceLevel,
      );

      return {
        response,
        savedServiceLevel,
      };
    },
    onSuccess: async ({ response, savedServiceLevel }) => {
      queryClient.setQueryData<AdminServiceLevelsQueryData>(
        ["admin-service-levels", session?.staffId ?? "anonymous"],
        (currentValue) => ({
          serviceLevels: upsertAdminServiceLevelEntry(
            currentValue?.serviceLevels ?? [],
            savedServiceLevel,
          ),
        }),
      );

      await invalidateAdminServiceQueries(queryClient);

      const service = normalizeServiceRecord(
        response.service,
        unitOptions,
        "live",
      );
      if (service) {
        setSelectedServiceId(service.id);
      }
      setEditorOpen(false);

      toast.success(
        isCreateMode
          ? "Layanan baru berhasil ditambahkan."
          : "Perubahan layanan berhasil disimpan.",
      );
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal menyimpan layanan.";
      toast.error(message);
    },
  });

  async function handleResetDraft() {
    setDraft(baseDraft);
    toast.success(
      isCreateMode
        ? "Form layanan baru dikembalikan ke default."
        : "Draft layanan dikembalikan ke data terakhir.",
    );
  }

  async function handleSave() {
    if (!canPersistChanges) {
      toast.error("Masuk sebagai Humas Admin live terlebih dahulu untuk menyimpan.");
      return;
    }

    if (hasValidationErrors) {
      toast.error("Periksa kembali field layanan yang wajib.");
      return;
    }

    await saveMutation.mutateAsync(draft);
  }

  async function handleToggleEnabled(service: AdminServiceRecord) {
    if (!session?.staffId) {
      toast.error("Masuk sebagai Humas Admin live terlebih dahulu.");
      return;
    }

    const busyKey = `${service.id}:toggle`;
    setRowBusyKey(busyKey);

    try {
      await updateService(
        service.id,
        { enabled: !service.enabled },
        { staffId: session.staffId },
      );
      await invalidateAdminServiceQueries(queryClient);
      toast.success(
        service.enabled
          ? "Layanan berhasil dinonaktifkan."
          : "Layanan berhasil diaktifkan.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal mengubah status layanan.";
      toast.error(message);
    } finally {
      setRowBusyKey(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !session?.staffId) {
      return;
    }

    const busyKey = `${deleteTarget.id}:delete`;
    setRowBusyKey(busyKey);

    try {
      await deleteService(deleteTarget.id, { staffId: session.staffId });
      await invalidateAdminServiceQueries(queryClient);
      toast.success("Layanan berhasil dihapus.");
      setDeleteTarget(null);
      if (selectedServiceId === deleteTarget.id) {
        setSelectedServiceId(null);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal menghapus layanan.";
      toast.error(message);
    } finally {
      setRowBusyKey(null);
    }
  }

  function openServiceEditor(serviceId: string | "new") {
    setSelectedServiceId(serviceId);
    setEditorOpen(true);
  }

  function resetFilters() {
    setSearchQuery("");
    setUnitFilter("all");
    setStatusFilter("all");
    setShowAdvancedFilters(false);
  }

  function handleEditorOpenChange(nextOpen: boolean) {
    setEditorOpen(nextOpen);

    if (!nextOpen) {
      setDraft(baseDraft);
    }
  }

  if (!hydrated) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {["Total layanan", "Layanan aktif", "Perlu cek", "Unit tercakup"].map(
          (label) => (
            <AppStatCard
              key={label}
              label={label}
              value="..."
              description="Menyiapkan katalog layanan"
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
          Buka sebagai Humas Admin untuk mengubah katalog layanan.
        </p>
      </AppCard>
    );
  }

  if (servicesQuery.isLoading && canPersistChanges) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {["Total layanan", "Layanan aktif", "Perlu cek", "Unit tercakup"].map(
          (label) => (
            <AppStatCard
              key={label}
              label={label}
              value="..."
              description="Memuat katalog layanan"
            />
          ),
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {servicesQuery.isError && !hasVisibleDirectoryData ? (
        <AppCard tone="soft" padding="md" className="rounded-[24px]">
          <p className="text-sm font-semibold text-foreground">Data belum dapat dimuat</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Coba muat ulang halaman setelah koneksi kembali normal.
          </p>
        </AppCard>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <AppStatCard
          label="Total Layanan"
          value={String(totalServices)}
          description="Data layanan aktif."
        />
        <AppStatCard
          label="Layanan Aktif"
          value={String(activeServices)}
          description="Masih bisa dipakai warga."
          tone="success"
        />
        <AppStatCard
          label="Perlu Cek"
          value={String(attentionCount)}
          description="Perlu dirapikan."
          tone={attentionCount > 0 ? "warning" : "success"}
        />
        <AppStatCard
          label="Unit Tercakup"
          value={String(coveredUnitCount)}
          description="Unit yang sudah terpakai."
          tone="info"
        />
      </div>

      <AppFilterBar
        actions={
          <>
            <AppButton variant="outline" onClick={resetFilters} disabled={!activeFilterCount}>
              <RefreshCw className="size-4" />
              Reset Filter
            </AppButton>
            <AppButton onClick={() => openServiceEditor("new")} disabled={!canPersistChanges}>
              <Plus className="size-4" />
              Layanan Baru
            </AppButton>
          </>
        }
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <AppInput
            id="admin-service-search"
            placeholder="Cari layanan..."
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
            value={unitFilter}
            onValueChange={setUnitFilter}
            options={unitFilterOptions}
            placeholder="Semua unit"
            searchPlaceholder="Cari unit"
            emptyMessage="Unit organisasi tidak ditemukan."
            className="w-full"
          />
          <AppSearchSelect
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as ServiceStatusFilter)}
            options={statusFilterOptions}
            placeholder="Semua status"
            searchPlaceholder="Cari status"
            emptyMessage="Status tidak ditemukan."
            className="w-full"
          />
          <div className="flex items-end justify-end">
            <AppButton size="sm" variant="ghost" onClick={resetFilters}>
              Reset filter
            </AppButton>
          </div>
        </div>
      ) : null}

      {activeFilterCount ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
            {searchQuery.trim() ? `Cari: ${searchQuery.trim()}` : "Semua layanan"}
          </span>
          {unitFilter !== "all" ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
              {unitOptions.find((unit) => unit.id === unitFilter)?.label ?? "Unit terpilih"}
            </span>
          ) : null}
          {statusFilter !== "all" ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
              {getServiceStatusFilterLabel(statusFilter)}
            </span>
          ) : null}
        </div>
      ) : null}

      <AppCard padding="lg" className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            Katalog layanan
          </p>
          <AppCardTitle className="text-2xl">Daftar layanan</AppCardTitle>
          <AppCardDescription>
            Edit layanan lewat popup, lalu simpan agar dipakai semua role.
          </AppCardDescription>
        </div>

        <AppTable className="table-fixed">
          <AppTableHead>
            <tr>
              <AppTableHeaderCell className="w-[14%]">ID</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[28%]">Layanan</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[18%]">Unit</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[14%]">Slot / Kuota</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[10%]">Status</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[16%]">Aksi</AppTableHeaderCell>
            </tr>
          </AppTableHead>
          <tbody>
            {filteredServices.length ? (
              filteredServices.map((service) => {
                const status = getServiceStatus(service);
                const issues = buildServiceIssues(service);
                const isSelected = selectedServiceId === service.id;

                return (
                  <AppTableRow
                    key={service.id}
                    className={isSelected ? "bg-role-accent-soft/25" : undefined}
                  >
                    <AppTableCell className="space-y-1">
                      <p className="font-semibold text-foreground">{service.id}</p>
                      <p className="text-xs text-muted-foreground">{service.prefix}</p>
                    </AppTableCell>
                    <AppTableCell className="space-y-1">
                      <p className="font-semibold text-foreground">{service.name}</p>
                      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {service.description || "Belum ada deskripsi layanan."}
                      </p>
                    </AppTableCell>
                    <AppTableCell className="space-y-1">
                      <p className="font-medium text-foreground">{service.unitLabel}</p>
                      <p className="text-xs text-muted-foreground">{service.unorId}</p>
                    </AppTableCell>
                    <AppTableCell className="space-y-1">
                      <p className="font-medium text-foreground">
                        {service.slotDurationMinutes} menit
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {service.dailyQuota} booking / hari
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
                          onClick={() => openServiceEditor(service.id)}
                        >
                          <PencilLine className="size-3.5" />
                          Edit
                        </AppButton>
                        <AppButton
                          size="xs"
                          variant="ghost"
                          disabled={!canPersistChanges || rowBusyKey === `${service.id}:delete`}
                          loading={rowBusyKey === `${service.id}:toggle`}
                          loadingLabel="Memproses..."
                          onClick={() => void handleToggleEnabled(service)}
                        >
                          {service.enabled ? "Nonaktifkan" : "Aktifkan"}
                        </AppButton>
                        <AppButton
                          size="xs"
                          variant="ghost"
                          disabled={!canPersistChanges || rowBusyKey === `${service.id}:toggle`}
                          loading={rowBusyKey === `${service.id}:delete`}
                          loadingLabel="Menghapus..."
                          onClick={() => setDeleteTarget(service)}
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
                  Belum ada layanan yang cocok dengan filter aktif.
                </AppTableCell>
              </AppTableRow>
            )}
          </tbody>
        </AppTable>
      </AppCard>

      <AppDialog
        open={editorOpen}
        onOpenChange={handleEditorOpenChange}
        title={isCreateMode ? "Tambah layanan" : "Edit layanan"}
        className="max-w-5xl"
        description={
          isCreateMode
            ? "Buat layanan baru untuk katalog."
            : `Ubah layanan ${selectedService?.name ?? selectedServiceId ?? ""} tanpa membuat tabel utama berantakan.`
        }
      >
        <div className="space-y-4">
          <AdminEditorSection
            eyebrow={isCreateMode ? "Layanan baru" : "Detail layanan"}
            title="Identitas layanan"
            description="Gunakan identitas yang konsisten dengan katalog dan antrean."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AdminFormField
                label="ID layanan"
                description={isCreateMode ? "Contoh: D11-03" : "ID tidak dapat diubah setelah dibuat."}
                error={validationErrors.id}
                controlId="admin-service-id"
              >
                <AppInput
                  id="admin-service-id"
                  value={draft.id}
                  disabled={!isCreateMode || !canPersistChanges || saveMutation.isPending}
                  onChange={(event) =>
                    setDraft((currentValue) => ({
                      ...currentValue,
                      id: event.target.value.toUpperCase(),
                      prefix:
                        isCreateMode && !currentValue.prefix
                          ? event.target.value.toUpperCase()
                          : currentValue.prefix,
                    }))
                  }
                />
              </AdminFormField>

              <AdminFormField
                label="Prefix"
                description="Identitas ringkas antrean."
                error={validationErrors.prefix}
                controlId="admin-service-prefix"
              >
                <AppInput
                  id="admin-service-prefix"
                  value={draft.prefix}
                  disabled={!canPersistChanges || saveMutation.isPending}
                  onChange={(event) =>
                    setDraft((currentValue) => ({
                      ...currentValue,
                      prefix: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </AdminFormField>

              <AdminFormField
                label="Nama layanan"
                error={validationErrors.name}
                controlId="admin-service-name"
                className="md:col-span-2"
              >
                <AppInput
                  id="admin-service-name"
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
            </div>
          </AdminEditorSection>

          <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <AdminEditorSection
              eyebrow="Penugasan"
              title="Unit layanan"
              description="Pastikan layanan masuk ke unit yang tepat."
              className="h-full"
            >
              <div className="grid gap-4">
                <AdminFormField
                  label="Unit"
                  error={validationErrors.unorId}
                  controlId="admin-service-unit"
                >
                  <AppSearchSelect
                    value={draft.unorId}
                    disabled={!canPersistChanges || saveMutation.isPending}
                    onValueChange={(value) =>
                      setDraft((currentValue) => ({
                        ...currentValue,
                        unorId: value,
                      }))
                    }
                    options={serviceUnitOptions}
                    placeholder="Pilih unit"
                    searchPlaceholder="Cari unit"
                    emptyMessage="Unit tidak ditemukan."
                    className="w-full"
                  />
                </AdminFormField>
              </div>
            </AdminEditorSection>

            <AdminEditorSection
              eyebrow="Pengaturan"
              title="Slot, kuota, dan status"
              description="Atur perilaku layanan yang dipakai di kanal publik."
              className="h-full"
            >
              <div className="grid gap-4">
                <AdminFormField
                  label="Durasi slot"
                  description="Saat nonaktif, durasi disimpan 0 menit."
                  error={validationErrors.slotDurationMinutes}
                  controlId="admin-service-slot-duration"
                >
                  <div className="space-y-3">
                    <label className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-surface-container-lowest px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">Durasi aktif</p>
                        <p className="text-sm leading-6 text-muted-foreground">
                          Layanan tanpa slot akan memakai nilai 0 menit.
                        </p>
                      </div>
                      <AppCheckbox
                        checked={draft.slotDurationEnabled}
                        disabled={!canPersistChanges || saveMutation.isPending}
                        onChange={(event) =>
                          setDraft((currentValue) => ({
                            ...currentValue,
                            slotDurationEnabled: event.target.checked,
                            slotDurationMinutes:
                              event.target.checked &&
                              Number.parseInt(currentValue.slotDurationMinutes, 10) <= 0
                                ? "30"
                                : currentValue.slotDurationMinutes,
                          }))
                        }
                      />
                    </label>
                    <AppInput
                      id="admin-service-slot-duration"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={draft.slotDurationMinutes}
                      disabled={
                        !draft.slotDurationEnabled || !canPersistChanges || saveMutation.isPending
                      }
                      onChange={(event) =>
                        setDraft((currentValue) => ({
                          ...currentValue,
                          slotDurationMinutes: event.target.value,
                        }))
                      }
                    />
                  </div>
                </AdminFormField>

                <AdminFormField
                  label="Kuota harian"
                  description="Batas booking per hari."
                  error={validationErrors.dailyQuota}
                  controlId="admin-service-daily-quota"
                >
                  <AppInput
                    id="admin-service-daily-quota"
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

                <label className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-surface-container-low px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Status aktif</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Layanan nonaktif tetap tersimpan, tetapi tidak dipakai untuk antrean aktif.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    disabled={!canPersistChanges || saveMutation.isPending}
                    onChange={(event) =>
                      setDraft((currentValue) => ({
                        ...currentValue,
                        enabled: event.target.checked,
                      }))
                    }
                    className="mt-1 size-4 rounded border-input text-role-accent shadow-none focus:ring-2 focus:ring-role-accent-soft"
                  />
                </label>
              </div>
            </AdminEditorSection>
          </div>

          <AdminEditorSection
            eyebrow="Keterangan"
            title="Deskripsi layanan"
            description="Ringkasan singkat untuk konteks internal."
          >
            <AdminFormField
              label="Deskripsi"
              controlId="admin-service-description"
            >
              <AppTextarea
                id="admin-service-description"
                value={draft.description}
                disabled={!canPersistChanges || saveMutation.isPending}
                onChange={(event) =>
                  setDraft((currentValue) => ({
                    ...currentValue,
                    description: event.target.value,
                  }))
                }
              />
            </AdminFormField>
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
              {isCreateMode ? "Buat Layanan" : "Simpan Perubahan"}
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
        title="Hapus layanan"
        description={
          deleteTarget
            ? `Layanan ${deleteTarget.name} (${deleteTarget.id}) akan dihapus dari katalog layanan.`
            : "Pastikan layanan ini sudah tidak dipakai."
        }
      >
        <div className="space-y-6">
          <AppNotice
            icon={AlertCircle}
            title="Periksa sebelum hapus"
            description="Pastikan layanan ini sudah tidak dipakai."
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
              Hapus layanan
            </AppButton>
          </div>
        </div>
      </AppDialog>

      <AppConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Kembalikan draft layanan?"
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
