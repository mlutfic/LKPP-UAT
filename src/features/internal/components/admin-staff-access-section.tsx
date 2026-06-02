"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BriefcaseBusiness,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthSessionQuery } from "@/features/auth/hooks/use-auth-session-query";
import { AppActionBar } from "@/components/ui/app-action-bar";
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
import { AppPasswordInput } from "@/components/ui/app-password-input";
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
import {
  type AdminStaffDirectoryItem,
  useAdminStaffDirectoryQuery,
} from "@/features/internal/use-admin-staff-directory-query";
import { useAdminUnitCountersQuery } from "@/features/internal/use-admin-unit-counters-query";
import {
  CANONICAL_INTERNAL_LOGIN_NAMES,
  CANONICAL_INTERNAL_STAFF_ACCOUNTS,
} from "@/features/internal/internal-canonical-staff-accounts";
import { useHydrated } from "@/hooks/use-hydrated";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  createStaff,
  deleteStaff,
  syncStaffAssignments,
  syncStaffCounterAssignments,
  syncStaffPassword,
  syncStaffResetAccess,
  updateStaff,
} from "@/lib/api/admin-staff";
import { getScopedData } from "@/lib/api/services";
import {
  PASSWORD_POLICY_HINT,
  isStrongPassword,
} from "@/lib/password-policy";
import { maskEmail } from "@/lib/privacy";
import {
  getInternalRoleLabel,
  mapLegacyStaffRoleToInternalRole,
  type LegacyStaffRoleValue,
} from "@/lib/internal-role-policy";
import {
  isEligibleStaffServiceAssignment,
  isUnitScopedLegacyStaffRole,
} from "@/lib/staff-service-assignment-rules";

type StaffStatusFilter = "all" | "aktif" | "nonaktif" | "reset";

type StaffRoleFilter = "all" | LegacyStaffRoleValue;

type StaffUnitOption = AppSearchSelectOption;

type StaffDraft = {
  name: string;
  loginName: string;
  role: LegacyStaffRoleValue;
  unitId: string;
  serviceIds: string[];
  counterIds: string[];
  active: boolean;
  isOfficial: boolean;
  pin: string;
  pinConfirmation: string;
  requestPasswordReset: boolean;
};

type AdminStaffAccessChrome = {
  actionEyebrow?: string;
  actionDescription?: string;
  actionPills?: string[];
};

type OfficialStaffOverrides = Record<string, boolean>;
const EMPTY_OFFICIAL_STAFF_OVERRIDES: OfficialStaffOverrides = {};

type StaffServiceOption = {
  id: string;
  name: string;
  enabled: boolean;
  unitId: string;
  unitLabel: string;
  serviceLevel: 1 | 2;
  source: "live" | "fallback";
};

type StaffCounterOption = {
  id: string;
  label: string;
  counterNumber: number;
  unitId: string;
  active: boolean;
};

type StaffScopedDataResponse = {
  services?: unknown[];
  units?: unknown[];
};

function normalizeLoginName(value: string) {
  return value.trim().toLowerCase();
}

function isCanonicalOfficialLogin(loginName: string) {
  return CANONICAL_INTERNAL_LOGIN_NAMES.has(normalizeLoginName(loginName));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function extractResponseStaffId(response: unknown) {
  const root = isRecord(response) ? response : {};
  const staff = isRecord(root.staff) ? root.staff : null;
  return staff ? asString(staff.id).trim() : "";
}

function getRoleLabel(role: string) {
  const resolvedRole = mapLegacyStaffRoleToInternalRole(role);
  return resolvedRole ? getInternalRoleLabel(resolvedRole) : role || "Belum ditentukan";
}

function isUnitScopedRole(role: string) {
  return isUnitScopedLegacyStaffRole(role);
}

function requiresServiceAssignment(role: string) {
  return isUnitScopedRole(role);
}

function requiresCounterAssignment(role: string) {
  return role === "akun_unit";
}

function rankStaff(
  left: AdminStaffDirectoryItem,
  right: AdminStaffDirectoryItem,
  officialOverrides: OfficialStaffOverrides,
) {
  const leftPriority = isOfficialStaffAccount(left, officialOverrides) ? 0 : 1;
  const rightPriority = isOfficialStaffAccount(right, officialOverrides) ? 0 : 1;

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  if (left.active !== right.active) {
    return Number(right.active) - Number(left.active);
  }

  return left.name.localeCompare(right.name);
}

function isOfficialStaffAccount(
  staff: Pick<AdminStaffDirectoryItem, "loginName" | "active">,
  officialOverrides: OfficialStaffOverrides,
) {
  const normalizedLoginName = normalizeLoginName(staff.loginName);

  return staff.active && (
    isCanonicalOfficialLogin(normalizedLoginName) ||
    Boolean(officialOverrides[normalizedLoginName])
  );
}

function buildUnitOptions(items: AdminStaffDirectoryItem[]): StaffUnitOption[] {
  const merged = new Map<string, StaffUnitOption>();

  for (const unit of bookingUnitEntries) {
    merged.set(unit.id, {
      value: unit.id,
      label: unit.label,
      keywords: [unit.id, unit.groupLabel],
    });
  }

  for (const item of items) {
    const unitId = item.unitId.trim().toUpperCase();
    if (!unitId || merged.has(unitId)) {
      continue;
    }

    const fallbackUnit = getBookingUnitEntryById(unitId);
    merged.set(unitId, {
      value: unitId,
      label: item.unitName || fallbackUnit?.label || unitId,
      keywords: [unitId, item.unitName, fallbackUnit?.groupLabel].filter(Boolean) as string[],
    });
  }

  return Array.from(merged.values()).sort((left, right) => left.label.localeCompare(right.label));
}

function normalizeStaffServiceOptions(payload: unknown) {
  const merged = new Map<string, StaffServiceOption>();
  const root = isRecord(payload) ? payload : {};
  const data = isRecord(root.data) ? root.data : root;
  const liveUnitLabelById = new Map<string, string>();

  if (Array.isArray(data.units)) {
    for (const entry of data.units) {
      if (!isRecord(entry)) continue;
      const unitId = asString(entry.id).trim().toUpperCase();
      if (!unitId) continue;
      liveUnitLabelById.set(unitId, asString(entry.name, unitId).trim() || unitId);
    }
  }

  for (const service of bookingServices) {
    merged.set(service.id, {
      id: service.id,
      name: service.title,
      enabled: true,
      unitId: service.unitId,
      unitLabel: service.unitLabel,
      serviceLevel: service.serviceLevel,
      source: "fallback",
    });
  }

  if (Array.isArray(data.services)) {
    for (const entry of data.services) {
      if (!isRecord(entry)) continue;
      const serviceId = asString(entry.id).trim().toUpperCase();
      if (!serviceId) continue;

      const fallbackService = getBookingServiceById(serviceId);
      const unitId = asString(
        entry.unorId,
        asString(entry.unitId, fallbackService?.unitId ?? ""),
      )
        .trim()
        .toUpperCase();

      merged.set(serviceId, {
        id: serviceId,
        name: asString(entry.name, fallbackService?.title ?? serviceId).trim() || serviceId,
        enabled: entry.enabled !== false,
        unitId,
        unitLabel:
          liveUnitLabelById.get(unitId) ||
          getBookingUnitEntryById(unitId)?.label ||
          fallbackService?.unitLabel ||
          unitId,
        serviceLevel:
          entry.serviceLevel === 2 || fallbackService?.serviceLevel === 2 ? 2 : 1,
        source: "live",
      });
    }
  }

  return Array.from(merged.values()).sort(
    (left, right) =>
      left.unitLabel.localeCompare(right.unitLabel) ||
      left.name.localeCompare(right.name),
  );
}

function normalizeStaffCounterOptions(rawCounters: unknown) {
  if (!Array.isArray(rawCounters)) {
    return [] as StaffCounterOption[];
  }

  return rawCounters
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const id = asString(entry.id).trim().toUpperCase();
      const unitId = asString(entry.unitId).trim().toUpperCase();
      const counterNumber =
        typeof entry.counterNumber === "number" && Number.isFinite(entry.counterNumber)
          ? Math.trunc(entry.counterNumber)
          : -1;

      if (!id || !unitId || counterNumber < 1) {
        return null;
      }

      return {
        id,
        label:
          asString(entry.label, `Loket ${counterNumber}`).trim() || `Loket ${counterNumber}`,
        counterNumber,
        unitId,
        active: entry.active !== false,
      } satisfies StaffCounterOption;
    })
    .filter((entry): entry is StaffCounterOption => entry !== null)
    .sort(
      (left, right) =>
        left.unitId.localeCompare(right.unitId) ||
        left.counterNumber - right.counterNumber,
    );
}

