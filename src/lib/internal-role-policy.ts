export type InternalStaffRole =
  | "resepsionis"
  | "unit-organisasi"
  | "petugas-level-2"
  | "supervisor-monitoring"
  | "humas-monitoring"
  | "humas-admin";

export type LegacyStaffRoleValue =
  | "resepsionis"
  | "akun_unit"
  | "petugas_level2"
  | "unor"
  | "supervisor_unit"
  | "supervisor"
  | "humas_monitoring"
  | "humas_admin"
  | "superadmin";

export type PermissionStorageRoleKey =
  | "resepsionis"
  | "akun_unit"
  | "petugas_level2"
  | "supervisor_unit"
  | "humas_monitoring"
  | "humas_admin";

export type StaffPermissionKey =
  | "canCallQueue"
  | "canConfirmAppointment"
  | "canMarkNoShow"
  | "canStartService"
  | "canPrioritizeQueue"
  | "canCancelAppointment"
  | "canAddStaffNote"
  | "canCheckIn"
  | "canViewDashboard"
  | "canViewOwnUnor"
  | "canViewAllServices"
  | "canViewStatistics"
  | "canExportData"
  | "canViewAudit"
  | "canManageServices"
  | "canManageStaff"
  | "canManageAnnouncements"
  | "canManageOperatingSettings"
  | "canRunSystemMaintenance"
  | "canManageUnorConfig"
  | "canManageRolePermissions"
  | "canViewSystemHealth";

export type StaffPermissionSet = Record<StaffPermissionKey, boolean>;
export type InternalRolePermissionMatrix = Record<InternalStaffRole, StaffPermissionSet>;

export const INTERNAL_ROLE_LABELS: Record<InternalStaffRole, string> = {
  resepsionis: "Resepsionis",
  "unit-organisasi": "Unit Organisasi",
  "petugas-level-2": "Petugas Level 2",
  "supervisor-monitoring": "Supervisor Monitoring",
  "humas-monitoring": "Humas Monitoring",
  "humas-admin": "Humas Admin",
};

export const STAFF_PERMISSION_BASELINE: Record<InternalStaffRole, StaffPermissionSet> = {
  resepsionis: {
    canCallQueue: false,
    canConfirmAppointment: false,
    canMarkNoShow: false,
    canStartService: false,
    canPrioritizeQueue: false,
    canCancelAppointment: false,
    canAddStaffNote: false,
    canCheckIn: true,
    canViewDashboard: true,
    canViewOwnUnor: false,
    canViewAllServices: false,
    canViewStatistics: false,
    canExportData: false,
    canViewAudit: false,
    canManageServices: false,
    canManageStaff: false,
    canManageAnnouncements: false,
    canManageOperatingSettings: false,
    canRunSystemMaintenance: false,
    canManageUnorConfig: false,
    canManageRolePermissions: false,
    canViewSystemHealth: false,
  },
  "unit-organisasi": {
    canCallQueue: true,
    canConfirmAppointment: false,
    canMarkNoShow: true,
    canStartService: true,
    canPrioritizeQueue: true,
    canCancelAppointment: false,
    canAddStaffNote: true,
    canCheckIn: false,
    canViewDashboard: true,
    canViewOwnUnor: true,
    canViewAllServices: false,
    canViewStatistics: true,
    canExportData: false,
    canViewAudit: false,
    canManageServices: false,
    canManageStaff: false,
    canManageAnnouncements: false,
    canManageOperatingSettings: false,
    canRunSystemMaintenance: false,
    canManageUnorConfig: false,
    canManageRolePermissions: false,
    canViewSystemHealth: false,
  },
  "petugas-level-2": {
    canCallQueue: false,
    canConfirmAppointment: false,
    canMarkNoShow: false,
    canStartService: true,
    canPrioritizeQueue: false,
    canCancelAppointment: false,
    canAddStaffNote: true,
    canCheckIn: false,
    canViewDashboard: true,
    canViewOwnUnor: true,
    canViewAllServices: false,
    canViewStatistics: false,
    canExportData: false,
    canViewAudit: false,
    canManageServices: false,
    canManageStaff: false,
    canManageAnnouncements: false,
    canManageOperatingSettings: false,
    canRunSystemMaintenance: false,
    canManageUnorConfig: false,
    canManageRolePermissions: false,
    canViewSystemHealth: false,
  },
  "supervisor-monitoring": {
    canCallQueue: false,
    canConfirmAppointment: false,
    canMarkNoShow: false,
    canStartService: false,
    canPrioritizeQueue: false,
    canCancelAppointment: false,
    canAddStaffNote: false,
    canCheckIn: false,
    canViewDashboard: true,
    canViewOwnUnor: true,
    canViewAllServices: false,
    canViewStatistics: true,
    canExportData: true,
    canViewAudit: false,
    canManageServices: false,
    canManageStaff: false,
    canManageAnnouncements: false,
    canManageOperatingSettings: false,
    canRunSystemMaintenance: false,
    canManageUnorConfig: false,
    canManageRolePermissions: false,
    canViewSystemHealth: false,
  },
  "humas-monitoring": {
    canCallQueue: false,
    canConfirmAppointment: false,
    canMarkNoShow: false,
    canStartService: false,
    canPrioritizeQueue: false,
    canCancelAppointment: false,
    canAddStaffNote: false,
    canCheckIn: false,
    canViewDashboard: true,
    canViewOwnUnor: true,
    canViewAllServices: true,
    canViewStatistics: true,
    canExportData: true,
    canViewAudit: true,
    canManageServices: false,
    canManageStaff: false,
    canManageAnnouncements: false,
    canManageOperatingSettings: false,
    canRunSystemMaintenance: false,
    canManageUnorConfig: false,
    canManageRolePermissions: false,
    canViewSystemHealth: false,
  },
  "humas-admin": {
    canCallQueue: true,
    canConfirmAppointment: true,
    canMarkNoShow: true,
    canStartService: true,
    canPrioritizeQueue: true,
    canCancelAppointment: true,
    canAddStaffNote: true,
    canCheckIn: true,
    canViewDashboard: true,
    canViewOwnUnor: true,
    canViewAllServices: true,
    canViewStatistics: true,
    canExportData: true,
    canViewAudit: true,
    canManageServices: true,
    canManageStaff: true,
    canManageAnnouncements: true,
    canManageOperatingSettings: true,
    canRunSystemMaintenance: true,
    canManageUnorConfig: true,
    canManageRolePermissions: true,
    canViewSystemHealth: true,
  },
};

