import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  Download,
  Home,
  LayoutDashboard,
  LifeBuoy,
  MonitorCog,
  NotebookText,
  QrCode,
  ScrollText,
  Settings,
  ShieldCheck,
  Ticket,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  type InternalStaffRole,
  STAFF_CANONICAL_ROUTES,
  type StaffPermissionKey,
  type StaffPermissionSet,
} from "@/lib/internal-role-policy";
import {
  getStaffRoutePermissionRequirement,
  hasRequiredStaffPermissions,
} from "@/lib/internal-role-access";

export type AppRole = "user" | InternalStaffRole;

export type RoleNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export type RoleTheme = {
  label: string;
  eyebrow: string;
  description: string;
  accent: string;
  accentSoft: string;
  accentStrong: string;
  sidebarTone: string;
  badgeTone: string;
  statTone: string;
  navigation: RoleNavItem[];
  mobileNavigation: RoleNavItem[];
  managementNavigation?: RoleNavItem[];
  utilityNavigation: RoleNavItem[];
};

export type RoleNavigationExtensions = {
  navigation: RoleNavItem[];
  managementNavigation: RoleNavItem[];
};

const sharedPalette = {
  accent: "#af101a",
  accentSoft: "#ffebe8",
  accentStrong: "#930010",
  badgeTone: "#ffdad6",
};

const userPalette = {
  ...sharedPalette,
  sidebarTone: "#f3f4f5",
  statTone: "#d32f2f",
};

const internalPalette = {
  ...sharedPalette,
  sidebarTone: "#fff1ef",
  statTone: "#af101a",
};

function buildUtilityNavigation(basePath: string): RoleNavItem[] {
  return [
    { href: `${basePath}/profil`, icon: UserRound, label: "Profil" },
    { href: `${basePath}/pengaturan`, icon: Settings, label: "Pengaturan" },
  ];
}

function buildMobileNavigation(...items: RoleNavItem[]) {
  return items.slice(0, 4);
}

function dedupeRoleNavItems(items: RoleNavItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.href)) {
      return false;
    }

    seen.add(item.href);
    return true;
  });
}

const SHARED_UNIT_PERMISSION_KEYS: StaffPermissionKey[] = [
  "canCallQueue",
  "canConfirmAppointment",
  "canMarkNoShow",
  "canStartService",
  "canPrioritizeQueue",
  "canCancelAppointment",
  "canAddStaffNote",
];

function hasAnySharedUnitPermission(permissions?: Partial<StaffPermissionSet> | null) {
  return SHARED_UNIT_PERMISSION_KEYS.some((permission) => permissions?.[permission] === true);
}

function buildSharedAdminItems(role: InternalStaffRole, permissions?: Partial<StaffPermissionSet> | null) {
  if (!permissions || role === "humas-admin") {
    return [] as RoleNavItem[];
  }

  const items: RoleNavItem[] = [];

  if (permissions.canManageServices) {
    items.push(
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].services, icon: BriefcaseBusiness, label: "Katalog Layanan" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].masterData, icon: ScrollText, label: "Data Referensi" },
    );
  }

  if (permissions.canManageStaff) {
    items.push(
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].staffAccess, icon: Users, label: "Akun & Penugasan" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].publicUsers, icon: UserRound, label: "Pengguna Umum" },
    );
  }

  if (permissions.canManageUnorConfig) {
    items.push({ href: STAFF_CANONICAL_ROUTES["humas-admin"].units, icon: Building2, label: "Unit Organisasi" });
  }

  if (permissions.canManageAnnouncements) {
    items.push(
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].announcements, icon: Bell, label: "Pengumuman" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].helpFaq, icon: LifeBuoy, label: "FAQ & Bantuan" },
    );
  }

  if (permissions.canManageOperatingSettings || permissions.canRunSystemMaintenance) {
    items.push({ href: STAFF_CANONICAL_ROUTES["humas-admin"].operations, icon: CalendarDays, label: "Operasional" });
  }

  if (permissions.canManageRolePermissions) {
    items.push({ href: STAFF_CANONICAL_ROUTES["humas-admin"].roleAccess, icon: ShieldCheck, label: "Akses & Peran" });
  }

  if (
    permissions.canExportData &&
    role !== "supervisor-monitoring" &&
    role !== "humas-monitoring"
  ) {
    items.push({ href: STAFF_CANONICAL_ROUTES["humas-admin"].export, icon: Download, label: "Ekspor Data" });
  }

  if (permissions.canViewAudit) {
    items.push({ href: STAFF_CANONICAL_ROUTES["humas-admin"].activity, icon: NotebookText, label: "Log Aktivitas" });
  }

  if (permissions.canViewSystemHealth) {
    items.push({ href: STAFF_CANONICAL_ROUTES["humas-admin"].settings, icon: Settings, label: "Kesehatan Sistem" });
  }

  return dedupeRoleNavItems(items);
}

