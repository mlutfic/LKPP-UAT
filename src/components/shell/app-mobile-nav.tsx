import Link from "next/link";

import {
  filterRoleNavigationByPermissions,
  getRoleNavigationExtensions,
  type AppRole,
  getRoleTheme,
  mergeRoleNavItems,
} from "@/design-system/roles";
import { useStaffRolePermissions } from "@/features/internal/use-staff-role-permissions";
import { cn } from "@/lib/utils";

function isActivePath(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function AppMobileNav({
  role,
  currentPath,
}: {
  role: AppRole;
  currentPath: string;
}) {
  const theme = getRoleTheme(role);
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
  const mobileItems = mergeRoleNavItems(
    theme.mobileNavigation,
    extensions.navigation,
    extensions.managementNavigation,
  );
  const navigation = isRuntimePermissionPending
    ? []
    : shouldLoadRuntimePermissions
      ? filterRoleNavigationByPermissions(role, mobileItems, permissionQuery.permissions)
      : mobileItems;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-(--z-header) border-t border-border/80 bg-background/96 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-10px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden">
      {isRuntimePermissionPending ? (
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="min-h-[4rem] animate-pulse rounded-xl bg-surface-container-low"
            />
          ))}
        </div>
      ) : null}
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(currentPath, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[4rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-[11px] font-semibold leading-tight transition-all",
                active
                  ? "bg-role-accent-soft/70 text-role-accent"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? (
                <span className="absolute inset-x-4 top-1 h-0.5 rounded-full bg-role-accent" aria-hidden />
              ) : null}
              <Icon className="size-[1.35rem] shrink-0" />
              <span className="truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
