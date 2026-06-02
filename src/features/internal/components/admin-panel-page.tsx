"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";
import type { RoleNavItem } from "@/design-system/roles";
import { InternalPermissionFallback } from "@/features/internal/components/internal-permission-fallback";
import { InternalWorkspaceUnavailable } from "@/features/internal/components/internal-workspace-unavailable";
import { getAdminSectionChrome, type AdminPage } from "@/features/internal/admin-panel-content";
import { AdminActivityLogSection } from "@/features/internal/components/admin-activity-log-section";
import { AdminAnnouncementsSection } from "@/features/internal/components/admin-announcements-section";
import { AdminExportWorkspaceSection } from "@/features/internal/components/admin-export-workspace-section";
import { AdminFaqSection } from "@/features/internal/components/admin-faq-section";
import { AdminMasterDataSection } from "@/features/internal/components/admin-master-data-section";
import { AdminOperationalSettingsSection } from "@/features/internal/components/admin-operational-settings-section";
import { AdminProfileSection } from "@/features/internal/components/admin-profile-section";
import { AdminPublicUsersSection } from "@/features/internal/components/admin-public-users-section";
import { AdminRolePermissionsSection } from "@/features/internal/components/admin-role-permissions-section";
import { AdminServicesSection } from "@/features/internal/components/admin-services-section";
import { AdminStaffAccessSection } from "@/features/internal/components/admin-staff-access-section";
import { AdminSystemSettingsSection } from "@/features/internal/components/admin-system-settings-section";
import { AdminUnitOrganizationsSection } from "@/features/internal/components/admin-unit-organizations-section";
import {
  getInternalPageConfig,
  getInternalPagePath,
  type WorkspaceRow,
} from "@/features/internal/internal-workspace-config";
import {
  getAdminPanelGroups,
  getAdminPanelHighlights,
  getInternalUnavailableCopy,
} from "@/features/internal/internal-workspace-registry";
import { useActiveStaffRole } from "@/features/internal/use-active-staff-role";
import { useStaffRolePermissions } from "@/features/internal/use-staff-role-permissions";
import {
  describeStaffPermissionRequirement,
  getFirstAccessibleStaffPath,
  getMissingStaffPermissions,
  getStaffRoutePermissionRequirement,
} from "@/lib/internal-role-access";
import type { InternalStaffRole, StaffPermissionSet } from "@/lib/internal-role-policy";

const ADMIN_DASHBOARD_SUMMARIES: Partial<Record<AdminPage, string>> = {
  dashboard: "Ringkasan modul utama dan kondisi operasional.",
  layanan: "Kelola layanan, unit, dan level layanan.",
  "login-penugasan": "Kelola akun petugas, peran, dan unit kerja.",
  "pengguna-umum": "Pantau pengguna portal, kelengkapan profil, dan kesiapan login.",
  "unit-organisasi": "Kelola unit, kapasitas, dan kalender layanan.",
  pengumuman: "Kelola informasi yang tampil ke publik.",
  operasional: "Atur hari layanan, jam buka, dan hari libur.",
  "faq-bantuan": "Kelola FAQ dan panduan layanan publik.",
  "hak-akses-role": "Atur izin akses setiap peran petugas.",
  "ekspor-data": "Siapkan paket laporan dan unduhan data.",
  aktivitas: "Pantau perubahan data yang tercatat di panel admin.",
  profil: "Lihat identitas admin dan cakupan modul.",
  pengaturan: "Pantau backend, storage, dan koneksi realtime.",
};

function getAdminDashboardSummary(page: AdminPage | null, fallback?: string) {
  if (!page) {
    return fallback ?? "Buka modul terkait.";
  }

  return ADMIN_DASHBOARD_SUMMARIES[page] ?? fallback ?? "Buka modul terkait.";
}

function getAdminDashboardGroupTitle(title: string) {
  if (title === "Data dan aktivitas") {
    return "Akun & sistem";
  }

  return title;
}

