"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCheck,
  PencilLine,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthSessionQuery } from "@/features/auth/hooks/use-auth-session-query";
import { AppBadge } from "@/components/ui/app-badge";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppCheckbox } from "@/components/ui/app-checkbox";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppFilterBar } from "@/components/ui/app-filter-bar";
import { AppFilterTrigger } from "@/components/ui/app-filter-trigger";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";
import {
  AppSearchSelect,
  type AppSearchSelectOption,
} from "@/components/ui/app-search-select";
import { AppStatCard } from "@/components/ui/app-stat-card";
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
  type AdminServiceLevelEntry,
  getAdminServiceLevels,
  saveAdminServiceLevel,
} from "@/lib/api/admin-service-levels";
import { createService, deleteService, updateService } from "@/lib/api/admin-services";
import { getScopedData } from "@/lib/api/services";
import { useHydrated } from "@/hooks/use-hydrated";

type UnitOption = {
  id: string;
  label: string;
  shortName: string;
};

type MasterService = {
  id: string;
  name: string;
  prefix: string;
  description: string;
  unitId: string;
  unitLabel: string;
  serviceLevel: 1 | 2;
  durationMinutes: number;
  dailyQuota: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  source: "live" | "fallback";
};

type MasterDirectory = {
  units: UnitOption[];
  services: MasterService[];
};

type Draft = {
  id: string;
  name: string;
  prefix: string;
  description: string;
  unitId: string;
  serviceLevel: "1" | "2";
  slotDurationEnabled: boolean;
  durationMinutes: string;
  dailyQuota: string;
  enabled: boolean;
};

type FieldErrors = {
  id?: string;
  name?: string;
  prefix?: string;
  unitId?: string;
  durationMinutes?: string;
  dailyQuota?: string;
};

type StatusFilter = "all" | "active" | "inactive";
type LevelFilter = "all" | "1" | "2";
type ServiceLevelLookup = Map<string, 1 | 2>;
const ADMIN_MANAGED_EVENT_PREFIX = "lkpp:admin-managed";