function getEligibleServiceOptions(
  services: StaffServiceOption[],
  role: string,
  unitId: string,
) {
  return services.filter((service) =>
    isEligibleStaffServiceAssignment({
      role,
      staffUnitId: unitId,
      serviceId: service.id,
      serviceUnitId: service.unitId,
      serviceLevel: service.serviceLevel,
    }),
  );
}

function getEligibleCounterOptions(
  counters: StaffCounterOption[],
  role: string,
  unitId: string,
) {
  if (!requiresCounterAssignment(role)) {
    return [] as StaffCounterOption[];
  }

  const normalizedUnitId = unitId.trim().toUpperCase();
  if (!normalizedUnitId) {
    return [] as StaffCounterOption[];
  }

  return counters.filter((counter) => counter.unitId === normalizedUnitId);
}

function filterServiceIdsForDraft(
  serviceIds: string[],
  services: StaffServiceOption[],
  role: string,
  unitId: string,
) {
  const eligibleServiceIds = new Set(
    getEligibleServiceOptions(services, role, unitId).map((service) => service.id),
  );

  if (!isUnitScopedRole(role)) {
    const allServiceIds = new Set(services.map((service) => service.id));
    return Array.from(
      new Set(
        serviceIds
          .map((serviceId) => serviceId.trim().toUpperCase())
          .filter((serviceId) => allServiceIds.has(serviceId)),
      ),
    ).sort();
  }

  return Array.from(
    new Set(
      serviceIds
        .map((serviceId) => serviceId.trim().toUpperCase())
        .filter((serviceId) => eligibleServiceIds.has(serviceId)),
    ),
  ).sort();
}

function filterCounterIdsForDraft(
  counterIds: string[],
  counters: StaffCounterOption[],
  role: string,
  unitId: string,
) {
  if (!requiresCounterAssignment(role)) {
    return [] as string[];
  }

  const eligibleCounterIds = new Set(
    getEligibleCounterOptions(counters, role, unitId).map((counter) => counter.id),
  );

  return Array.from(
    new Set(
      counterIds
        .map((counterId) => counterId.trim().toUpperCase())
        .filter((counterId) => eligibleCounterIds.has(counterId)),
    ),
  ).sort();
}

function getDefaultServiceIdsForDraft(
  services: StaffServiceOption[],
  role: string,
  unitId: string,
) {
  if (!isUnitScopedRole(role)) {
    return [] as string[];
  }

  return getEligibleServiceOptions(services, role, unitId)
    .filter((service) => service.enabled)
    .map((service) => service.id)
    .sort();
}

function buildRoleOptions(includeAll = false): AppSearchSelectOption[] {
  const options: AppSearchSelectOption[] = [
    { value: "resepsionis", label: "Resepsionis", keywords: ["loket", "frontdesk"] },
    { value: "akun_unit", label: "Unit Organisasi", keywords: ["unor", "unit"] },
    { value: "petugas_level2", label: "Petugas Level 2", keywords: ["eskalasi", "level 2"] },
    {
      value: "supervisor_unit",
      label: "Supervisor Monitoring",
      keywords: ["supervisor", "monitoring"],
    },
    {
      value: "humas_monitoring",
      label: "Humas Monitoring",
      keywords: ["monitoring", "humas"],
    },
    { value: "humas_admin", label: "Humas Admin", keywords: ["admin"] },
  ];

  return includeAll
    ? [{ value: "all", label: "Semua peran", keywords: ["semua"] }, ...options]
    : options;
}

function buildStatusOptions(): AppSearchSelectOption[] {
  return [
    { value: "all", label: "Semua status" },
    { value: "aktif", label: "Aktif" },
    { value: "nonaktif", label: "Nonaktif" },
    { value: "reset", label: "Perlu reset" },
  ];
}

function buildDraft(
  staff: AdminStaffDirectoryItem | null,
  fallbackUnitId: string,
  officialOverrides: OfficialStaffOverrides,
  services: StaffServiceOption[],
  counters: StaffCounterOption[],
): StaffDraft {
  const role = (staff?.role || "resepsionis") as LegacyStaffRoleValue;
  const unitId = staff?.unitId ?? (isUnitScopedRole(role) ? fallbackUnitId : "");

  return {
    name: staff?.name ?? "",
    loginName: staff?.loginName ?? "",
    role,
    unitId,
    serviceIds: filterServiceIdsForDraft(staff?.serviceIds ?? [], services, role, unitId),
    counterIds: filterCounterIdsForDraft(staff?.counterIds ?? [], counters, role, unitId),
    active: staff?.active ?? true,
    isOfficial: staff ? isOfficialStaffAccount(staff, officialOverrides) : false,
    pin: "",
    pinConfirmation: "",
    requestPasswordReset: staff?.mustChangePassword ?? false,
  };
}