export function getRoleNavigationExtensions(
  role: AppRole,
  permissions?: Partial<StaffPermissionSet> | null,
): RoleNavigationExtensions {
  if (role === "user" || !permissions) {
    return {
      navigation: [],
      managementNavigation: [],
    };
  }

  const navigation: RoleNavItem[] = [];

  if (role !== "resepsionis" && role !== "petugas-level-2" && permissions.canCheckIn) {
    navigation.push({ href: STAFF_CANONICAL_ROUTES.resepsionis.lobby, icon: QrCode, label: "Check-in Lobby" });
  }

  if (role !== "unit-organisasi" && role !== "petugas-level-2" && permissions.canViewOwnUnor) {
    if (permissions.canViewDashboard || hasAnySharedUnitPermission(permissions)) {
      navigation.push({ href: STAFF_CANONICAL_ROUTES["unit-organisasi"].dashboard, icon: LayoutDashboard, label: "Dashboard Unit" });
    }

    navigation.push({ href: STAFF_CANONICAL_ROUTES["unit-organisasi"].queue, icon: ClipboardList, label: "Data Antrean" });

    if (permissions.canViewStatistics) {
      navigation.push({ href: STAFF_CANONICAL_ROUTES["unit-organisasi"].analytics, icon: ChartColumn, label: "Analitik Unit" });
    }
  }

  return {
    navigation: dedupeRoleNavItems(navigation),
    managementNavigation: buildSharedAdminItems(role, permissions),
  };
}

export function mergeRoleNavItems(...groups: RoleNavItem[][]) {
  return dedupeRoleNavItems(groups.flat());
}