function clonePermissionSet(source: StaffPermissionSet): StaffPermissionSet {
  return { ...source };
}

export const STAFF_CANONICAL_ROUTES = {
  resepsionis: {
    dashboard: "/resepsionis/dashboard",
    history: "/resepsionis/riwayat",
    profile: "/resepsionis/profil",
    settings: "/resepsionis/pengaturan",
    lobby: "/lobby",
    offlineVisitor: "/offline-visitor",
  },
  "unit-organisasi": {
    dashboard: "/unit/dashboard",
    queue: "/unit/data-antrean",
    analytics: "/unit/analitik-unit",
    profile: "/unit/profil",
    settings: "/unit/pengaturan",
  },
  "petugas-level-2": {
    dashboard: "/petugas-level-2/dashboard",
    queue: "/petugas-level-2/inbox-eskalasi",
    profile: "/petugas-level-2/profil",
    settings: "/petugas-level-2/pengaturan",
  },
  "supervisor-monitoring": {
    dashboard: "/supervisor/dashboard",
    monitoring: "/supervisor/monitoring",
    export: "/supervisor/data-ekspor",
    profile: "/supervisor/profil",
    settings: "/supervisor/pengaturan",
  },
  "humas-monitoring": {
    dashboard: "/humas-monitoring/dashboard",
    monitoring: "/humas-monitoring/monitoring",
    export: "/humas-monitoring/data-ekspor",
    profile: "/humas-monitoring/profil",
    settings: "/humas-monitoring/pengaturan",
  },
  "humas-admin": {
    dashboard: "/admin/panel",
    services: "/admin/panel/layanan",
    staffAccess: "/admin/panel/login-penugasan",
    publicUsers: "/admin/panel/pengguna-umum",
    units: "/admin/panel/unit-organisasi",
    announcements: "/admin/panel/pengumuman",
    operations: "/admin/panel/operasional",
    helpFaq: "/admin/panel/faq-bantuan",
    roleAccess: "/admin/panel/hak-akses-role",
    export: "/admin/panel/ekspor-data",
    masterData: "/admin/panel/data-referensi",
    activity: "/admin/panel/aktivitas",
    profile: "/admin/panel/profile",
    settings: "/admin/panel/pengaturan",
  },
} as const;

