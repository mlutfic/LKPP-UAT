import {
  STAFF_CANONICAL_ROUTES,
  type InternalStaffRole,
  type StaffPermissionKey,
  type StaffPermissionSet,
} from "@/lib/internal-role-policy";

export type StaffPermissionRequirement =
  | StaffPermissionKey
  | readonly StaffPermissionKey[]
  | {
      anyOf: readonly StaffPermissionKey[];
      allOf?: readonly StaffPermissionKey[];
    };

const ROUTE_PERMISSION_REQUIREMENTS: Record<
  InternalStaffRole,
  Partial<Record<string, StaffPermissionRequirement>>
> = {
  resepsionis: {
    [STAFF_CANONICAL_ROUTES.resepsionis.dashboard]: "canViewDashboard",
    [STAFF_CANONICAL_ROUTES.resepsionis.lobby]: "canCheckIn",
    [STAFF_CANONICAL_ROUTES.resepsionis.offlineVisitor]: "canCheckIn",
  },
  "unit-organisasi": {
    [STAFF_CANONICAL_ROUTES["unit-organisasi"].dashboard]: [
      "canViewDashboard",
      "canViewOwnUnor",
    ],
    [STAFF_CANONICAL_ROUTES["unit-organisasi"].queue]: "canViewOwnUnor",
    [STAFF_CANONICAL_ROUTES["unit-organisasi"].analytics]: [
      "canViewOwnUnor",
      "canViewStatistics",
    ],
  },
  "petugas-level-2": {
    [STAFF_CANONICAL_ROUTES["petugas-level-2"].dashboard]: [
      "canViewDashboard",
      "canViewOwnUnor",
    ],
    [STAFF_CANONICAL_ROUTES["petugas-level-2"].queue]: "canViewOwnUnor",
  },
  "supervisor-monitoring": {
    [STAFF_CANONICAL_ROUTES["supervisor-monitoring"].dashboard]: "canViewDashboard",
    [STAFF_CANONICAL_ROUTES["supervisor-monitoring"].monitoring]: "canViewStatistics",
    [STAFF_CANONICAL_ROUTES["supervisor-monitoring"].export]: "canExportData",
  },
  "humas-monitoring": {
    [STAFF_CANONICAL_ROUTES["humas-monitoring"].dashboard]: [
      "canViewDashboard",
      "canViewAllServices",
    ],
    [STAFF_CANONICAL_ROUTES["humas-monitoring"].monitoring]: [
      "canViewStatistics",
      "canViewAllServices",
    ],
    [STAFF_CANONICAL_ROUTES["humas-monitoring"].export]: [
      "canExportData",
      "canViewAllServices",
    ],
  },
  "humas-admin": {
    [STAFF_CANONICAL_ROUTES["humas-admin"].dashboard]: "canViewDashboard",
    [STAFF_CANONICAL_ROUTES["humas-admin"].services]: "canManageServices",
    [STAFF_CANONICAL_ROUTES["humas-admin"].staffAccess]: "canManageStaff",
    [STAFF_CANONICAL_ROUTES["humas-admin"].publicUsers]: "canManageStaff",
    [STAFF_CANONICAL_ROUTES["humas-admin"].units]: "canManageUnorConfig",
    [STAFF_CANONICAL_ROUTES["humas-admin"].announcements]: "canManageAnnouncements",
    [STAFF_CANONICAL_ROUTES["humas-admin"].operations]: "canManageOperatingSettings",
    [STAFF_CANONICAL_ROUTES["humas-admin"].helpFaq]: "canManageAnnouncements",
    [STAFF_CANONICAL_ROUTES["humas-admin"].roleAccess]: "canManageRolePermissions",
    [STAFF_CANONICAL_ROUTES["humas-admin"].export]: "canExportData",
    [STAFF_CANONICAL_ROUTES["humas-admin"].masterData]: "canManageServices",
    [STAFF_CANONICAL_ROUTES["humas-admin"].activity]: "canViewAudit",
    [STAFF_CANONICAL_ROUTES["humas-admin"].settings]: "canViewSystemHealth",
  },
};