type AdminServiceLevelsQueryData = {
  serviceLevels: AdminServiceLevelEntry[];
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

function compareMasterServices(left: MasterService, right: MasterService) {
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

function normalizeUnits(rawUnits: unknown, includeFallback = true): UnitOption[] {
  const merged = new Map<string, UnitOption>();

  if (includeFallback) {
    for (const unit of bookingUnitEntries) {
      merged.set(unit.id, {
        id: unit.id,
        label: unit.label,
        shortName: unit.groupLabel,
      });
    }
  }

  if (Array.isArray(rawUnits)) {
    for (const entry of rawUnits) {
      if (!isRecord(entry)) continue;
      const id = asString(entry.id).trim().toUpperCase();
      const label = asString(entry.label, asString(entry.name)).trim();
      if (!id || !label) continue;

      merged.set(id, {
        id,
        label,
        shortName:
          asString(entry.shortName, asString(entry.groupLabel, "")).trim() ||
          "Unit kerja",
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

function normalizeService(
  rawService: unknown,
  units: UnitOption[],
  source: "live" | "fallback",
): MasterService | null {
  if (!isRecord(rawService)) {
    return null;
  }

  const id = asString(rawService.id).trim().toUpperCase();
  if (!id) {
    return null;
  }

  const catalog = getBookingServiceById(id);
  const unitId = asString(rawService.unorId, catalog?.unitId ?? "")
    .trim()
    .toUpperCase() || "UNASSIGNED";

  const resolvedUnit =
    units.find((unit) => unit.id === unitId)?.label ||
    getBookingUnitEntryById(unitId)?.label ||
    unitId;

  return {
    id,
    name:
      asString(rawService.name, asString(rawService.title, catalog?.title ?? id)).trim() ||
      id,
    prefix: asString(rawService.prefix, catalog?.id ?? id).trim() || id,
    description: asString(rawService.description, catalog?.description ?? "").trim(),
    unitId,
    unitLabel: resolvedUnit,
    serviceLevel: rawService.serviceLevel === 2 || catalog?.serviceLevel === 2 ? 2 : 1,
    durationMinutes: Math.max(
      asNumber(rawService.slotDurationMinutes, catalog?.durationMinutes ?? 30),
      0,
    ),
    dailyQuota: Math.max(asNumber(rawService.dailyQuota, catalog?.dailyQuota ?? 0), 0),
    enabled: typeof rawService.enabled === "boolean" ? rawService.enabled : true,
    createdAt: asString(rawService.createdAt, asString(rawService.created_at)).trim(),
    updatedAt: asString(rawService.updatedAt, asString(rawService.updated_at)).trim(),
    source,
  };
}

function normalizeDirectory(payload: unknown, includeFallback = true): MasterDirectory {
  const root = isRecord(payload) ? payload : {};
  const data = isRecord(root.data) ? root.data : root;
  const units = normalizeUnits(data.units, includeFallback);

  const liveServices = Array.isArray(data.services)
    ? data.services
        .map((service) => normalizeService(service, units, "live"))
        .filter((service): service is MasterService => service !== null)
    : [];

  const mergedUnits = new Map(units.map((unit) => [unit.id, unit] as const));
  for (const service of liveServices) {
    if (mergedUnits.has(service.unitId) || service.unitId === "UNASSIGNED") {
      continue;
    }

    mergedUnits.set(service.unitId, {
      id: service.unitId,
      label: service.unitLabel,
      shortName: getBookingUnitEntryById(service.unitId)?.groupLabel ?? service.unitId,
    });
  }

  return {
    units: Array.from(mergedUnits.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    ),
    services: liveServices.sort(compareMasterServices),
  };
}

function buildFallbackDirectory(): MasterDirectory {
  const units = normalizeUnits([]);
  const services = bookingServices
    .map((service) =>
      normalizeService(
        {
          id: service.id,
          name: service.title,
          prefix: service.id,
          description: service.description,
          unorId: service.unitId,
          serviceLevel: service.serviceLevel,
          slotDurationMinutes: service.durationMinutes,
          dailyQuota: service.dailyQuota,
          enabled: true,
        },
        units,
        "fallback",
      ),
    )
    .filter((service): service is MasterService => service !== null)
    .sort(compareMasterServices);

  return { units, services };
}

function buildDraft(service: MasterService | null): Draft {
  return {
    id: service?.id ?? "",
    name: service?.name ?? "",
    prefix: service?.prefix ?? "",
    description: service?.description ?? "",
    unitId: service?.unitId ?? "UNASSIGNED",
    serviceLevel: String(service?.serviceLevel ?? 1) as "1" | "2",
    slotDurationEnabled: service == null ? true : service.durationMinutes > 0,
    durationMinutes: String(service?.durationMinutes || 30),
    dailyQuota: String(service?.dailyQuota ?? 0),
    enabled: service?.enabled ?? true,
  };
}

function validateDraft(draft: Draft, isCreateMode: boolean) {
  const errors: FieldErrors = {};

  if (!draft.id.trim()) {
    errors.id = "Kode layanan wajib diisi.";
  } else if (!/^[A-Z0-9._-]+$/.test(draft.id.trim())) {
    errors.id = "Gunakan huruf besar, angka, titik, garis bawah, atau strip.";
  }

  if (!draft.name.trim()) {
    errors.name = "Nama layanan wajib diisi.";
  }

  if (!draft.prefix.trim()) {
    errors.prefix = "Awalan nomor antrean wajib diisi.";
  }

  if (!draft.unitId.trim()) {
    errors.unitId = "Unit kerja wajib dipilih.";
  }

  if (draft.slotDurationEnabled) {
    const minutes = Number.parseInt(draft.durationMinutes, 10);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) {
      errors.durationMinutes = "Durasi slot harus 5 sampai 480 menit.";
    }
  }

  const quota = Number.parseInt(draft.dailyQuota, 10);
  if (!Number.isInteger(quota) || quota < 0 || quota > 9999) {
    errors.dailyQuota = "Kuota harian harus angka 0 sampai 9.999.";
  }

  if (!isCreateMode && draft.id.trim() === "") {
    errors.id = "Kode layanan wajib diisi.";
  }

  return errors;
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

async function invalidateQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin-master-data"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-service-levels"] }),
    queryClient.invalidateQueries({ queryKey: ["booking-runtime-data"] }),
    queryClient.invalidateQueries({ queryKey: ["offline-visitor-runtime"] }),
    queryClient.invalidateQueries({ queryKey: ["staff-live-appointments"] }),
    queryClient.invalidateQueries({ queryKey: ["user-live-appointments"] }),
  ]);
}

export function AdminMasterDataSection() {
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const sessionQuery = useAuthSessionQuery();
  const session = sessionQuery.data?.session;
  const canPersistChanges =
    session?.variant === "staff" &&
    session.role === "humas-admin" &&
    session.authMode === "live" &&
    Boolean(session.staffId);

  const actor = session?.staffId ? { staffId: session.staffId } : undefined;

  const fallbackDirectory = React.useMemo(() => buildFallbackDirectory(), []);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [unitFilter, setUnitFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [levelFilter, setLevelFilter] = React.useState<LevelFilter>("all");
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<MasterService | null>(null);
  const [draft, setDraft] = React.useState<Draft>(() => buildDraft(null));

  const directoryQuery = useQuery({
    queryKey: ["admin-master-data", session?.staffId ?? "anonymous"],
    queryFn: () => getScopedData({ staffId: session?.staffId ?? undefined }),
    enabled: Boolean(canPersistChanges && session?.staffId),
    staleTime: 60_000,
  });
  const serviceLevelsQuery = useQuery({
    queryKey: ["admin-service-levels", session?.staffId ?? "anonymous"],
    queryFn: getAdminServiceLevels,
    enabled: Boolean(canPersistChanges && session?.staffId),
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

  const liveDirectory = React.useMemo(
    () => normalizeDirectory(directoryQuery.data?.data, false),
    [directoryQuery.data],
  );
  const usesLiveDirectory = canPersistChanges;
  const directory = React.useMemo(() => {
    const baseDirectory = usesLiveDirectory ? liveDirectory : fallbackDirectory;

    if (!serviceLevelLookup.size) {
      return baseDirectory;
    }

    return {
      ...baseDirectory,
      services: baseDirectory.services.map((service) => ({
        ...service,
        serviceLevel: serviceLevelLookup.get(service.id) ?? service.serviceLevel,
      })),
    };
  }, [fallbackDirectory, liveDirectory, serviceLevelLookup, usesLiveDirectory]);

  const serviceMap = React.useMemo(
    () => new Map<string, MasterService>(
      directory.services.map((service) => [service.id, service] as const),
    ),
    [directory.services],
  );

  const unitOptions = React.useMemo<AppSearchSelectOption[]>(
    () => [
      { value: "all", label: "Semua unit" },
      ...directory.units.map((unit) => ({
        value: unit.id,
        label: unit.label,
        keywords: [unit.id, unit.shortName],
      })),
    ],
    [directory.units],
  );

  const levelOptions = React.useMemo<AppSearchSelectOption[]>(
    () => [
      { value: "all", label: "Semua level" },
      { value: "1", label: "Layanan Utama", keywords: ["level 1", "utama"] },
      { value: "2", label: "Layanan Lanjutan", keywords: ["level 2", "eskalasi"] },
    ],
    [],
  );

  const statusOptions = React.useMemo<AppSearchSelectOption[]>(
    () => [
      { value: "all", label: "Semua status" },
      { value: "active", label: "Aktif", keywords: ["aktif"] },
      { value: "inactive", label: "Nonaktif", keywords: ["nonaktif"] },
    ],
    [],
  );

  const filteredServices = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return directory.services.filter((service) => {
      if (unitFilter !== "all" && service.unitId !== unitFilter) {
        return false;
      }

      if (statusFilter === "active" && !service.enabled) {
        return false;
      }

      if (statusFilter === "inactive" && service.enabled) {
        return false;
      }

      if (levelFilter !== "all" && String(service.serviceLevel) !== levelFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [service.id, service.name, service.prefix, service.unitLabel, service.description]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [directory.services, levelFilter, searchQuery, statusFilter, unitFilter]);

  const selectedService =
    selectedId && selectedId !== "new" ? serviceMap.get(selectedId) ?? null : null;
  const isCreateMode = selectedId === "new";
  const validation = validateDraft(draft, isCreateMode);
  const hasValidationErrors = Object.values(validation).some(Boolean);

  const createMutation = useMutation({
    mutationFn: async ({
      payload,
      serviceLevel,
    }: {
      payload: Record<string, unknown>;
      serviceLevel: 1 | 2;
    }) => {
      const response = await createService(payload, actor);
      const savedServiceLevel = await saveAdminServiceLevel(
        String(payload.id || ""),
        serviceLevel,
      );

      return {
        response,
        savedServiceLevel,
      };
    },
    onSuccess: async ({ savedServiceLevel }) => {
      queryClient.setQueryData<AdminServiceLevelsQueryData>(
        ["admin-service-levels", session?.staffId ?? "anonymous"],
        (currentValue) => ({
          serviceLevels: upsertAdminServiceLevelEntry(
            currentValue?.serviceLevels ?? [],
            savedServiceLevel,
          ),
        }),
      );

      toast.success("Data layanan berhasil ditambahkan.");
      setEditorOpen(false);
      setSelectedId(null);
      await invalidateQueries(queryClient);
    },
    onError: () => {
      toast.error("Gagal menambahkan data layanan.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
      serviceLevel,
    }: {
      id: string;
      payload: Record<string, unknown>;
      serviceLevel: 1 | 2;
    }) => {
      const response = await updateService(id, payload, actor);
      const savedServiceLevel = await saveAdminServiceLevel(id, serviceLevel);
      return {
        response,
        savedServiceLevel,
      };
    },
    onSuccess: async ({ savedServiceLevel }) => {
      queryClient.setQueryData<AdminServiceLevelsQueryData>(
        ["admin-service-levels", session?.staffId ?? "anonymous"],
        (currentValue) => ({
          serviceLevels: upsertAdminServiceLevelEntry(
            currentValue?.serviceLevels ?? [],
            savedServiceLevel,
          ),
        }),
      );

      toast.success("Perubahan layanan berhasil disimpan.");
      setEditorOpen(false);
      setSelectedId(null);
      await invalidateQueries(queryClient);
    },
    onError: () => {
      toast.error("Gagal menyimpan perubahan layanan.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteService(id, actor),
    onSuccess: async () => {
      toast.success("Data layanan dihapus.");
      setDeleteTarget(null);
      await invalidateQueries(queryClient);
    },
    onError: () => {
      toast.error("Gagal menghapus data layanan.");
    },
  });

  const canEdit = canPersistChanges && !directoryQuery.isLoading;
  const activeFilterCount = [
    searchQuery.trim(),
    unitFilter !== "all",
    statusFilter !== "all",
    levelFilter !== "all",
  ].filter(Boolean).length;

  const activeCount = filteredServices.filter((service) => service.enabled).length;
  const level2Count = filteredServices.filter((service) => service.serviceLevel === 2).length;
  const liveCount = filteredServices.filter((service) => service.source === "live").length;

  React.useEffect(() => {
    if (!editorOpen) {
      return;
    }

    setDraft(buildDraft(isCreateMode ? null : selectedService));
  }, [editorOpen, isCreateMode, selectedService]);

  React.useEffect(() => {
    if (selectedId === "new" || selectedId !== null || directory.services.length === 0) {
      return;
    }

    setSelectedId(directory.services[0].id);
  }, [directory.services, selectedId]);

  React.useEffect(() => {
    const primaryEvent = `${ADMIN_MANAGED_EVENT_PREFIX}:data-referensi:primary`;
    const secondaryEvent = `${ADMIN_MANAGED_EVENT_PREFIX}:data-referensi:secondary`;

    const handlePrimary = () => {
      if (!canEdit) {
        toast.warning("Masuk sebagai Humas Admin live untuk menambah data.");
        return;
      }

      setSelectedId("new");
      setEditorOpen(true);
    };

    const handleSecondary = () => {
      void directoryQuery.refetch();
      toast.success("Data referensi disegarkan.");
    };

    window.addEventListener(primaryEvent, handlePrimary);
    window.addEventListener(secondaryEvent, handleSecondary);
    return () => {
      window.removeEventListener(primaryEvent, handlePrimary);
      window.removeEventListener(secondaryEvent, handleSecondary);
    };
  }, [canEdit, directoryQuery]);

  function openCreate() {
    if (!canEdit) {
      toast.warning("Masuk sebagai Humas Admin live untuk menambah data.");
      return;
    }

    setSelectedId("new");
    setEditorOpen(true);
  }

  function openEdit(service: MasterService) {
    if (!canEdit) {
      toast.warning("Masuk sebagai Humas Admin live untuk mengubah data.");
      return;
    }

    setSelectedId(service.id);
    setEditorOpen(true);
  }

  function handleSubmit() {
    if (!canEdit) {
      toast.warning("Masuk sebagai Humas Admin live untuk menyimpan perubahan.");
      return;
    }

    if (hasValidationErrors) {
      toast.error("Lengkapi form terlebih dahulu.");
      return;
    }

    const payload: Record<string, unknown> = {
      id: draft.id.trim().toUpperCase(),
      name: draft.name.trim(),
      prefix: draft.prefix.trim().toUpperCase(),
      description: draft.description.trim(),
      enabled: draft.enabled,
      slotDurationMinutes: draft.slotDurationEnabled
        ? Number.parseInt(draft.durationMinutes, 10)
        : 0,
      dailyQuota: Number.parseInt(draft.dailyQuota, 10),
      unorId: draft.unitId,
    };
    const serviceLevel = draft.serviceLevel === "2" ? 2 : 1;

    if (isCreateMode) {
      createMutation.mutate({ payload, serviceLevel });
      return;
    }

    if (!selectedService) {
      return;
    }

    updateMutation.mutate({ id: selectedService.id, payload, serviceLevel });
  }

  function handleDelete(service: MasterService) {
    if (!canEdit) {
      toast.warning("Masuk sebagai Humas Admin live untuk menghapus data.");
      return;
    }

    setDeleteTarget(service);
  }

  if (hydrated && canPersistChanges && directoryQuery.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {["Total layanan", "Layanan aktif", "Level 2", "Sumber live"].map((label) => (
          <AppStatCard
            key={label}
            label={label}
            value="..."
            description="Memuat data referensi"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {directoryQuery.isError && usesLiveDirectory && directory.services.length === 0 ? (
        <AppCard tone="soft" padding="md" className="rounded-[24px]">
          <p className="text-sm font-semibold text-foreground">Data referensi belum dapat dimuat</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Coba muat ulang halaman setelah koneksi backend kembali normal.
          </p>
        </AppCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AppStatCard
          label="Total layanan"
          value={directory.services.length.toString()}
          description="Data rujukan yang dipakai lintas modul."
          tone="info"
        />
        <AppStatCard
          label="Layanan aktif"
          value={activeCount.toString()}
          description="Siap dipilih warga saat mengambil antrean."
          tone="success"
        />
        <AppStatCard
          label="Level 2"
          value={level2Count.toString()}
          description="Jalur eskalasi dan layanan lanjutan."
          tone="role"
        />
        <AppStatCard
          label="Sumber live"
          value={liveCount.toString()}
          description="Baris yang terbaca dari backend aktif."
          tone="warning"
        />
      </div>

      <AppCard padding="md" className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold tracking-tight">Master data layanan</p>
          <p className="text-sm leading-6 text-muted-foreground">
            Perubahan kode, nama, unit, level, durasi, dan kuota langsung memengaruhi form dan dashboard lain.
          </p>
        </div>

        <AppNotice
          icon={CheckCheck}
          title="Sumber data"
          description={
            usesLiveDirectory
              ? "Panel ini membaca data referensi langsung dari backend aktif."
              : "Masuk sebagai Humas Admin live untuk membaca data referensi dari backend aktif."
          }
          tone="role"
        />
      </AppCard>

      <AppCard padding="md" className="space-y-4">
        <AppFilterBar>
          <div className="relative w-full min-w-0 md:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <AppInput
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari kode, layanan, unit, atau deskripsi"
              className="pl-11"
            />
          </div>

          <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-3">
            <AppSearchSelect
              value={unitFilter}
              onValueChange={setUnitFilter}
              options={unitOptions}
              placeholder="Pilih unit"
              searchPlaceholder="Cari unit"
            />
            <AppSearchSelect
              value={levelFilter}
              onValueChange={(value) => setLevelFilter(value as LevelFilter)}
              options={levelOptions}
              placeholder="Pilih level"
            />
            <AppSearchSelect
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              options={statusOptions}
              placeholder="Pilih status"
            />
          </div>

          <div className="self-start">
            <AppButton variant="outline" onClick={() => setAdvancedOpen((current) => !current)}>
              <SlidersHorizontal className="size-4" />
              Filter
            </AppButton>
          </div>
        </AppFilterBar>

        {advancedOpen ? (
          <div className="flex flex-wrap gap-3">
            <AppFilterTrigger
              icon={SlidersHorizontal}
              label="Aktif"
              count={filteredServices.filter((item) => item.enabled).length}
              active={statusFilter === "active"}
              onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
            />
            <AppFilterTrigger
              icon={SlidersHorizontal}
              label="Nonaktif"
              count={filteredServices.filter((item) => !item.enabled).length}
              active={statusFilter === "inactive"}
              onClick={() => setStatusFilter(statusFilter === "inactive" ? "all" : "inactive")}
            />
            <AppFilterTrigger
              icon={SlidersHorizontal}
              label="Level 2"
              count={level2Count}
              active={levelFilter === "2"}
              onClick={() => setLevelFilter(levelFilter === "2" ? "all" : "2")}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-sm text-muted-foreground">
            {activeFilterCount > 0
              ? `${activeFilterCount} filter aktif`
              : "Tidak ada filter aktif."}
          </p>
          <div className="flex flex-wrap gap-3">
            <AppButton
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setUnitFilter("all");
                setStatusFilter("all");
                setLevelFilter("all");
              }}
            >
              <X className="size-4" />
              Reset
            </AppButton>
            <AppButton onClick={openCreate} disabled={!canEdit}>
              <Plus className="size-4" />
              Tambah data
            </AppButton>
          </div>
        </div>

        <AppTable>
          <AppTableHead>
            <AppTableRow>
              <AppTableHeaderCell>Kode & Nama</AppTableHeaderCell>
              <AppTableHeaderCell>Unit</AppTableHeaderCell>
              <AppTableHeaderCell>Level</AppTableHeaderCell>
              <AppTableHeaderCell>Durasi</AppTableHeaderCell>
              <AppTableHeaderCell>Kuota</AppTableHeaderCell>
              <AppTableHeaderCell>Status</AppTableHeaderCell>
              <AppTableHeaderCell>Aksi</AppTableHeaderCell>
            </AppTableRow>
          </AppTableHead>
          <tbody>
            {filteredServices.length === 0 ? (
              <AppTableRow>
                <AppTableCell colSpan={7} className="text-sm text-muted-foreground">
                  Tidak ada data yang sesuai filter.
                </AppTableCell>
              </AppTableRow>
            ) : null}
            {filteredServices.map((service) => (
              <AppTableRow key={service.id}>
                <AppTableCell>
                  <div className="space-y-1">
                    <p className="font-semibold">{service.id}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{service.name}</p>
                    {service.description ? (
                      <p className="max-w-prose text-xs leading-6 text-muted-foreground">
                        {service.description}
                      </p>
                    ) : null}
                  </div>
                </AppTableCell>
                <AppTableCell>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{service.unitLabel}</p>
                    <p className="text-xs text-muted-foreground">{service.prefix}</p>
                  </div>
                </AppTableCell>
                <AppTableCell>
                  <p className="text-sm">
                    {service.serviceLevel === 1 ? "Layanan Utama" : "Layanan Lanjutan"}
                  </p>
                </AppTableCell>
                <AppTableCell>
                  <p className="text-sm">{service.durationMinutes} menit</p>
                </AppTableCell>
                <AppTableCell>
                  <p className="text-sm">{service.dailyQuota} antrian</p>
                </AppTableCell>
                <AppTableCell>
                  <div className="flex flex-wrap gap-2">
                    <AppBadge tone={service.enabled ? "success" : "warning"}>
                      {service.enabled ? "Aktif" : "Nonaktif"}
                    </AppBadge>
                    {service.source === "fallback" ? (
                      <AppBadge tone="warning">Fallback</AppBadge>
                    ) : null}
                  </div>
                </AppTableCell>
                <AppTableCell>
                  <div className="flex flex-wrap gap-2">
                    <AppButton size="sm" variant="outline" onClick={() => openEdit(service)}>
                      <PencilLine className="size-4" />
                      Ubah
                    </AppButton>
                    <AppButton
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(service)}
                    >
                      <Trash2 className="size-4" />
                      Hapus
                    </AppButton>
                  </div>
                </AppTableCell>
              </AppTableRow>
            ))}
          </tbody>
        </AppTable>
      </AppCard>

      <AppDialog
        open={editorOpen}
        onOpenChange={(nextOpen) => {
          setEditorOpen(nextOpen);
          if (!nextOpen) {
            setSelectedId(null);
          }
        }}
        title={isCreateMode ? "Tambah data layanan" : "Ubah data layanan"}
        description="Gunakan formulir ini untuk menjaga taksonomi layanan tetap seragam di seluruh kanal."
        className="max-w-4xl"
      >
        <AdminEditorSection
          eyebrow={isCreateMode ? "Data baru" : "Perubahan data"}
          title="Detail layanan"
          description="Perubahan di sini akan dipakai juga oleh formulir publik dan dashboard operasional."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Kode layanan" controlId="master-id" error={validation.id}>
              <AppInput
                id="master-id"
                value={draft.id}
                placeholder="Contoh: D11-01"
                disabled={!isCreateMode}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    id: event.target.value.toUpperCase(),
                  }))
                }
              />
            </AdminFormField>

            <AdminFormField label="Awalan antrean" controlId="master-prefix" error={validation.prefix}>
              <AppInput
                id="master-prefix"
                value={draft.prefix}
                placeholder="Contoh: D11"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    prefix: event.target.value.toUpperCase().trim(),
                  }))
                }
              />
            </AdminFormField>

            <AdminFormField
              label="Nama layanan"
              controlId="master-name"
              className="md:col-span-2"
              error={validation.name}
            >
              <AppInput
                id="master-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
            </AdminFormField>

            <AdminFormField
              label="Unit"
              controlId="master-unit"
              className="md:col-span-2"
              error={validation.unitId}
            >
              <AppSearchSelect
                id="master-unit"
                value={draft.unitId}
                onValueChange={(value) => setDraft((current) => ({ ...current, unitId: value }))}
                options={unitOptions.filter((option) => option.value !== "all")}
                placeholder="Pilih unit"
                searchPlaceholder="Cari unit"
              />
            </AdminFormField>

            <AdminFormField label="Level layanan" controlId="master-level">
              <AppSearchSelect
                id="master-level"
                value={draft.serviceLevel}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    serviceLevel: value as "1" | "2",
                  }))
                }
                options={levelOptions.filter((option) => option.value !== "all")}
                placeholder="Pilih level"
              />
            </AdminFormField>

            <AdminFormField
              label="Durasi slot"
              controlId="master-duration-enabled"
              description="Matikan jika layanan tidak memakai durasi otomatis."
            >
              <div className="flex h-12 items-center gap-3 rounded-[var(--radius-xl)] border border-input bg-surface-container-lowest px-4">
                <AppCheckbox
                  id="master-duration-enabled"
                  checked={draft.slotDurationEnabled}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      slotDurationEnabled: event.target.checked,
                    }))
                  }
                />
                <label htmlFor="master-duration-enabled" className="text-sm">
                  Aktifkan durasi slot
                </label>
              </div>
            </AdminFormField>

            <AdminFormField
              label="Durasi (menit)"
              controlId="master-duration"
              error={validation.durationMinutes}
            >
              <AppInput
                id="master-duration"
                value={draft.durationMinutes}
                disabled={!draft.slotDurationEnabled}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    durationMinutes: event.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
              />
            </AdminFormField>

            <AdminFormField
              label="Kuota harian"
              controlId="master-quota"
              error={validation.dailyQuota}
            >
              <AppInput
                id="master-quota"
                value={draft.dailyQuota}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dailyQuota: event.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
              />
            </AdminFormField>

            <AdminFormField
              label="Status layanan"
              controlId="master-enabled"
              description="Nonaktif akan menyembunyikan layanan dari pilihan publik."
            >
              <div className="flex h-12 items-center gap-3 rounded-[var(--radius-xl)] border border-input bg-surface-container-lowest px-4">
                <AppCheckbox
                  id="master-enabled"
                  checked={draft.enabled}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, enabled: event.target.checked }))
                  }
                />
                <label htmlFor="master-enabled" className="text-sm">
                  Layanan aktif
                </label>
              </div>
            </AdminFormField>

            <AdminFormField
              label="Deskripsi layanan"
              controlId="master-description"
              className="md:col-span-2"
            >
              <AppTextarea
                id="master-description"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
              />
            </AdminFormField>
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-5">
            <AppButton
              variant="outline"
              onClick={() => {
                setEditorOpen(false);
                setSelectedId(null);
              }}
            >
              Batal
            </AppButton>
            <AppButton
              onClick={handleSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              <Save className="size-4" />
              Simpan
            </AppButton>
          </div>
        </AdminEditorSection>
      </AppDialog>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null);
          }
        }}
        title="Hapus data layanan?"
        description={
          deleteTarget
            ? `${deleteTarget.id} ${deleteTarget.name} akan dihapus dari master data.`
            : undefined
        }
        confirmLabel="Hapus"
        confirmVariant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
          }
        }}
      >
        {deleteTarget ? (
          <div className="rounded-[24px] border border-border bg-surface-container-low p-4">
            <p className="text-sm font-semibold">{deleteTarget.name}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {deleteTarget.unitLabel}
            </p>
          </div>
        ) : null}
      </AppConfirmDialog>
    </div>
  );
}