export const roleThemes: Record<AppRole, RoleTheme> = {
  user: {
    label: "Pengguna Umum",
    eyebrow: "Portal Layanan",
    description: "Layanan publik digital LKPP",
    ...userPalette,
    navigation: [
      { href: "/dashboard", icon: Home, label: "Dashboard" },
      { href: "/layanan", icon: Ticket, label: "Ambil Antrian" },
      { href: "/jadwal-saya", icon: ClipboardList, label: "Antrian" },
      { href: "/bantuan", icon: LifeBuoy, label: "Bantuan" },
    ],
    mobileNavigation: buildMobileNavigation(
      { href: "/dashboard", icon: Home, label: "Dashboard" },
      { href: "/layanan", icon: Ticket, label: "Layanan" },
      { href: "/jadwal-saya", icon: ClipboardList, label: "Antrian" },
      { href: "/profil", icon: UserRound, label: "Profil" },
    ),
    utilityNavigation: [
      { href: "/profil", icon: UserRound, label: "Profil" },
      { href: "/pengaturan", icon: Settings, label: "Pengaturan" },
    ],
  },
  resepsionis: {
    label: "Resepsionis",
    eyebrow: "Area Frontdesk",
    description: "Check-in tamu hari ini",
    ...internalPalette,
    navigation: [
      { href: STAFF_CANONICAL_ROUTES.resepsionis.dashboard, icon: LayoutDashboard, label: "Dashboard" },
      { href: STAFF_CANONICAL_ROUTES.resepsionis.lobby, icon: QrCode, label: "Check-in Lobby" },
      { href: STAFF_CANONICAL_ROUTES.resepsionis.history, icon: NotebookText, label: "Riwayat" },
    ],
    mobileNavigation: buildMobileNavigation(
      { href: STAFF_CANONICAL_ROUTES.resepsionis.dashboard, icon: LayoutDashboard, label: "Dashboard" },
      { href: STAFF_CANONICAL_ROUTES.resepsionis.lobby, icon: QrCode, label: "Check-in" },
      { href: STAFF_CANONICAL_ROUTES.resepsionis.history, icon: NotebookText, label: "Riwayat" },
      { href: "/resepsionis/profil", icon: UserRound, label: "Profil" },
    ),
    utilityNavigation: buildUtilityNavigation("/resepsionis"),
  },
  "unit-organisasi": {
    label: "Unit Organisasi",
    eyebrow: "Area Unit",
    description: "Kelola antrean unit yang sudah check-in",
    ...internalPalette,
    navigation: [
      { href: STAFF_CANONICAL_ROUTES["unit-organisasi"].dashboard, icon: LayoutDashboard, label: "Dashboard" },
      { href: STAFF_CANONICAL_ROUTES.resepsionis.lobby, icon: QrCode, label: "Check-in Lobby" },
      { href: STAFF_CANONICAL_ROUTES["unit-organisasi"].queue, icon: ClipboardList, label: "Data Antrean" },
      { href: STAFF_CANONICAL_ROUTES["unit-organisasi"].analytics, icon: ChartColumn, label: "Analitik Unit" },
    ],
    mobileNavigation: buildMobileNavigation(
      { href: STAFF_CANONICAL_ROUTES["unit-organisasi"].dashboard, icon: LayoutDashboard, label: "Dashboard" },
      { href: STAFF_CANONICAL_ROUTES.resepsionis.lobby, icon: QrCode, label: "Check-in" },
      { href: STAFF_CANONICAL_ROUTES["unit-organisasi"].queue, icon: ClipboardList, label: "Antrean" },
      { href: "/unit/profil", icon: UserRound, label: "Profil" },
    ),
    utilityNavigation: buildUtilityNavigation("/unit"),
  },
  "petugas-level-2": {
    label: "Petugas Level 2",
    eyebrow: "Layanan Eskalasi",
    description: "Tutup antrean hasil eskalasi level 2",
    ...internalPalette,
    navigation: [
      { href: STAFF_CANONICAL_ROUTES["petugas-level-2"].dashboard, icon: LayoutDashboard, label: "Dashboard" },
      { href: STAFF_CANONICAL_ROUTES["petugas-level-2"].queue, icon: ClipboardList, label: "Inbox Eskalasi" },
    ],
    mobileNavigation: buildMobileNavigation(
      { href: STAFF_CANONICAL_ROUTES["petugas-level-2"].dashboard, icon: LayoutDashboard, label: "Dashboard" },
      { href: STAFF_CANONICAL_ROUTES["petugas-level-2"].queue, icon: ClipboardList, label: "Eskalasi" },
      { href: "/petugas-level-2/profil", icon: UserRound, label: "Profil" },
      { href: "/petugas-level-2/pengaturan", icon: Settings, label: "Atur" },
    ),
    utilityNavigation: buildUtilityNavigation("/petugas-level-2"),
  },
  "supervisor-monitoring": {
    label: "Supervisor Monitoring",
    eyebrow: "Area Monitoring",
    description: "Ringkasan kinerja lintas unit",
    ...internalPalette,
    navigation: [
      { href: STAFF_CANONICAL_ROUTES["supervisor-monitoring"].dashboard, icon: LayoutDashboard, label: "Dashboard" },
      { href: STAFF_CANONICAL_ROUTES.resepsionis.lobby, icon: QrCode, label: "Check-in Lobby" },
      { href: STAFF_CANONICAL_ROUTES["supervisor-monitoring"].monitoring, icon: MonitorCog, label: "Monitoring" },
      { href: STAFF_CANONICAL_ROUTES["supervisor-monitoring"].export, icon: Download, label: "Ekspor Data" },
    ],
    mobileNavigation: buildMobileNavigation(
      { href: STAFF_CANONICAL_ROUTES["supervisor-monitoring"].dashboard, icon: LayoutDashboard, label: "Dashboard" },
      { href: STAFF_CANONICAL_ROUTES.resepsionis.lobby, icon: QrCode, label: "Check-in" },
      { href: STAFF_CANONICAL_ROUTES["supervisor-monitoring"].monitoring, icon: MonitorCog, label: "Monitor" },
      { href: "/supervisor/profil", icon: UserRound, label: "Profil" },
    ),
    utilityNavigation: buildUtilityNavigation("/supervisor"),
  },
  "humas-monitoring": {
    label: "Humas Monitoring",
    eyebrow: "Humas Monitoring",
    description: "Pantau layanan dan komunikasi publik",
    ...internalPalette,
    navigation: [
      { href: STAFF_CANONICAL_ROUTES["humas-monitoring"].dashboard, icon: LayoutDashboard, label: "Dashboard" },
      { href: STAFF_CANONICAL_ROUTES.resepsionis.lobby, icon: QrCode, label: "Check-in Lobby" },
      { href: STAFF_CANONICAL_ROUTES["humas-monitoring"].monitoring, icon: MonitorCog, label: "Monitoring" },
      { href: STAFF_CANONICAL_ROUTES["humas-monitoring"].export, icon: Download, label: "Ekspor Data" },
    ],
    mobileNavigation: buildMobileNavigation(
      { href: STAFF_CANONICAL_ROUTES["humas-monitoring"].dashboard, icon: LayoutDashboard, label: "Dashboard" },
      { href: STAFF_CANONICAL_ROUTES.resepsionis.lobby, icon: QrCode, label: "Check-in" },
      { href: STAFF_CANONICAL_ROUTES["humas-monitoring"].monitoring, icon: MonitorCog, label: "Monitor" },
      { href: "/humas-monitoring/profil", icon: UserRound, label: "Profil" },
    ),
    utilityNavigation: buildUtilityNavigation("/humas-monitoring"),
  },
  "humas-admin": {
    label: "Humas Admin",
    eyebrow: "Area Admin",
    description: "Kelola operasi layanan dan admin",
    ...internalPalette,
    navigation: [
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].dashboard, icon: LayoutDashboard, label: "Dashboard" },
    ],
    mobileNavigation: buildMobileNavigation(
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].dashboard, icon: LayoutDashboard, label: "Dashboard" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].services, icon: BriefcaseBusiness, label: "Layanan" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].staffAccess, icon: Users, label: "Akun" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].profile, icon: UserRound, label: "Profil" },
    ),
    managementNavigation: [
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].services, icon: BriefcaseBusiness, label: "Katalog Layanan" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].staffAccess, icon: Users, label: "Akun & Penugasan" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].publicUsers, icon: UserRound, label: "Pengguna Umum" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].units, icon: Building2, label: "Unit Organisasi" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].announcements, icon: Bell, label: "Pengumuman" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].operations, icon: CalendarDays, label: "Operasional" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].helpFaq, icon: LifeBuoy, label: "FAQ & Bantuan" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].roleAccess, icon: ShieldCheck, label: "Akses & Peran" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].export, icon: Download, label: "Ekspor Data" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].activity, icon: NotebookText, label: "Log Aktivitas" },
    ],
    utilityNavigation: [
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].profile, icon: UserRound, label: "Profil" },
      { href: STAFF_CANONICAL_ROUTES["humas-admin"].settings, icon: Settings, label: "Status Sistem" },
    ],
  },
};