function MinimalRows({
  rows,
  variant = "grid",
}: {
  rows: WorkspaceRow[];
  variant?: "grid" | "stack";
}) {
  return (
    <div
      className={
        variant === "stack"
          ? "grid gap-4 md:grid-cols-2 xl:grid-cols-1"
          : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      }
    >
      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-[var(--radius-2xl)] border border-border bg-surface-container-lowest p-5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {row.id}
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">{row.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{row.note}</p>
          <p className="mt-4 inline-flex rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-foreground">
            {row.status}
          </p>
        </div>
      ))}
    </div>
  );
}

function resolveAdminPageFromHref(href: string): AdminPage | null {
  if (href === "/admin/panel") {
    return "dashboard";
  }

  if (href === "/admin/panel/profile") {
    return "profil";
  }

  if (!href.startsWith("/admin/panel/")) {
    return null;
  }

  return href.replace("/admin/panel/", "") as AdminPage;
}

function AdminNavCard({ item, featured = false }: { item: RoleNavItem; featured?: boolean }) {
  const page = resolveAdminPageFromHref(item.href);
  const config = page ? getInternalPageConfig("humas-admin", page) : null;
  const Icon = item.icon;

  return (
    <Link href={item.href} className="block">
      <AppCard
        padding="lg"
        className={
          featured
            ? "h-full border-role-accent/20 bg-role-accent-soft/35 hover:border-role-accent/35"
            : "h-full hover:border-role-accent/20 hover:bg-surface-container-low"
        }
      >
        <div className="flex h-full flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                {featured ? "Prioritas" : "Modul"}
              </p>
              <AppCardTitle className="text-lg">{item.label}</AppCardTitle>
            </div>
            <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-surface-container-lowest text-role-accent shadow-(--shadow-soft)">
              <Icon className="size-5" />
            </div>
          </div>
          <AppCardDescription className="max-w-none line-clamp-2">
            {getAdminDashboardSummary(page, config?.description)}
          </AppCardDescription>
          <div className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-role-accent">
            Buka
            <ArrowRight className="size-4" />
          </div>
        </div>
      </AppCard>
    </Link>
  );
}

function AdminModuleListCard({
  title,
  items,
  eyebrow = "Kelompok modul",
}: {
  title: string;
  items: RoleNavItem[];
  eyebrow?: string;
}) {
  return (
    <AppCard padding="lg" className="space-y-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
          {eyebrow}
        </p>
        <AppCardTitle className="text-xl">{title}</AppCardTitle>
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const page = resolveAdminPageFromHref(item.href);
          const config = page ? getInternalPageConfig("humas-admin", page) : null;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start justify-between gap-3 rounded-[var(--radius-xl)] border border-border bg-surface-container-low px-4 py-3 transition-colors hover:border-role-accent/25 hover:bg-role-accent-soft/20"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-role-accent" />
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                </div>
                <p className="line-clamp-1 text-xs leading-5 text-muted-foreground">
                  {getAdminDashboardSummary(page, config?.description)}
                </p>
              </div>
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-role-accent" />
            </Link>
          );
        })}
      </div>
    </AppCard>
  );
}

