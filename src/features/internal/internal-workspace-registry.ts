import {
  filterRoleNavigationByPermissions,
  roleThemes,
  type AppRole,
  type RoleNavItem,
} from "@/design-system/roles";
import type { StaffPermissionSet } from "@/lib/internal-role-policy";

type InternalRole = Exclude<AppRole, "user">;

type AdminPanelGroupDefinition = {
  title: string;
  hrefs: string[];
};

const adminPanelGroupDefinitions: AdminPanelGroupDefinition[] = [
  {
    title: "Pengelolaan utama",
    hrefs: [
      "/admin/panel/layanan",
      "/admin/panel/login-penugasan",
      "/admin/panel/pengguna-umum",
      "/admin/panel/unit-organisasi",
      "/admin/panel/pengumuman",
    ],
  },
  {
    title: "Kontrol sistem",
    hrefs: [
      "/admin/panel/operasional",
      "/admin/panel/faq-bantuan",
      "/admin/panel/hak-akses-role",
      "/admin/panel/ekspor-data",
    ],
  },
  {
    title: "Data dan aktivitas",
    hrefs: [
      "/admin/panel/data-referensi",
      "/admin/panel/aktivitas",
      "/admin/panel/profile",
      "/admin/panel/pengaturan",
    ],
  },
];

function buildAdminNavigationIndex() {
  const adminTheme = roleThemes["humas-admin"];
  const items = [
    ...(adminTheme.managementNavigation ?? []),
    ...adminTheme.utilityNavigation,
  ];

  return new Map(items.map((item) => [item.href, item]));
}

export function getAdminPanelGroups(
  role: InternalRole = "humas-admin",
  permissions?: Partial<StaffPermissionSet> | null,
): Array<{
  title: string;
  items: RoleNavItem[];
}> {
  const navigationIndex = buildAdminNavigationIndex();

  return adminPanelGroupDefinitions.map((group) => ({
    title: group.title,
    items: filterRoleNavigationByPermissions(
      role,
      group.hrefs
        .map((href) => navigationIndex.get(href))
        .filter((item): item is RoleNavItem => Boolean(item)),
      permissions,
    ),
  }));
}

export function getAdminPanelHighlights(
  role: InternalRole = "humas-admin",
  permissions?: Partial<StaffPermissionSet> | null,
) {
  const navigationIndex = buildAdminNavigationIndex();
  return filterRoleNavigationByPermissions(
    role,
    [
      "/admin/panel/layanan",
      "/admin/panel/login-penugasan",
      "/admin/panel/aktivitas",
    ]
      .map((href) => navigationIndex.get(href))
      .filter((item): item is RoleNavItem => Boolean(item)),
    permissions,
  );
}

export function getInternalUnavailableCopy(role: InternalRole) {
  if (role === "resepsionis") {
    return {
      eyebrow: "Halaman Frontdesk",
      title: "Halaman frontdesk belum siap",
      description:
        "Konfigurasi halaman ini belum lengkap. Gunakan dashboard atau check-in lobby sambil kita rapikan modul ini.",
    };
  }

  if (role === "unit-organisasi") {
    return {
      eyebrow: "Halaman Unit",
      title: "Halaman unit belum siap",
      description:
        "Konfigurasi halaman ini belum lengkap. Gunakan dashboard unit sambil kita sinkronkan alur operasionalnya.",
    };
  }

  if (role === "petugas-level-2") {
    return {
      eyebrow: "Halaman Level 2",
      title: "Halaman petugas level 2 belum siap",
      description:
        "Konfigurasi workspace level 2 belum lengkap. Gunakan dashboard atau inbox eskalasi sambil kita rapikan alur lanjutan layanannya.",
    };
  }

  if (role === "supervisor-monitoring" || role === "humas-monitoring") {
    return {
      eyebrow: "Halaman Monitoring",
      title: "Halaman monitoring belum siap",
      description:
        "Konfigurasi halaman ini belum lengkap. Gunakan dashboard monitoring sambil kita ratakan modul analitiknya.",
    };
  }

  return {
    eyebrow: "Panel Admin",
    title: "Halaman admin belum siap",
    description:
      "Konfigurasi panel ini belum lengkap. Gunakan dashboard admin sambil kita sinkronkan section dan hak aksesnya.",
  };
}
