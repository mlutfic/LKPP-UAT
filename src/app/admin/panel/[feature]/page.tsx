import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import type { AdminPage } from "@/features/internal/admin-panel-content";
import { AdminPanelPage } from "@/features/internal/components/admin-panel-page";

type RouteParams = { feature: string };
type RouteProps = { params: Promise<RouteParams> };

const ADMIN_FEATURES = new Set<AdminPage>([
  "dashboard",
  "layanan",
  "login-penugasan",
  "pengguna-umum",
  "unit-organisasi",
  "pengumuman",
  "operasional",
  "faq-bantuan",
  "hak-akses-role",
  "ekspor-data",
  "data-referensi",
  "aktivitas",
  "profil",
  "pengaturan",
]);

const ADMIN_FEATURE_ALIASES: Record<string, string> = {
  dashboard: "/admin/panel",
  services: "/admin/panel/layanan",
  service: "/admin/panel/layanan",
  staff: "/admin/panel/login-penugasan",
  accounts: "/admin/panel/login-penugasan",
  users: "/admin/panel/login-penugasan",
  pengguna: "/admin/panel/pengguna-umum",
  "pengguna-umum": "/admin/panel/pengguna-umum",
  "public-users": "/admin/panel/pengguna-umum",
  "public-user": "/admin/panel/pengguna-umum",
  unor: "/admin/panel/unit-organisasi",
  units: "/admin/panel/unit-organisasi",
  announcements: "/admin/panel/pengumuman",
  announcement: "/admin/panel/pengumuman",
  helpfaq: "/admin/panel/faq-bantuan",
  help: "/admin/panel/faq-bantuan",
  faq: "/admin/panel/faq-bantuan",
  roles: "/admin/panel/hak-akses-role",
  role: "/admin/panel/hak-akses-role",
  permissions: "/admin/panel/hak-akses-role",
  export: "/admin/panel/ekspor-data",
  exports: "/admin/panel/ekspor-data",
  audit: "/admin/panel/aktivitas",
  activity: "/admin/panel/aktivitas",
  logs: "/admin/panel/aktivitas",
  masterdata: "/admin/panel/data-referensi",
  "master-data": "/admin/panel/data-referensi",
  settings: "/admin/panel/pengaturan",
};

export const metadata: Metadata = {
  title: "Panel Humas Admin",
};

export default async function AdminPanelFeatureRoute({ params }: RouteProps) {
  const { feature } = await params;
  const normalizedFeature = feature?.trim().toLowerCase();

  const aliasTarget = normalizedFeature ? ADMIN_FEATURE_ALIASES[normalizedFeature] : undefined;
  if (aliasTarget) {
    redirect(aliasTarget);
  }

  if (normalizedFeature === "profile" || normalizedFeature === "profil") {
    redirect("/admin/panel/profile");
  }

  if (!normalizedFeature || !ADMIN_FEATURES.has(normalizedFeature as AdminPage)) {
    notFound();
  }

  return <AdminPanelPage page={normalizedFeature as AdminPage} />;
}