function AdminDashboardLanding({
  rows,
  role,
  permissions,
}: {
  rows: WorkspaceRow[];
  role: InternalStaffRole;
  permissions?: Partial<StaffPermissionSet> | null;
}) {
  const highlights = getAdminPanelHighlights(role, permissions);
  const groups = getAdminPanelGroups(role, permissions);
  const [mainGroup, controlGroup, supportGroup] = groups;
  const featuredSet = new Set(highlights.map((item) => item.href));
  const mainItems = mainGroup?.items.filter((item) => !featuredSet.has(item.href)) ?? [];
  const controlItems = controlGroup?.items.filter((item) => !featuredSet.has(item.href)) ?? [];
  const supportItems = supportGroup?.items.filter((item) => !featuredSet.has(item.href)) ?? [];

  return (
    <div className="space-y-6">
      {highlights.length ? (
        <section className="space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              Prioritas admin
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Modul utama</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {highlights.map((item) => (
              <AdminNavCard key={item.href} item={item} featured />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          {mainGroup && mainItems.length ? (
            <AdminModuleListCard title={getAdminDashboardGroupTitle(mainGroup.title)} items={mainItems} />
          ) : null}
          {controlGroup && controlItems.length ? (
            <AdminModuleListCard
              title={getAdminDashboardGroupTitle(controlGroup.title)}
              items={controlItems}
            />
          ) : null}
        </div>

        <AppCard padding="lg" className="space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              Ringkasan sistem
            </p>
            <AppCardTitle className="text-xl">Pantauan cepat</AppCardTitle>
            <AppCardDescription className="max-w-none">
              Ringkasan status modul yang paling sering diperiksa.
            </AppCardDescription>
          </div>
          <MinimalRows rows={rows} variant="stack" />
        </AppCard>
      </div>

      {supportGroup && supportItems.length ? (
        <AdminModuleListCard
          title={getAdminDashboardGroupTitle(supportGroup.title)}
          items={supportItems}
          eyebrow="Modul pendukung"
        />
      ) : null}
    </div>
  );
}

function AdminHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
        {eyebrow}
      </p>
      <h1 className="font-heading text-3xl font-bold tracking-tight">{title}</h1>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function AdminDashboardStats({
  stats,
}: {
  stats: Array<{ label: string; value: string; description: string }>;
}) {
  if (!stats.length) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-[var(--radius-2xl)] border border-border bg-surface-container-lowest p-5"
        >
          <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
          <p className="mt-2 font-heading text-3xl font-bold tracking-tight">{stat.value}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.description}</p>
        </div>
      ))}
    </div>
  );
}

function renderAdminSection(
  page: AdminPage,
  rows: WorkspaceRow[],
  role: InternalStaffRole,
  permissions?: Partial<StaffPermissionSet> | null,
) {
  const chrome = getAdminSectionChrome(page);
  const managedChrome = chrome
    ? {
        variant: chrome.variant,
        actionEyebrow: chrome.actionEyebrow,
        actionDescription: chrome.actionDescription,
        actionPills: chrome.actionPills,
      }
    : null;

  switch (page) {
    case "dashboard":
      return <AdminDashboardLanding rows={rows} role={role} permissions={permissions} />;
    case "layanan":
      return <AdminServicesSection />;
    case "login-penugasan":
      return managedChrome ? <AdminStaffAccessSection chrome={managedChrome} /> : <AdminStaffAccessSection />;
    case "pengguna-umum":
      return managedChrome ? <AdminPublicUsersSection chrome={managedChrome} /> : <AdminPublicUsersSection />;
    case "unit-organisasi":
      return <AdminUnitOrganizationsSection />;
    case "pengumuman":
      return <AdminAnnouncementsSection />;
    case "operasional":
      return <AdminOperationalSettingsSection />;
    case "faq-bantuan":
      return managedChrome ? (
        <AdminFaqSection chrome={managedChrome} initialRows={rows} />
      ) : null;
    case "hak-akses-role":
      return <AdminRolePermissionsSection />;
    case "ekspor-data":
      return managedChrome ? <AdminExportWorkspaceSection chrome={managedChrome} /> : null;
    case "data-referensi":
      return <AdminMasterDataSection />;
    case "aktivitas":
      return <AdminActivityLogSection permissions={permissions} />;
    case "profil":
      return managedChrome ? (
        <AdminProfileSection chrome={managedChrome} initialRows={rows} />
      ) : null;
    case "pengaturan":
      return <AdminSystemSettingsSection />;
    default:
      return null;
  }
}

