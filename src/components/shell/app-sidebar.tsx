import * as React from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { AppSessionLogoutButton } from "@/components/composite/app-session-logout-button";
import { AppButton } from "@/components/ui/app-button";
import {
  filterRoleNavigationByPermissions,
  getRoleNavigationExtensions,
  type AppRole,
  getRoleTheme,
  mergeRoleNavItems,
} from "@/design-system/roles";
import { useStaffRolePermissions } from "@/features/internal/use-staff-role-permissions";
import { readMockSession } from "@/lib/mock-auth";
import {
  getMockUserProfile,
  MOCK_USER_PROFILE_EVENT,
  MOCK_USER_PROFILE_STORAGE_KEY,
} from "@/lib/mock-user-profile";
import { cn } from "@/lib/utils";

import { LogoLockup } from "./logo-lockup";

function isActivePath(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function AppSidebar({
  role,
  currentPath,
  collapsed = false,
  onToggleCollapse,
  }: {
  role: AppRole;
  currentPath: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const theme = getRoleTheme(role);
  const [sidebarDescription, setSidebarDescription] = React.useState(theme.description);
  const shouldLoadRuntimePermissions = role !== "user";
  const permissionQuery = useStaffRolePermissions(
    shouldLoadRuntimePermissions ? role : undefined,
    { enabled: shouldLoadRuntimePermissions },
  );
  const isRuntimePermissionPending =
    shouldLoadRuntimePermissions &&
    permissionQuery.isRuntimeSyncing &&
    !permissionQuery.permissions;
  const extensions = getRoleNavigationExtensions(
    role,
    permissionQuery.permissions,
  );
  const applyNavFilter = (items: typeof theme.navigation) => {
    const mergedItems = mergeRoleNavItems(items);
    return shouldLoadRuntimePermissions
      ? filterRoleNavigationByPermissions(role, mergedItems, permissionQuery.permissions)
      : mergedItems;
  };
  const navigation = applyNavFilter(
    mergeRoleNavItems(theme.navigation, extensions.navigation),
  );
  const managementNavigation = applyNavFilter(
    mergeRoleNavItems(theme.managementNavigation ?? [], extensions.managementNavigation),
  );
  const utilityNavigation = applyNavFilter(theme.utilityNavigation);
  const sections = isRuntimePermissionPending
    ? []
    : [
        { key: "navigasi", label: "Navigasi", items: navigation },
        ...(managementNavigation.length
          ? [{ key: "pengelolaan", label: "Pengelolaan", items: managementNavigation }]
          : []),
        ...(utilityNavigation.length
          ? [{ key: "akun", label: "Akun", items: utilityNavigation }]
          : []),
      ];

  React.useEffect(() => {
    const syncSidebarDescription = () => {
      const session = readMockSession();

      if (role === "user") {
        const profileName = getMockUserProfile().name.trim();
        const displayName =
          session?.variant === "user" ? String(session.displayName || "").trim() : "";
        setSidebarDescription(profileName || displayName || theme.description);
        return;
      }

      const displayName =
        session?.variant === "staff" && session.role === role
          ? String(session.displayName || "").trim()
          : "";
      setSidebarDescription(displayName || theme.description);
    };

    syncSidebarDescription();

    const handleStorage = (event: StorageEvent) => {
      if (
        !event.key ||
        event.key === MOCK_USER_PROFILE_STORAGE_KEY
      ) {
        syncSidebarDescription();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(MOCK_USER_PROFILE_EVENT, syncSidebarDescription);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(MOCK_USER_PROFILE_EVENT, syncSidebarDescription);
    };
  }, [role, theme.description]);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 self-start border-r bg-role-sidebar py-6 text-foreground transition-[width,padding] duration-200 lg:flex lg:flex-col",
        collapsed ? "w-24 px-3" : "w-72 px-4",
      )}
    >
      <div
        className={cn(
          "gap-3",
          collapsed ? "flex flex-col items-center" : "flex items-center justify-between px-3",
        )}
      >
        {collapsed ? (
          <>
            <LogoLockup iconOnly />
            <AppButton
              type="button"
              variant="outline"
              size="icon"
              className="rounded-2xl"
              onClick={onToggleCollapse}
              aria-label="Tampilkan sidebar"
              title="Tampilkan sidebar"
            >
              <PanelLeftOpen className="size-4" />
            </AppButton>
          </>
        ) : (
          <>
            <LogoLockup compact />
            <AppButton
              type="button"
              variant="outline"
              size="icon"
              className="rounded-2xl"
              onClick={onToggleCollapse}
              aria-label="Sembunyikan sidebar"
              title="Sembunyikan sidebar"
            >
              <PanelLeftClose className="size-4" />
            </AppButton>
          </>
        )}
      </div>
      {!collapsed ? (
        <div className="mt-6 px-3">
          <p className="text-lg font-heading font-bold tracking-tight">{theme.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{sidebarDescription}</p>
        </div>
      ) : null}
      <div className={cn("mt-8 flex-1 overflow-y-auto pb-4", collapsed ? "space-y-4" : "space-y-6")}>
        {isRuntimePermissionPending ? (
          <div className={cn("space-y-3", collapsed && "space-y-2")}>
            {!collapsed ? (
              <div className="px-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Navigasi
                </p>
              </div>
            ) : null}
            <div className="space-y-1.5 px-1">
              {Array.from({ length: collapsed ? 3 : 4 }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "animate-pulse rounded-2xl bg-surface-container-low",
                    collapsed ? "mx-auto size-11" : "h-11 w-full",
                  )}
                />
              ))}
            </div>
          </div>
        ) : null}
        {sections.map((section) => (
          <div key={section.key} className={cn("space-y-3", collapsed && "space-y-2")}>
            {!collapsed ? (
              <div className="px-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {section.label}
                </p>
              </div>
            ) : null}
            <nav className="space-y-1.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(currentPath, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "mx-1 flex min-h-11 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all",
                      collapsed && "mx-auto size-11 justify-center gap-0 px-0 py-0",
                      active
                        ? collapsed
                          ? "bg-role-accent-soft text-role-accent shadow-(--shadow-soft)"
                          : "bg-surface-container-lowest text-role-accent shadow-(--shadow-soft)"
                        : "text-muted-foreground hover:bg-surface-container-lowest hover:text-role-accent",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
      <div className={cn("mt-auto border-t border-border pt-6", collapsed && "flex justify-center")}>
        <AppSessionLogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}