export function getRoleTheme(role: AppRole) {
  return roleThemes[role];
}

export function filterRoleNavigationByPermissions(
  role: AppRole,
  items: RoleNavItem[],
  permissions?: Partial<StaffPermissionSet> | null,
) {
  if (role === "user" || !permissions) {
    return items;
  }

  return items.filter((item) => {
    if (item.href === STAFF_CANONICAL_ROUTES.resepsionis.dashboard) {
      return permissions.canViewDashboard === true;
    }

    if (
      item.href === STAFF_CANONICAL_ROUTES.resepsionis.lobby ||
      item.href === STAFF_CANONICAL_ROUTES.resepsionis.offlineVisitor
    ) {
      return permissions.canCheckIn === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["unit-organisasi"].dashboard) {
      return permissions.canViewDashboard === true && permissions.canViewOwnUnor === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["unit-organisasi"].queue) {
      return permissions.canViewOwnUnor === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["unit-organisasi"].analytics) {
      return permissions.canViewOwnUnor === true && permissions.canViewStatistics === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["petugas-level-2"].dashboard) {
      return permissions.canViewDashboard === true && permissions.canViewOwnUnor === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["petugas-level-2"].queue) {
      return permissions.canViewOwnUnor === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["supervisor-monitoring"].dashboard) {
      return permissions.canViewDashboard === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["supervisor-monitoring"].monitoring) {
      return permissions.canViewStatistics === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["supervisor-monitoring"].export) {
      return permissions.canExportData === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["humas-monitoring"].dashboard) {
      return permissions.canViewDashboard === true && permissions.canViewAllServices === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["humas-monitoring"].monitoring) {
      return permissions.canViewStatistics === true && permissions.canViewAllServices === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["humas-monitoring"].export) {
      return permissions.canExportData === true && permissions.canViewAllServices === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["humas-admin"].dashboard) {
      return permissions.canViewDashboard === true;
    }

    if (
      item.href === STAFF_CANONICAL_ROUTES["humas-admin"].services ||
      item.href === STAFF_CANONICAL_ROUTES["humas-admin"].masterData
    ) {
      return permissions.canManageServices === true;
    }

    if (
      item.href === STAFF_CANONICAL_ROUTES["humas-admin"].staffAccess ||
      item.href === STAFF_CANONICAL_ROUTES["humas-admin"].publicUsers ||
      item.href === STAFF_CANONICAL_ROUTES["humas-admin"].profile
    ) {
      return permissions.canManageStaff === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["humas-admin"].units) {
      return permissions.canManageUnorConfig === true;
    }

    if (
      item.href === STAFF_CANONICAL_ROUTES["humas-admin"].announcements ||
      item.href === STAFF_CANONICAL_ROUTES["humas-admin"].helpFaq
    ) {
      return permissions.canManageAnnouncements === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["humas-admin"].operations) {
      return (
        permissions.canManageOperatingSettings === true ||
        permissions.canRunSystemMaintenance === true
      );
    }

    if (item.href === STAFF_CANONICAL_ROUTES["humas-admin"].roleAccess) {
      return permissions.canManageRolePermissions === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["humas-admin"].export) {
      return permissions.canExportData === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["humas-admin"].activity) {
      return permissions.canViewAudit === true;
    }

    if (item.href === STAFF_CANONICAL_ROUTES["humas-admin"].settings) {
      return permissions.canViewSystemHealth === true;
    }

    const requirement = getStaffRoutePermissionRequirement(role, item.href);
    return hasRequiredStaffPermissions(permissions, requirement);
  });
}