function validateDraft(draft: StaffDraft, isCreateMode: boolean) {
  const errors: Partial<Record<keyof StaffDraft, string>> = {};
  const normalizedLoginName = draft.loginName.trim().toLowerCase();

  if (!draft.name.trim()) {
    errors.name = "Nama petugas wajib diisi.";
  }

  if (!normalizedLoginName) {
    errors.loginName = "Login email wajib diisi.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedLoginName)) {
    errors.loginName = "Gunakan email login yang valid.";
  } else if (draft.isOfficial && !normalizedLoginName.endsWith("@lkpp.go.id")) {
    errors.loginName = "Akun resmi harus memakai email @lkpp.go.id.";
  }

  if (!draft.role) {
    errors.role = "Peran wajib dipilih.";
  }

  if (isUnitScopedRole(draft.role) && !draft.unitId.trim()) {
    errors.unitId = "Unit kerja wajib dipilih.";
  }

  if (requiresServiceAssignment(draft.role) && draft.serviceIds.length < 1) {
    errors.serviceIds = "Pilih minimal satu layanan untuk akun ini.";
  }

  if (requiresCounterAssignment(draft.role) && draft.counterIds.length < 1) {
    errors.counterIds = "Pilih minimal satu loket untuk akun unit ini.";
  }

  if (isCreateMode) {
    if (!draft.pin.trim()) {
      errors.pin = "Kata sandi awal wajib diisi.";
    } else if (!isStrongPassword(draft.pin.trim())) {
      errors.pin = PASSWORD_POLICY_HINT;
    }
  } else if (draft.pin.trim() && !isStrongPassword(draft.pin.trim())) {
    errors.pin = PASSWORD_POLICY_HINT;
  }

  if (isCreateMode || draft.pin.trim()) {
    if (!draft.pinConfirmation.trim()) {
      errors.pinConfirmation = "Konfirmasi kata sandi wajib diisi.";
    } else if (draft.pin !== draft.pinConfirmation) {
      errors.pinConfirmation = "Konfirmasi kata sandi harus sama.";
    }
  }

  return errors;
}

function getAccountStatus(staff: AdminStaffDirectoryItem) {
  if (staff.mustChangePassword) {
    return { tone: "diproses" as const, label: "Perlu reset" };
  }

  if (staff.active) {
    return { tone: "aktif" as const, label: "Aktif" };
  }

  return { tone: "warning" as const, label: "Nonaktif" };
}

async function invalidateAdminStaffQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin-staff-directory"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-unor-directory"] }),
    queryClient.invalidateQueries({ queryKey: ["unit-pic-directory"] }),
    queryClient.invalidateQueries({ queryKey: ["booking-runtime-data"] }),
    queryClient.invalidateQueries({ queryKey: ["offline-visitor-runtime"] }),
    queryClient.invalidateQueries({ queryKey: ["staff-live-appointments"] }),
    queryClient.invalidateQueries({ queryKey: ["user-live-appointments"] }),
  ]);
}

