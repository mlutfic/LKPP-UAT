import type { LucideIcon } from "lucide-react";

import { getRoleTheme } from "@/design-system/roles";
import { getInternalPageConfig, getInternalPagePath, type InternalRole } from "@/features/internal/internal-workspace-config";

export type StaffAccessFeature = {
  href: string;
  label: string;
};

export type StaffAccessGroup = {
  role: InternalRole;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  loginHref: string;
  icon: LucideIcon;
  features: StaffAccessFeature[];
};

export const staffAccessIntro = {
  eyebrow: "Akses Petugas",
  title: "Satu login untuk semua akun petugas dan admin.",
  description:
    "Setelah berhasil masuk, sistem akan mengarahkan akun Anda ke area kerja yang sesuai dengan peran, unit, dan hak akses yang aktif.",
} as const;

const internalRoleOrder: InternalRole[] = [
  "resepsionis",
  "unit-organisasi",
  "supervisor-monitoring",
  "humas-monitoring",
  "humas-admin",
];

export const staffAccessGroups: StaffAccessGroup[] = internalRoleOrder.map((role) => {
  const theme = getRoleTheme(role);
  const featureItems = [
    ...theme.navigation.slice(1),
    ...(theme.managementNavigation ?? []),
    ...theme.utilityNavigation,
  ];

  return {
    role,
    eyebrow: theme.eyebrow,
    title: theme.label,
    description:
      getInternalPageConfig(role, "dashboard")?.description ?? theme.description,
    href: getInternalPagePath(role, "dashboard"),
    loginHref: `/login/petugas?role=${role}#form-login-petugas`,
    icon: theme.navigation[0]!.icon,
    features: featureItems.slice(0, 4).map((item) => ({
      href: item.href,
      label: item.label,
    })),
  };
});