const SHARED_CHECKIN_PATHS = new Set<string>([
  STAFF_CANONICAL_ROUTES.resepsionis.lobby,
  STAFF_CANONICAL_ROUTES.resepsionis.offlineVisitor,
]);

const SHARED_ROUTE_PERMISSION_REQUIREMENTS: Partial<
  Record<string, StaffPermissionRequirement>
> = {
  [STAFF_CANONICAL_ROUTES["unit-organisasi"].dashboard]: [
    "canViewDashboard",
    "canViewOwnUnor",
  ],
  [STAFF_CANONICAL_ROUTES["unit-organisasi"].queue]: "canViewOwnUnor",
  [STAFF_CANONICAL_ROUTES["unit-organisasi"].analytics]: [
    "canViewOwnUnor",
    "canViewStatistics",
  ],
  [STAFF_CANONICAL_ROUTES["humas-admin"].services]: "canManageServices",
  [STAFF_CANONICAL_ROUTES["humas-admin"].staffAccess]: "canManageStaff",
  [STAFF_CANONICAL_ROUTES["humas-admin"].publicUsers]: "canManageStaff",
  [STAFF_CANONICAL_ROUTES["humas-admin"].units]: "canManageUnorConfig",
  [STAFF_CANONICAL_ROUTES["humas-admin"].announcements]: "canManageAnnouncements",
  [STAFF_CANONICAL_ROUTES["humas-admin"].operations]: {
    anyOf: ["canManageOperatingSettings", "canRunSystemMaintenance"],
  },
  [STAFF_CANONICAL_ROUTES["humas-admin"].helpFaq]: "canManageAnnouncements",
  [STAFF_CANONICAL_ROUTES["humas-admin"].roleAccess]: "canManageRolePermissions",
  [STAFF_CANONICAL_ROUTES["humas-admin"].export]: "canExportData",
  [STAFF_CANONICAL_ROUTES["humas-admin"].masterData]: "canManageServices",
  [STAFF_CANONICAL_ROUTES["humas-admin"].activity]: "canViewAudit",
  [STAFF_CANONICAL_ROUTES["humas-admin"].profile]: "canManageStaff",
  [STAFF_CANONICAL_ROUTES["humas-admin"].settings]: "canViewSystemHealth",
};