const STAFF_ALLOWED_ROUTE_PREFIXES: Record<InternalStaffRole, readonly string[]> = {
  resepsionis: ["/resepsionis", "/lobby", "/offline-visitor"],
  "unit-organisasi": ["/unit", "/unor"],
  "petugas-level-2": ["/petugas-level-2"],
  "supervisor-monitoring": ["/supervisor"],
  "humas-monitoring": ["/humas-monitoring"],
  "humas-admin": ["/admin", "/humas-admin"],
};

const SHARED_STAFF_ROUTE_PREFIXES = ["/lobby", "/offline-visitor", "/unit", "/admin"] as const;

const LEGACY_ROUTE_ALIASES: ReadonlyArray<{
  pattern: RegExp;
  resolve: (...matches: string[]) => string;
}> = [
  {
    pattern: /^\/resepsionis\/dashboard\/([^/]+)$/,
    resolve: (_fullMatch, feature) => `/resepsionis/${feature}`,
  },
  {
    pattern: /^\/resepsionis\/offline-visitor$/,
    resolve: () => STAFF_CANONICAL_ROUTES.resepsionis.offlineVisitor,
  },
  {
    pattern: /^\/unor\/dashboard$/,
    resolve: () => STAFF_CANONICAL_ROUTES["unit-organisasi"].dashboard,
  },
  {
    pattern: /^\/unor\/dashboard\/laporan-ekspor$/,
    resolve: () => STAFF_CANONICAL_ROUTES["unit-organisasi"].analytics,
  },
  {
    pattern: /^\/unor\/dashboard\/([^/]+)$/,
    resolve: (_fullMatch, feature) => `/unit/${feature}`,
  },
  {
    pattern: /^\/unit\/dashboard\/([^/]+)$/,
    resolve: (_fullMatch, feature) => `/unit/${feature}`,
  },
  {
    pattern: /^\/supervisor\/dashboard\/([^/]+)$/,
    resolve: (_fullMatch, feature) => `/supervisor/${feature}`,
  },
  {
    pattern: /^\/humas-monitoring\/dashboard\/([^/]+)$/,
    resolve: (_fullMatch, feature) => `/humas-monitoring/${feature}`,
  },
  {
    pattern: /^\/humas-admin$/,
    resolve: () => STAFF_CANONICAL_ROUTES["humas-admin"].dashboard,
  },
  {
    pattern: /^\/humas-admin\/dashboard$/,
    resolve: () => STAFF_CANONICAL_ROUTES["humas-admin"].dashboard,
  },
  {
    pattern: /^\/humas-admin\/(profile|profil)$/,
    resolve: () => STAFF_CANONICAL_ROUTES["humas-admin"].profile,
  },
  {
    pattern: /^\/humas-admin\/([^/]+)$/,
    resolve: (_fullMatch, feature) => `/admin/panel/${feature}`,
  },
  {
    pattern: /^\/admin\/panel\/profil$/,
    resolve: () => STAFF_CANONICAL_ROUTES["humas-admin"].profile,
  },
];

export function getInternalRoleLabel(role: InternalStaffRole) {
  return INTERNAL_ROLE_LABELS[role];
}

export function getStaffHomeRoute(role: InternalStaffRole) {
  return STAFF_CANONICAL_ROUTES[role].dashboard;
}

export function getAllowedStaffPrefixes(role: InternalStaffRole) {
  return [
    ...STAFF_ALLOWED_ROUTE_PREFIXES[role],
    ...SHARED_STAFF_ROUTE_PREFIXES,
  ];
}

export function getInternalRoleBasePath(role: InternalStaffRole) {
  const dashboardPath = getStaffHomeRoute(role);
  return role === "humas-admin"
    ? dashboardPath
    : dashboardPath.replace(/\/dashboard$/, "");
}

export function canStaffRolePerform(role: InternalStaffRole, permission: StaffPermissionKey) {
  return STAFF_PERMISSION_BASELINE[role][permission];
}

export function getBaselineStaffPermissions(role: InternalStaffRole): StaffPermissionSet {
  return clonePermissionSet(STAFF_PERMISSION_BASELINE[role]);
}