export function AdminStaffAccessSection({
  chrome,
}: {
  chrome?: AdminStaffAccessChrome | null;
}) {
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const sessionQuery = useAuthSessionQuery();
  const unitCountersQuery = useAdminUnitCountersQuery();
  const session = sessionQuery.data?.session;
  const { data, isLoading, isError, isHumasAdmin } = useAdminStaffDirectoryQuery();
  const [officialOverrides, setOfficialOverrides] = useLocalStorage<OfficialStaffOverrides>(
    "lkpp-admin-official-staff-overrides",
    EMPTY_OFFICIAL_STAFF_OVERRIDES,
  );

  const canPersistChanges =
    session?.variant === "staff" &&
    session.role === "humas-admin" &&
    session.authMode === "live" &&
    Boolean(session.staffId);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<StaffRoleFilter>("all");
  const [unitFilter, setUnitFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<StaffStatusFilter>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | "new" | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] =
    React.useState<AdminStaffDirectoryItem | null>(null);
  const staffServicesQuery = useQuery({
    queryKey: ["admin-staff-service-options", session?.staffId ?? "anonymous"],
    enabled: Boolean(hydrated && canPersistChanges && session?.staffId),
    staleTime: 60_000,
    queryFn: () => getScopedData({ staffId: session?.staffId ?? undefined }),
  });

  const items = React.useMemo(
    () =>
      [...(data?.items ?? [])].sort((left, right) =>
        rankStaff(left, right, officialOverrides),
      ),
    [data, officialOverrides],
  );
  const unitOptions = React.useMemo(() => buildUnitOptions(items), [items]);
  const allServiceOptions = React.useMemo(
    () => normalizeStaffServiceOptions(staffServicesQuery.data?.data as StaffScopedDataResponse | undefined),
    [staffServicesQuery.data],
  );
  const allCounterOptions = React.useMemo(
    () => normalizeStaffCounterOptions(unitCountersQuery.data?.items),
    [unitCountersQuery.data?.items],
  );
  const roleFilterOptions = React.useMemo(() => buildRoleOptions(true), []);
  const roleFormOptions = React.useMemo(() => buildRoleOptions(false), []);
  const statusOptions = React.useMemo(() => buildStatusOptions(), []);
  const fallbackUnitId = unitOptions.find((unit) => unit.value === "D11")?.value
    ?? unitOptions.find((unit) => unit.value)?.value
    ?? "";

  const selectedStaff =
    selectedStaffId && selectedStaffId !== "new"
      ? items.find((item) => item.id === selectedStaffId) ?? null
      : null;
  const isCreateMode = selectedStaffId === "new";
  const baseDraft = React.useMemo(
    () =>
      buildDraft(
        isCreateMode ? null : selectedStaff,
        fallbackUnitId,
        officialOverrides,
        allServiceOptions,
        allCounterOptions,
      ),
    [allCounterOptions, allServiceOptions, fallbackUnitId, isCreateMode, officialOverrides, selectedStaff],
  );
  const [draft, setDraft] = React.useState<StaffDraft>(baseDraft);

  React.useEffect(() => {
    setDraft(baseDraft);
  }, [baseDraft]);

  React.useEffect(() => {
    if (
      selectedStaffId &&
      selectedStaffId !== "new" &&
      !items.some((item) => item.id === selectedStaffId)
    ) {
      setSelectedStaffId(items[0]?.id ?? null);
    }
  }, [items, selectedStaffId]);

  const openEditor = React.useCallback(
    (staffId: string | "new") => {
      if (!canPersistChanges && staffId === "new") {
        return;
      }

      setSelectedStaffId(staffId);
      setEditorOpen(true);
    },
    [canPersistChanges],
  );

  const handleCreateRequest = React.useCallback(() => {
    if (!canPersistChanges) {
      toast.error("Masuk sebagai Humas Admin live terlebih dahulu untuk menambah akun.");
      return;
    }

    openEditor("new");
  }, [canPersistChanges, openEditor]);

  const handleRefreshRequest = React.useCallback(() => {
    void invalidateAdminStaffQueries(queryClient).then(() => {
      toast.success("Data akun disegarkan.");
    });
  }, [queryClient]);

  React.useEffect(() => {
    window.addEventListener("lkpp:admin-staff:create", handleCreateRequest);
    window.addEventListener("lkpp:admin-staff:refresh", handleRefreshRequest);

    return () => {
      window.removeEventListener("lkpp:admin-staff:create", handleCreateRequest);
      window.removeEventListener("lkpp:admin-staff:refresh", handleRefreshRequest);
    };
  }, [handleCreateRequest, handleRefreshRequest]);

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const status = getAccountStatus(item);

      if (roleFilter !== "all" && item.role !== roleFilter) {
        return false;
      }

      if (unitFilter !== "all" && item.unitId !== unitFilter) {
        return false;
      }

      if (statusFilter === "aktif" && !item.active) {
        return false;
      }

      if (statusFilter === "nonaktif" && item.active) {
        return false;
      }

      if (statusFilter === "reset" && !item.mustChangePassword) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        item.name,
        item.loginName,
        getRoleLabel(item.role),
        item.unitName,
        item.unitId,
        status.label,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [items, roleFilter, searchQuery, statusFilter, unitFilter]);

  const totalCount = items.length;
  const activeCount = items.filter((item) => item.active).length;
  const linkedUnitCount = items.filter((item) => item.unitId).length;
  const resetRequiredCount = items.filter((item) => item.mustChangePassword).length;
  const officialCount = items.filter((item) => isOfficialStaffAccount(item, officialOverrides)).length;
  const canonicalOfficialCount = CANONICAL_INTERNAL_STAFF_ACCOUNTS.filter((spec) =>
    items.some(
      (item) => item.loginName.toLowerCase() === spec.loginName && item.active,
    ),
  ).length;
  const missingCanonicalOfficialAccounts = CANONICAL_INTERNAL_STAFF_ACCOUNTS.filter(
    (spec) =>
      !items.some(
        (item) => item.loginName.toLowerCase() === spec.loginName && item.active,
      ),
  );
  const activeFilterCount =
    Number(Boolean(searchQuery.trim())) +
    Number(roleFilter !== "all") +
    Number(unitFilter !== "all") +
    Number(statusFilter !== "all");

  const validationErrors = React.useMemo(
    () => validateDraft(draft, isCreateMode),
    [draft, isCreateMode],
  );
  const hasValidationErrors = Object.values(validationErrors).some(Boolean);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(baseDraft);
  const canShowPasswordField = true;
  const isUnitScopedDraft = isUnitScopedRole(draft.role);
  const normalizedDraftLoginName = normalizeLoginName(draft.loginName);
  const isCanonicalDraftLogin = isCanonicalOfficialLogin(normalizedDraftLoginName);
  const eligibleServiceOptions = React.useMemo(
    () => getEligibleServiceOptions(allServiceOptions, draft.role, draft.unitId),
    [allServiceOptions, draft.role, draft.unitId],
  );
  const eligibleCounterOptions = React.useMemo(
    () => getEligibleCounterOptions(allCounterOptions, draft.role, draft.unitId),
    [allCounterOptions, draft.role, draft.unitId],
  );
  const orphanDraftServiceIds = React.useMemo(
    () =>
      draft.serviceIds.filter(
        (serviceId) => !allServiceOptions.some((service) => service.id === serviceId),
      ),
    [allServiceOptions, draft.serviceIds],
  );
  const orphanDraftCounterIds = React.useMemo(
    () =>
      draft.counterIds.filter(
        (counterId) => !allCounterOptions.some((counter) => counter.id === counterId),
      ),
    [allCounterOptions, draft.counterIds],
  );

  const saveMutation = useMutation({
    mutationFn: async (currentDraft: StaffDraft) => {
      if (!canPersistChanges || !session?.staffId) {
        throw new Error("Masuk sebagai Humas Admin live terlebih dahulu.");
      }

      const payload: Record<string, unknown> = {
        name: currentDraft.name.trim(),
        loginName: currentDraft.loginName.trim().toLowerCase(),
        role: currentDraft.role,
        active: currentDraft.active,
        unorId: isUnitScopedRole(currentDraft.role) ? currentDraft.unitId.trim() : null,
      };

      if (isCreateMode) {
        if (currentDraft.pin.trim()) {
          payload.pin = currentDraft.pin.trim();
        }
      }

      if (!isCreateMode) {
        payload.requestPasswordReset = currentDraft.requestPasswordReset;
      }

      const response = isCreateMode
        ? createStaff(payload, { staffId: session.staffId })
        : updateStaff(selectedStaff?.id ?? "", payload, { staffId: session.staffId });
      const persisted = await response;
      const resolvedStaffId =
        extractResponseStaffId(persisted) ||
        selectedStaff?.id ||
        undefined;

      if (!isCreateMode) {
        if (currentDraft.pin.trim()) {
          try {
            await syncStaffPassword({
              staffId: resolvedStaffId,
              loginName: currentDraft.loginName.trim().toLowerCase(),
              newPassword: currentDraft.pin.trim(),
            });
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Sinkron password akun gagal.";
            throw new Error(
              `Akun berhasil disimpan, tetapi password akun gagal diperbarui. ${message}`,
            );
          }
        } else {
          try {
            await syncStaffResetAccess({
              staffId: resolvedStaffId,
              loginName: currentDraft.loginName.trim().toLowerCase(),
              requestPasswordReset: currentDraft.requestPasswordReset,
            });
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Sinkron reset akses akun gagal.";
            throw new Error(
              `Akun berhasil disimpan, tetapi sinkron reset akses gagal. ${message}`,
            );
          }
        }
      }

      try {
        await syncStaffAssignments({
          staffId: resolvedStaffId,
          loginName: currentDraft.loginName.trim().toLowerCase(),
          serviceIds: currentDraft.serviceIds,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Sinkron layanan akun gagal.";
        throw new Error(`Akun berhasil disimpan, tetapi sinkron layanan gagal. ${message}`);
      }

      try {
        const counterIdsToSync = requiresCounterAssignment(currentDraft.role)
          ? currentDraft.counterIds
          : [];

        await syncStaffCounterAssignments({
          staffId: resolvedStaffId,
          loginName: currentDraft.loginName.trim().toLowerCase(),
          counterIds: counterIdsToSync,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Sinkron loket akun gagal.";
        throw new Error(`Akun berhasil disimpan, tetapi sinkron loket gagal. ${message}`);
      }

      return persisted;
    },
    onSuccess: async (_data, currentDraft) => {
      setOfficialOverrides((currentValue) => {
        const nextValue = { ...currentValue };
        const previousLoginName = normalizeLoginName(selectedStaff?.loginName ?? "");
        const nextLoginName = normalizeLoginName(currentDraft.loginName);

        if (previousLoginName) {
          delete nextValue[previousLoginName];
        }

        if (
          nextLoginName &&
          currentDraft.isOfficial &&
          !isCanonicalOfficialLogin(nextLoginName)
        ) {
          nextValue[nextLoginName] = true;
        } else if (nextLoginName) {
          delete nextValue[nextLoginName];
        }

        return nextValue;
      });
      await invalidateAdminStaffQueries(queryClient);
      setEditorOpen(false);
      setSelectedStaffId(null);
      toast.success(
        isCreateMode
          ? "Akun petugas berhasil ditambahkan."
          : "Perubahan akun petugas berhasil disimpan.",
      );
    },
    onError: (error) => {
      if (
        error instanceof Error &&
        (
          error.message.startsWith("Akun berhasil disimpan, tetapi sinkron layanan gagal") ||
          error.message.startsWith("Akun berhasil disimpan, tetapi sinkron loket gagal")
        )
      ) {
        void invalidateAdminStaffQueries(queryClient);
      }

      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan akun petugas.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (target: AdminStaffDirectoryItem) => {
      if (!canPersistChanges || !session?.staffId) {
        throw new Error("Masuk sebagai Humas Admin live terlebih dahulu.");
      }

      if (target.id === session.staffId) {
        throw new Error("Akun yang sedang dipakai tidak bisa dihapus dari panel ini.");
      }

      await syncStaffAssignments({
        staffId: target.id,
        loginName: target.loginName,
        serviceIds: [],
      });
      await syncStaffCounterAssignments({
        staffId: target.id,
        loginName: target.loginName,
        counterIds: [],
      });
      await syncStaffResetAccess({
        staffId: target.id,
        loginName: target.loginName,
        requestPasswordReset: false,
      });
      await deleteStaff(target.id, { staffId: session.staffId });

      return target;
    },
    onSuccess: async (target) => {
      setOfficialOverrides((currentValue) => {
        const nextValue = { ...currentValue };
        delete nextValue[normalizeLoginName(target.loginName)];
        return nextValue;
      });
      if (selectedStaffId === target.id) {
        setSelectedStaffId(null);
      }
      setDeleteTarget(null);
      await invalidateAdminStaffQueries(queryClient);
      toast.success("Akun petugas berhasil dihapus.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus akun petugas.",
      );
    },
  });

  async function handleSave() {
    if (!canPersistChanges) {
      toast.error("Masuk sebagai Humas Admin live terlebih dahulu untuk menyimpan.");
      return;
    }

    if (hasValidationErrors) {
      toast.error("Periksa kembali isian akun yang wajib.");
      return;
    }

    if (!isCreateMode && !selectedStaff) {
      toast.error("Akun yang dipilih belum tersedia.");
      return;
    }

    await saveMutation.mutateAsync(draft);
  }

  function handleEditorOpenChange(nextOpen: boolean) {
    setEditorOpen(nextOpen);
    if (!nextOpen) {
      setSelectedStaffId(null);
    }
  }

  function resetFilters() {
    setSearchQuery("");
    setRoleFilter("all");
    setUnitFilter("all");
    setStatusFilter("all");
    setShowAdvancedFilters(false);
  }

  const actionButtons = (chrome?.actionPills ?? []).map((label) => {
    const lowerLabel = label.toLowerCase();

    return (
      <AppButton
        key={label}
        size="sm"
        variant={lowerLabel.includes("tambah") ? "default" : "outline"}
        onClick={() => {
          if (lowerLabel.includes("tambah")) {
            handleCreateRequest();
            return;
          }

          if (lowerLabel.includes("reset")) {
            setStatusFilter("reset");
            setShowAdvancedFilters(true);
            toast.success("Filter akun yang perlu reset ditampilkan.");
            return;
          }

          resetFilters();
          toast.success("Menampilkan seluruh akun.");
        }}
      >
        {lowerLabel.includes("tambah") ? <Plus className="size-4" /> : null}
        {lowerLabel.includes("reset") ? <ShieldAlert className="size-4" /> : null}
        {label}
      </AppButton>
    );
  });

  function handleRoleChange(nextRole: string) {
    const nextRoleValue = nextRole as LegacyStaffRoleValue;
    setDraft((currentValue) => {
      const nextUnitId = isUnitScopedRole(nextRoleValue)
        ? currentValue.unitId || fallbackUnitId
        : "";
      const preservedServiceIds = filterServiceIdsForDraft(
        currentValue.serviceIds,
        allServiceOptions,
        nextRoleValue,
        nextUnitId,
      );
      const nextServiceIds =
        preservedServiceIds.length > 0 || !isCreateMode
          ? preservedServiceIds
          : getDefaultServiceIdsForDraft(allServiceOptions, nextRoleValue, nextUnitId);
      const nextCounterIds = filterCounterIdsForDraft(
        currentValue.counterIds,
        allCounterOptions,
        nextRoleValue,
        nextUnitId,
      );

      return {
        ...currentValue,
        role: nextRoleValue,
        unitId: nextUnitId,
        serviceIds: nextServiceIds,
        counterIds: nextCounterIds,
        requestPasswordReset:
          nextRoleValue === "humas_admin" ? false : currentValue.requestPasswordReset,
      };
    });
  }

  function handleUnitChange(nextUnitId: string) {
    setDraft((currentValue) => ({
      ...currentValue,
      unitId: nextUnitId,
      serviceIds: (() => {
        const preservedServiceIds = filterServiceIdsForDraft(
          currentValue.serviceIds,
          allServiceOptions,
          currentValue.role,
          nextUnitId,
        );

        if (preservedServiceIds.length > 0 || !isCreateMode) {
          return preservedServiceIds;
        }

        return getDefaultServiceIdsForDraft(
          allServiceOptions,
          currentValue.role,
          nextUnitId,
        );
      })(),
      counterIds: filterCounterIdsForDraft(
        currentValue.counterIds,
        allCounterOptions,
        currentValue.role,
        nextUnitId,
      ),
    }));
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

  function toggleCounter(counterId: string, checked: boolean) {
    setDraft((currentValue) => {
      const currentCounterIds = new Set(currentValue.counterIds);

      if (checked) {
        currentCounterIds.add(counterId);
      } else {
        currentCounterIds.delete(counterId);
      }

      return {
        ...currentValue,
        counterIds: Array.from(currentCounterIds).sort(),
      };
    });
  }

  if (!hydrated) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {["Total akun resmi", "Akun aktif", "Terhubung ke unit", "Perlu reset"].map(
          (label) => (
            <AppStatCard
              key={label}
              label={label}
              value="..."
              description="Menyiapkan data akun petugas"
            />
          ),
        )}
      </div>
    );
  }

  if (!isHumasAdmin) {
    return (
      <AppCard tone="soft" padding="lg" className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Akses dibatasi</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Masuk sebagai Humas Admin untuk melihat dan mengelola akun.
        </p>
      </AppCard>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {["Total akun", "Akun aktif", "Terhubung ke unit", "Perlu reset"].map((label) => (
          <AppStatCard key={label} label={label} value="..." description="Memuat data staff" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <AppCard tone="soft" padding="lg" className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Data belum dapat dimuat</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Coba muat ulang halaman setelah koneksi kembali normal.
        </p>
      </AppCard>
    );
  }

  return (
    <div className="space-y-6">
      {chrome?.actionEyebrow && chrome.actionDescription ? (
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

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <AppStatCard
          label="Total Akun"
          value={String(totalCount)}
          description={`Seluruh login petugas yang terbaca dari data live. ${officialCount} akun resmi sedang aktif.`}
        />
        <AppStatCard
          label="Akun Aktif"
          value={String(activeCount)}
          description="Login yang masih dipakai."
          tone="success"
        />
        <AppStatCard
          label="Terhubung ke Unit"
          value={String(linkedUnitCount)}
          description="Akun yang memiliki penugasan unit."
          tone="info"
        />
        <AppStatCard
          label="Perlu Reset"
          value={String(resetRequiredCount)}
          description="Akun yang perlu pembaruan akses."
          tone={resetRequiredCount > 0 ? "warning" : "success"}
        />
      </div>

      {missingCanonicalOfficialAccounts.length > 0 ? (
        <AppNotice
          icon={ShieldAlert}
          title="Daftar login resmi default belum lengkap"
          description={`Login resmi default yang sudah terbaca ${canonicalOfficialCount} dari ${CANONICAL_INTERNAL_STAFF_ACCOUNTS.length}. Belum terbaca: ${missingCanonicalOfficialAccounts
            .map((item) => maskEmail(item.loginName))
            .join(", ")}.`}
          tone="warning"
        />
      ) : null}

      <AppFilterBar
        actions={
          <>
            <AppButton variant="outline" onClick={resetFilters} disabled={!activeFilterCount}>
              <RefreshCw className="size-4" />
              Reset Filter
            </AppButton>
          </>
        }
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <AppInput
            id="admin-staff-search"
            placeholder="Cari nama petugas, login, unit, atau peran"
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
        <div className="grid gap-3 rounded-[calc(var(--radius-2xl)+4px)] border border-border bg-surface-container-lowest p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <AppSearchSelect
            value={roleFilter}
            onValueChange={(value) => setRoleFilter(value as StaffRoleFilter)}
            options={roleFilterOptions}
            placeholder="Semua peran"
            searchPlaceholder="Cari peran"
            emptyMessage="Peran tidak ditemukan."
            className="w-full"
          />
          <AppSearchSelect
            value={unitFilter}
            onValueChange={setUnitFilter}
            options={[{ value: "all", label: "Semua unit" }, ...unitOptions]}
            placeholder="Semua unit"
            searchPlaceholder="Cari unit"
            emptyMessage="Unit tidak ditemukan."
            className="w-full"
          />
          <AppSearchSelect
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StaffStatusFilter)}
            options={statusOptions}
            placeholder="Semua status"
            searchPlaceholder="Cari status"
            emptyMessage="Status tidak ditemukan."
            className="w-full"
          />
        </div>
      ) : null}

      {activeFilterCount ? (
        <div className="flex flex-wrap items-center gap-2">
          {searchQuery.trim() ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
              {`Cari: ${searchQuery.trim()}`}
            </span>
          ) : null}
          {roleFilter !== "all" ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
              {getRoleLabel(roleFilter)}
            </span>
          ) : null}
          {unitFilter !== "all" ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
              {unitOptions.find((unit) => unit.value === unitFilter)?.label ?? "Unit terpilih"}
            </span>
          ) : null}
          {statusFilter !== "all" ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
              {statusOptions.find((option) => option.value === statusFilter)?.label ?? "Status terpilih"}
            </span>
          ) : null}
        </div>
      ) : null}

      <AppCard padding="lg" className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            Akun petugas
          </p>
          <AppCardTitle className="text-2xl">Daftar akun dan penugasan</AppCardTitle>
          <AppCardDescription>
            Kelola login, peran, dan unit kerja melalui popup agar tabel tetap bersih dan mudah diaudit.
          </AppCardDescription>
        </div>

        <AppTable className="table-fixed">
          <AppTableHead>
            <tr>
              <AppTableHeaderCell className="w-[22%]">Petugas</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[22%]">Login</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[18%]">Peran</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[18%]">Unit</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[10%]">Status</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[10%]">Aksi</AppTableHeaderCell>
            </tr>
          </AppTableHead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const status = getAccountStatus(item);
                const isOfficial = isOfficialStaffAccount(item, officialOverrides);

                return (
                  <AppTableRow key={item.id}>
                    <AppTableCell className="space-y-1">
                      <p className="font-semibold text-foreground">{item.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {isOfficial ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-role-accent-soft px-2.5 py-1 text-[11px] font-semibold text-role-accent">
                            <ShieldCheck className="size-3.5" />
                            Akun resmi
                          </span>
                        ) : null}
                        {item.mustChangePassword ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning">
                            <ShieldAlert className="size-3.5" />
                            Perlu reset
                          </span>
                        ) : null}
                      </div>
                    </AppTableCell>
                    <AppTableCell className="space-y-1 font-mono text-xs text-muted-foreground">
                      <p>{maskEmail(item.loginName)}</p>
                      <p className="font-sans text-[11px] leading-5 text-muted-foreground">
                        {item.assignedServiceCount > 0
                          ? `${item.assignedServiceCount} layanan tersinkron.`
                          : "Belum terhubung ke layanan."}
                      </p>
                      {requiresCounterAssignment(item.role) && item.counterIds.length > 0 ? (
                        <p className="font-sans text-[11px] leading-5 text-muted-foreground">
                          {item.counterIds.length} loket tersinkron.
                        </p>
                      ) : null}
                    </AppTableCell>
                    <AppTableCell>{getRoleLabel(item.role)}</AppTableCell>
                    <AppTableCell>
                      {item.unitName || item.unitId || (
                        <span className="text-muted-foreground">Tidak terhubung unit</span>
                      )}
                    </AppTableCell>
                    <AppTableCell className="space-y-2">
                      <AppStatusBadge status={status.tone} label={status.label} />
                      {item.mustChangePassword ? (
                        <p className="text-xs leading-5 text-muted-foreground">
                          Petugas perlu mengganti kata sandi saat login berikutnya.
                        </p>
                      ) : null}
                    </AppTableCell>
                    <AppTableCell>
                      <div className="flex flex-wrap gap-2">
                        <AppButton
                          size="xs"
                          variant="outline"
                          disabled={deleteMutation.isPending}
                          onClick={() => openEditor(item.id)}
                        >
                          <PencilLine className="size-3.5" />
                          Edit
                        </AppButton>
                        <AppButton
                          size="xs"
                          variant="ghost"
                          disabled={saveMutation.isPending || deleteMutation.isPending}
                          loading={deleteMutation.isPending && deleteTarget?.id === item.id}
                          loadingLabel="Menghapus..."
                          onClick={() => setDeleteTarget(item)}
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
                <AppTableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Belum ada akun yang sesuai dengan filter aktif.
                </AppTableCell>
              </AppTableRow>
            )}
          </tbody>
        </AppTable>
      </AppCard>

      <AppCard tone="soft" padding="md" className="space-y-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            Catatan penugasan
          </p>
          <AppCardTitle className="text-xl">Login resmi, peran, dan unit harus konsisten</AppCardTitle>
          <AppCardDescription>
            Perubahan pada panel ini memengaruhi alur login petugas, pembacaan unit, dan penugasan di role lain.
          </AppCardDescription>
        </div>
        <div className="space-y-2 text-sm leading-6 text-muted-foreground">
          <p>Akun resmi hanya tampil saat status akun aktif dan memakai email lembaga.</p>
          <p>Login resmi default sistem tetap dipantau terpisah dari akun resmi tambahan.</p>
        </div>
      </AppCard>

      <AppDialog
        open={editorOpen}
        onOpenChange={handleEditorOpenChange}
        title={isCreateMode ? "Tambah akun petugas" : "Edit akun petugas"}
        className="max-w-5xl"
        description={
          isCreateMode
            ? "Tambahkan akun resmi untuk operasional."
            : `Ubah data akun resmi ${selectedStaff?.name ?? ""} tanpa mengganggu daftar utama.`
        }
      >
        <div className="space-y-4">
          <AdminEditorSection
            eyebrow={isCreateMode ? "Akun baru" : "Detail akun"}
            title="Identitas akun"
            description="Gunakan nama dan email resmi yang dipakai untuk masuk."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AdminFormField
                label="Nama petugas"
                error={validationErrors.name}
                controlId="admin-staff-name"
              >
                <AppInput
                  id="admin-staff-name"
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
                label="Email login"
                error={validationErrors.loginName}
                controlId="admin-staff-login"
              >
                <AppInput
                  id="admin-staff-login"
                  value={draft.loginName}
                  disabled={!canPersistChanges || saveMutation.isPending}
                  onChange={(event) =>
                    setDraft((currentValue) => ({
                      ...currentValue,
                      loginName: event.target.value,
                    }))
                  }
                />
              </AdminFormField>
            </div>
          </AdminEditorSection>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <AdminEditorSection
              eyebrow="Penugasan"
              title="Peran dan unit"
              description="Atur hak akses utama petugas."
              className="h-full"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <AdminFormField
                  label="Peran petugas"
                  error={validationErrors.role}
                  controlId="admin-staff-role"
                >
                  <AppSearchSelect
                    id="admin-staff-role"
                    value={draft.role}
                    onValueChange={handleRoleChange}
                    options={roleFormOptions}
                    placeholder="Pilih peran"
                    searchPlaceholder="Cari peran"
                    emptyMessage="Peran tidak ditemukan."
                    disabled={!canPersistChanges || saveMutation.isPending}
                    className="w-full"
                  />
                </AdminFormField>

                {isUnitScopedDraft ? (
                  <AdminFormField
                    label="Unit kerja"
                    error={validationErrors.unitId}
                    controlId="admin-staff-unit"
                  >
                    <AppSearchSelect
                      id="admin-staff-unit"
                      value={draft.unitId}
                      onValueChange={handleUnitChange}
                      options={unitOptions}
                      placeholder="Pilih unit"
                      searchPlaceholder="Cari unit"
                      emptyMessage="Unit tidak ditemukan."
                      disabled={!canPersistChanges || saveMutation.isPending}
                      className="w-full"
                      />
                    </AdminFormField>
                  ) : (
                  <AdminFormField
                    label="Unit kerja"
                    controlId="admin-staff-unit-readonly"
                  >
                    <div className="flex h-12 items-center rounded-[var(--radius-xl)] border border-border bg-surface-container-lowest px-4 text-sm text-muted-foreground">
                      Tidak terhubung unit
                    </div>
                  </AdminFormField>
                )}
              </div>
            </AdminEditorSection>

            <AdminEditorSection
              eyebrow="Keamanan"
              title="Status dan sandi"
              description="Kelola akses masuk tanpa menambah teks yang tidak perlu."
              className="h-full"
            >
              <div className="grid gap-4">
                <label className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-surface-container-low px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Status aktif</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Akun nonaktif tetap tersimpan, tetapi tidak dapat dipakai untuk masuk.
                    </p>
                  </div>
                  <AppCheckbox
                    checked={draft.active}
                    disabled={!canPersistChanges || saveMutation.isPending}
                    onChange={(event) =>
                      setDraft((currentValue) => ({
                        ...currentValue,
                        active: event.target.checked,
                      }))
                    }
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-surface-container-low px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Tandai sebagai akun resmi</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {isCanonicalDraftLogin
                        ? "Login ini termasuk daftar resmi default sistem dan akan tampil sebagai akun resmi saat aktif."
                        : "Saat aktif, akun ini akan mendapat badge Akun resmi di tabel admin."}
                    </p>
                  </div>
                  <AppCheckbox
                    checked={draft.isOfficial}
                    disabled={
                      !canPersistChanges ||
                      saveMutation.isPending ||
                      isCanonicalDraftLogin
                    }
                    onChange={(event) =>
                      setDraft((currentValue) => ({
                        ...currentValue,
                        isOfficial: event.target.checked,
                      }))
                    }
                  />
                </label>

                {canShowPasswordField ? (
                  <div className="grid gap-4">
                    <AdminFormField
                      label={isCreateMode ? "Kata sandi awal" : "Password baru"}
                      description={
                        isCreateMode ? PASSWORD_POLICY_HINT : "Kosongkan bila tidak diubah."
                      }
                      error={validationErrors.pin}
                      controlId="admin-staff-pin"
                    >
                      <AppPasswordInput
                        id="admin-staff-pin"
                        value={draft.pin}
                        disabled={!canPersistChanges || saveMutation.isPending}
                        onChange={(event) =>
                          setDraft((currentValue) => ({
                            ...currentValue,
                            pin: event.target.value,
                          }))
                        }
                        placeholder={isCreateMode ? PASSWORD_POLICY_HINT : "Kosongkan bila tidak diubah"}
                      />
                    </AdminFormField>

                    <AdminFormField
                      label="Konfirmasi password"
                      error={validationErrors.pinConfirmation}
                      controlId="admin-staff-pin-confirmation"
                    >
                      <AppPasswordInput
                        id="admin-staff-pin-confirmation"
                        value={draft.pinConfirmation}
                        disabled={!canPersistChanges || saveMutation.isPending}
                        onChange={(event) =>
                          setDraft((currentValue) => ({
                            ...currentValue,
                            pinConfirmation: event.target.value,
                          }))
                        }
                        placeholder={isCreateMode ? "Ulangi kata sandi awal" : "Ulangi password baru"}
                      />
                    </AdminFormField>
                  </div>
                ) : null}
              </div>
            </AdminEditorSection>
          </div>

          <AdminEditorSection
            eyebrow="Cakupan layanan"
            title="Layanan yang ditangani akun ini"
            description="Pastikan akun baru langsung terhubung ke layanan operasional yang relevan."
          >
            {!isUnitScopedDraft ? (
              <AppNotice
                icon={BriefcaseBusiness}
                title="Assignment layanan opsional"
                description="Untuk role ini, layanan bisa dipilih bila ingin membatasi cakupan kerja akun."
              />
            ) : null}

            {isUnitScopedDraft && !draft.unitId ? (
              <AppNotice
                icon={BriefcaseBusiness}
                title="Pilih unit kerja terlebih dahulu"
                description="Daftar layanan unit akan muncul setelah unit kerja dipilih."
              />
            ) : null}

            {isUnitScopedDraft && draft.unitId && eligibleServiceOptions.length === 0 ? (
              <AppNotice
                icon={AlertCircle}
                title="Belum ada layanan pada unit ini"
                description="Akun unit tidak akan berfungsi penuh sebelum unit memiliki layanan aktif."
                tone="warning"
              />
            ) : null}

            {eligibleServiceOptions.length > 0 ? (
              <div className="grid gap-3">
                {eligibleServiceOptions.map((service) => (
                  <label
                    key={service.id}
                    className="flex items-start gap-3 rounded-[20px] border border-border bg-surface-container-low px-4 py-3"
                  >
                    <AppCheckbox
                      checked={draft.serviceIds.includes(service.id)}
                      disabled={!canPersistChanges || saveMutation.isPending}
                      onChange={(event) => toggleService(service.id, event.target.checked)}
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {service.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {service.id} · {service.unitLabel} · {service.serviceLevel === 2 ? "Level 2" : "Level 1"} · {service.enabled ? "Aktif" : "Nonaktif"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            ) : null}

            {validationErrors.serviceIds ? (
              <p className="text-sm font-medium text-danger">
                {validationErrors.serviceIds}
              </p>
            ) : null}

            {orphanDraftServiceIds.length > 0 ? (
              <AppNotice
                icon={AlertCircle}
                title="Ada layanan yang tidak lagi tersedia"
                description={`ID layanan berikut tidak ditemukan di katalog aktif: ${orphanDraftServiceIds.join(", ")}.`}
                tone="warning"
              />
            ) : null}
          </AdminEditorSection>

          <AdminEditorSection
            eyebrow="Loket operasional"
            title="Loket yang bisa dipakai akun ini"
            description="Khusus akun unit organisasi, pilih loket yang boleh dipakai saat memanggil antrean."
          >
            {!requiresCounterAssignment(draft.role) ? (
              <AppNotice
                icon={BriefcaseBusiness}
                title="Loket tidak dipakai pada role ini"
                description="Checkbox loket hanya dipakai akun Unit Organisasi saat memilih loket operasional untuk memanggil antrean."
              />
            ) : null}

            {requiresCounterAssignment(draft.role) && !draft.unitId ? (
              <AppNotice
                icon={BriefcaseBusiness}
                title="Pilih unit kerja terlebih dahulu"
                description="Daftar loket akan muncul setelah unit kerja dipilih."
              />
            ) : null}

            {requiresCounterAssignment(draft.role) &&
            draft.unitId &&
            eligibleCounterOptions.length === 0 ? (
              <AppNotice
                icon={AlertCircle}
                title="Belum ada loket pada unit ini"
                description="Atur loket unit terlebih dahulu pada panel unit organisasi sebelum akun ini dipakai operasional."
                tone="warning"
              />
            ) : null}

            {eligibleCounterOptions.length > 0 ? (
              <div className="grid gap-3">
                {eligibleCounterOptions.map((counter) => (
                  <label
                    key={counter.id}
                    className="flex items-start gap-3 rounded-[20px] border border-border bg-surface-container-low px-4 py-3"
                  >
                    <AppCheckbox
                      checked={draft.counterIds.includes(counter.id)}
                      disabled={!canPersistChanges || saveMutation.isPending}
                      onChange={(event) => toggleCounter(counter.id, event.target.checked)}
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {counter.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {counter.id} · {counter.unitId} · Loket {counter.counterNumber} · {counter.active ? "Aktif" : "Nonaktif"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            ) : null}

            {validationErrors.counterIds ? (
              <p className="text-sm font-medium text-danger">
                {validationErrors.counterIds}
              </p>
            ) : null}

            {orphanDraftCounterIds.length > 0 ? (
              <AppNotice
                icon={AlertCircle}
                title="Ada loket yang tidak lagi tersedia"
                description={`ID loket berikut tidak ditemukan di katalog aktif: ${orphanDraftCounterIds.join(", ")}.`}
                tone="warning"
              />
            ) : null}
          </AdminEditorSection>

          <div className="flex flex-wrap gap-3">
            <AppButton
              variant="outline"
              onClick={() => setResetConfirmOpen(true)}
              disabled={!isDirty || saveMutation.isPending}
            >
              <RefreshCw className="size-4" />
              Kembalikan Isian
            </AppButton>
            <AppButton
              onClick={() => void handleSave()}
              loading={saveMutation.isPending}
              loadingLabel="Menyimpan..."
              disabled={!canPersistChanges || !isDirty || hasValidationErrors}
            >
              <Save className="size-4" />
              {isCreateMode ? "Simpan Akun" : "Simpan Perubahan"}
            </AppButton>
          </div>
        </div>
      </AppDialog>

      <AppConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Kembalikan isian akun?"
        description="Perubahan yang belum disimpan akan dibuang dan form kembali ke data awal."
        confirmLabel="Kembalikan Isian"
        confirmVariant="default"
        onConfirm={async () => {
          setResetConfirmOpen(false);
          setDraft(baseDraft);
        }}
      />

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null);
          }
        }}
        title="Apakah Anda yakin ingin menghapus akun ini?"
        description={
          deleteTarget
            ? `Klik tombol hapus sekali lagi untuk menghapus akun ${deleteTarget.name} dari data live, membersihkan assignment layanan, dan menghapus status reset akses.`
            : "Akun petugas akan dihapus dari data live."
        }
        confirmLabel="Ya, Hapus"
        confirmVariant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleteTarget) {
            return;
          }

          await deleteMutation.mutateAsync(deleteTarget);
        }}
      />

    </div>
  );
}