const ROLE_FALLBACK_PATHS: Record<InternalStaffRole, readonly string[]> = {
  resepsionis: [
    STAFF_CANONICAL_ROUTES.resepsionis.profile,
    STAFF_CANONICAL_ROUTES.resepsionis.history,
    STAFF_CANONICAL_ROUTES.resepsionis.settings,
    STAFF_CANONICAL_ROUTES.resepsionis.dashboard,
    STAFF_CANONICAL_ROUTES.resepsionis.lobby,
  ],
  "unit-organisasi": [
    STAFF_CANONICAL_ROUTES["unit-organisasi"].profile,
    STAFF_CANONICAL_ROUTES["unit-organisasi"].settings,
    STAFF_CANONICAL_ROUTES.resepsionis.lobby,
    STAFF_CANONICAL_ROUTES.resepsionis.offlineVisitor,
    STAFF_CANONICAL_ROUTES["unit-organisasi"].dashboard,
    STAFF_CANONICAL_ROUTES["unit-organisasi"].queue,
    STAFF_CANONICAL_ROUTES["unit-organisasi"].analytics,
  ],
  "petugas-level-2": [
    STAFF_CANONICAL_ROUTES["petugas-level-2"].profile,
    STAFF_CANONICAL_ROUTES["petugas-level-2"].settings,
    STAFF_CANONICAL_ROUTES.resepsionis.lobby,
    STAFF_CANONICAL_ROUTES.resepsionis.offlineVisitor,
    STAFF_CANONICAL_ROUTES["petugas-level-2"].dashboard,
    STAFF_CANONICAL_ROUTES["petugas-level-2"].queue,
  ],
  "supervisor-monitoring": [
    STAFF_CANONICAL_ROUTES["supervisor-monitoring"].profile,
    STAFF_CANONICAL_ROUTES["supervisor-monitoring"].settings,
    STAFF_CANONICAL_ROUTES.resepsionis.lobby,
    STAFF_CANONICAL_ROUTES.resepsionis.offlineVisitor,
    STAFF_CANONICAL_ROUTES["supervisor-monitoring"].dashboard,
    STAFF_CANONICAL_ROUTES["supervisor-monitoring"].monitoring,
    STAFF_CANONICAL_ROUTES["supervisor-monitoring"].export,
  ],
  "humas-monitoring": [
    STAFF_CANONICAL_ROUTES["humas-monitoring"].profile,
    STAFF_CANONICAL_ROUTES["humas-monitoring"].settings,
    STAFF_CANONICAL_ROUTES.resepsionis.lobby,
    STAFF_CANONICAL_ROUTES.resepsionis.offlineVisitor,
    STAFF_CANONICAL_ROUTES["humas-monitoring"].dashboard,
    STAFF_CANONICAL_ROUTES["humas-monitoring"].monitoring,
    STAFF_CANONICAL_ROUTES["humas-monitoring"].export,
  ],
  "humas-admin": [
    STAFF_CANONICAL_ROUTES["humas-admin"].profile,
    STAFF_CANONICAL_ROUTES["humas-admin"].dashboard,
    STAFF_CANONICAL_ROUTES["humas-admin"].services,
    STAFF_CANONICAL_ROUTES["humas-admin"].staffAccess,
    STAFF_CANONICAL_ROUTES["humas-admin"].publicUsers,
    STAFF_CANONICAL_ROUTES["humas-admin"].units,
    STAFF_CANONICAL_ROUTES["humas-admin"].announcements,
    STAFF_CANONICAL_ROUTES["humas-admin"].operations,
    STAFF_CANONICAL_ROUTES["humas-admin"].helpFaq,
    STAFF_CANONICAL_ROUTES["humas-admin"].roleAccess,
    STAFF_CANONICAL_ROUTES["humas-admin"].export,
    STAFF_CANONICAL_ROUTES["humas-admin"].masterData,
    STAFF_CANONICAL_ROUTES["humas-admin"].activity,
    STAFF_CANONICAL_ROUTES["humas-admin"].settings,
  ],
};

const STAFF_PERMISSION_COPY: Record<StaffPermissionKey, string> = {
  canCallQueue: "memanggil antrean",
  canConfirmAppointment: "mengonfirmasi appointment",
  canMarkNoShow: "menandai tidak hadir",
  canStartService: "memulai atau menyelesaikan layanan",
  canPrioritizeQueue: "memprioritaskan antrean",
  canCancelAppointment: "membatalkan appointment",
  canAddStaffNote: "menambah catatan staff",
  canCheckIn: "mengakses check-in lobby",
  canViewDashboard: "melihat dashboard",
  canViewOwnUnor: "melihat data unit sendiri",
  canViewAllServices: "melihat semua layanan",
  canViewStatistics: "melihat statistik",
  canExportData: "mengekspor data",
  canViewAudit: "melihat audit aktivitas",
  canManageServices: "mengelola layanan",
  canManageStaff: "mengelola akun petugas",
  canManageAnnouncements: "mengelola pengumuman",
  canManageOperatingSettings: "mengelola pengaturan operasional",
  canRunSystemMaintenance: "menjalankan maintenance sistem",
  canManageUnorConfig: "mengelola konfigurasi unit",
  canManageRolePermissions: "mengelola hak akses role",
  canViewSystemHealth: "melihat kesehatan sistem",
};