export function mapInternalRoleToPermissionStorageKey(
  role: InternalStaffRole,
): PermissionStorageRoleKey {
  switch (role) {
    case "resepsionis":
      return "resepsionis";
    case "unit-organisasi":
      return "akun_unit";
    case "petugas-level-2":
      return "petugas_level2";
    case "supervisor-monitoring":
      return "supervisor_unit";
    case "humas-monitoring":
      return "humas_monitoring";
    case "humas-admin":
      return "humas_admin";
  }
}

export function mapLegacyStaffRoleToInternalRole(
  rawRole: string | null | undefined,
  options?: {
    unitId?: string | null | undefined;
    fallbackRole?: InternalStaffRole;
  },
): InternalStaffRole | undefined {
  const normalizedRole = String(rawRole || "").trim().toLowerCase() as
    | LegacyStaffRoleValue
    | InternalStaffRole
    | "";
  const unitId = String(options?.unitId || "").trim();

  switch (normalizedRole) {
    case "unit-organisasi":
      return "unit-organisasi";
    case "petugas-level-2":
      return "petugas-level-2";
    case "supervisor-monitoring":
      return "supervisor-monitoring";
    case "humas-monitoring":
      return "humas-monitoring";
    case "humas-admin":
      return "humas-admin";
    case "resepsionis":
      return "resepsionis";
    case "akun_unit":
    case "unor":
      return "unit-organisasi";
    case "petugas_level2":
      return "petugas-level-2";
    case "supervisor_unit":
      return "supervisor-monitoring";
    case "humas_monitoring":
      return "humas-monitoring";
    case "humas_admin":
    case "superadmin":
      return "humas-admin";
    case "supervisor":
      return unitId ? "supervisor-monitoring" : "humas-monitoring";
    default:
      return options?.fallbackRole;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeInternalRolePermissionMatrix(
  input: unknown,
): InternalRolePermissionMatrix {
  const normalized = {
    resepsionis: getBaselineStaffPermissions("resepsionis"),
    "unit-organisasi": getBaselineStaffPermissions("unit-organisasi"),
    "petugas-level-2": getBaselineStaffPermissions("petugas-level-2"),
    "supervisor-monitoring": getBaselineStaffPermissions("supervisor-monitoring"),
    "humas-monitoring": getBaselineStaffPermissions("humas-monitoring"),
    "humas-admin": getBaselineStaffPermissions("humas-admin"),
  } satisfies InternalRolePermissionMatrix;

  if (!isRecord(input)) {
    return normalized;
  }

  for (const [rawRole, rawPermissions] of Object.entries(input)) {
    const internalRole = mapLegacyStaffRoleToInternalRole(rawRole);
    if (!internalRole || !isRecord(rawPermissions)) {
      continue;
    }

    const merged = clonePermissionSet(normalized[internalRole]);
    for (const permissionKey of Object.keys(merged) as StaffPermissionKey[]) {
      const incomingValue = rawPermissions[permissionKey];
      if (typeof incomingValue === "boolean") {
        merged[permissionKey] = incomingValue;
      }
    }

    normalized[internalRole] = merged;
  }

  return normalized;
}

export function resolveStaffPermissionsForRole(
  role: InternalStaffRole,
  input: unknown,
): StaffPermissionSet {
  return normalizeInternalRolePermissionMatrix(input)[role];
}

export function serializeInternalRolePermissionMatrix(
  input: InternalRolePermissionMatrix,
): Record<PermissionStorageRoleKey, StaffPermissionSet> {
  return {
    resepsionis: clonePermissionSet(input.resepsionis),
    akun_unit: clonePermissionSet(input["unit-organisasi"]),
    petugas_level2: clonePermissionSet(input["petugas-level-2"]),
    supervisor_unit: clonePermissionSet(input["supervisor-monitoring"]),
    humas_monitoring: clonePermissionSet(input["humas-monitoring"]),
    humas_admin: clonePermissionSet(input["humas-admin"]),
  };
}

export function resolveCanonicalStaffPath(pathname: string) {
  for (const alias of LEGACY_ROUTE_ALIASES) {
    const matches = pathname.match(alias.pattern);
    if (!matches) {
      continue;
    }

    const target = alias.resolve(...matches);
    if (target !== pathname) {
      return target;
    }
  }

  return null;
}