export function AdminPanelPage({ page = "dashboard" }: { page?: AdminPage }) {
  const pageConfig = getInternalPageConfig("humas-admin", page);
  const { activeRole } = useActiveStaffRole("humas-admin");
  const permissionQuery = useStaffRolePermissions(activeRole);
  const currentPath = getInternalPagePath("humas-admin", page);
  const permissions = permissionQuery.permissions;
  const isPermissionLoading =
    permissionQuery.isRuntimeSyncing && !permissionQuery.permissions;
  const routeRequirement = getStaffRoutePermissionRequirement(activeRole, currentPath);
  const missingRoutePermissions = getMissingStaffPermissions(
    routeRequirement,
    permissions,
  );
  const fallbackPath = getFirstAccessibleStaffPath(
    activeRole,
    permissions,
    currentPath,
  );
  const availableAdminGroups = getAdminPanelGroups(activeRole, permissions);
  const hasSharedAdminAccess =
    activeRole === "humas-admin" ||
    availableAdminGroups.some((group) => group.items.length > 0);

  if (!pageConfig) {
    const fallback = getInternalUnavailableCopy("humas-admin");
    return (
      <DashboardShell
        role={activeRole}
        currentPath={getInternalPagePath("humas-admin", "dashboard")}
        title={fallback.title}
        subtitle={fallback.description}
      >
        <main className="mx-auto max-w-7xl pb-28">
          <InternalWorkspaceUnavailable {...fallback} />
        </main>
      </DashboardShell>
    );
  }

  if (isPermissionLoading) {
    return (
      <DashboardShell
        role={activeRole}
        currentPath={currentPath}
        title={pageConfig.title}
        subtitle={pageConfig.description}
      >
        <main className="mx-auto max-w-7xl pb-28">
          <div className="space-y-6">
            <AdminHero
              eyebrow={pageConfig.heroEyebrow}
              title={pageConfig.heroTitle}
              description={pageConfig.heroDescription}
            />
            <p className="text-sm leading-6 text-muted-foreground">
              Memuat hak akses admin dan modul yang tersedia.
            </p>
          </div>
        </main>
      </DashboardShell>
    );
  }

  if (page === "dashboard" && !hasSharedAdminAccess) {
    return (
      <InternalPermissionFallback
        role={activeRole}
        currentPath={currentPath}
        title={pageConfig.title}
        subtitle={pageConfig.description}
        message="Belum ada modul admin yang aktif untuk akun ini."
        primaryHref={fallbackPath}
        primaryLabel="Buka halaman lain"
        secondaryHref={getInternalPagePath(activeRole, "profil")}
        secondaryLabel="Lihat profil"
      />
    );
  }

  if (missingRoutePermissions.length) {
    return (
      <InternalPermissionFallback
        role={activeRole}
        currentPath={currentPath}
        title={pageConfig.title}
        subtitle={pageConfig.description}
        message={`Akses untuk ${describeStaffPermissionRequirement(routeRequirement)} belum tersedia pada akun ini.`}
        primaryHref={fallbackPath}
        primaryLabel="Buka halaman lain"
        secondaryHref={getInternalPagePath(activeRole, "profil")}
        secondaryLabel="Lihat profil"
      />
    );
  }

  const content = renderAdminSection(page, pageConfig.rows, activeRole, permissions);

  return (
    <DashboardShell
      role={activeRole}
      currentPath={currentPath}
      title={pageConfig.title}
      subtitle={pageConfig.description}
    >
      <main className="mx-auto max-w-7xl pb-28">
        <div className="space-y-6">
          <AdminHero
            eyebrow={pageConfig.heroEyebrow}
            title={pageConfig.heroTitle}
            description={pageConfig.heroDescription}
          />
          {page === "dashboard" ? <AdminDashboardStats stats={pageConfig.stats} /> : null}
          {content}
        </div>
      </main>
    </DashboardShell>
  );
}