function normalizeAllOfRequirements(
  requirement: StaffPermissionRequirement | null | undefined,
) {
  if (!requirement) {
    return [];
  }

  if (typeof requirement === "string") {
    return [requirement];
  }

  if (Array.isArray(requirement)) {
    return [...requirement] as StaffPermissionKey[];
  }

  if ("anyOf" in requirement) {
    return [...(requirement.allOf ?? [])] as StaffPermissionKey[];
  }

  return [];
}

function normalizeAnyOfRequirements(
  requirement: StaffPermissionRequirement | null | undefined,
) {
  if (!requirement || typeof requirement === "string" || Array.isArray(requirement)) {
    return [];
  }

  if ("anyOf" in requirement) {
    return [...requirement.anyOf] as StaffPermissionKey[];
  }

  return [];
}

export function getStaffRoutePermissionRequirement(
  role: InternalStaffRole,
  path: string,
) {
  const roleRequirement = ROUTE_PERMISSION_REQUIREMENTS[role][path];
  if (roleRequirement) {
    return roleRequirement;
  }

  const sharedRequirement = SHARED_ROUTE_PERMISSION_REQUIREMENTS[path];
  if (sharedRequirement) {
    return sharedRequirement;
  }

  if (SHARED_CHECKIN_PATHS.has(path)) {
    return "canCheckIn";
  }

  return null;
}

export function getMissingStaffPermissions(
  requirement: StaffPermissionRequirement | null | undefined,
  permissions?: Partial<StaffPermissionSet> | null,
) {
  const missingAllOf = normalizeAllOfRequirements(requirement).filter(
    (permission) => permissions?.[permission] !== true,
  );
  const anyOf = normalizeAnyOfRequirements(requirement);

  if (!anyOf.length || anyOf.some((permission) => permissions?.[permission] === true)) {
    return missingAllOf;
  }

  return [...missingAllOf, ...anyOf];
}

export function hasRequiredStaffPermissions(
  permissions: Partial<StaffPermissionSet> | null | undefined,
  requirement: StaffPermissionRequirement | null | undefined,
) {
  const missingAllOf = normalizeAllOfRequirements(requirement).some(
    (permission) => permissions?.[permission] !== true,
  );
  if (missingAllOf) {
    return false;
  }

  const anyOf = normalizeAnyOfRequirements(requirement);
  if (!anyOf.length) {
    return true;
  }

  return anyOf.some((permission) => permissions?.[permission] === true);
}

export function describeStaffPermissionRequirement(
  requirement: StaffPermissionRequirement | null | undefined,
) {
  const allOfLabels = normalizeAllOfRequirements(requirement).map(
    (permission) => STAFF_PERMISSION_COPY[permission],
  );
  const anyOfLabels = normalizeAnyOfRequirements(requirement).map(
    (permission) => STAFF_PERMISSION_COPY[permission],
  );

  if (!allOfLabels.length && !anyOfLabels.length) {
    return "mengakses halaman ini";
  }

  if (!anyOfLabels.length) {
    if (allOfLabels.length === 1) {
      return allOfLabels[0];
    }

    return `${allOfLabels.slice(0, -1).join(", ")} dan ${allOfLabels.at(-1)}`;
  }

  const anyOfText =
    anyOfLabels.length === 1
      ? anyOfLabels[0]
      : `${anyOfLabels.slice(0, -1).join(", ")} atau ${anyOfLabels.at(-1)}`;

  if (!allOfLabels.length) {
    return anyOfText;
  }

  return `${allOfLabels.join(", ")} serta ${anyOfText}`;
}

export function getFirstAccessibleStaffPath(
  role: InternalStaffRole,
  permissions?: Partial<StaffPermissionSet> | null,
  currentPath?: string,
) {
  for (const candidate of ROLE_FALLBACK_PATHS[role]) {
    if (candidate === currentPath) {
      continue;
    }

    const requirement = getStaffRoutePermissionRequirement(role, candidate);
    if (hasRequiredStaffPermissions(permissions, requirement)) {
      return candidate;
    }
  }

  return ROLE_FALLBACK_PATHS[role][0];
}
