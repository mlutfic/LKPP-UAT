"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, UserRound, X } from "lucide-react";

import { AppSessionLogoutButton } from "@/components/composite/app-session-logout-button";
import { AppButton } from "@/components/ui/app-button";
import { type AppRole, getRoleTheme } from "@/design-system/roles";
import { publicNavigation } from "@/design-system/site";
import { useAuthSessionQuery } from "@/features/auth/hooks/use-auth-session-query";
import {
  getMockUserProfile,
  MOCK_USER_PROFILE_EVENT,
  MOCK_USER_PROFILE_STORAGE_KEY,
} from "@/lib/mock-user-profile";
import { readMockSession } from "@/lib/mock-auth";
import { cn } from "@/lib/utils";

import { LogoLockup } from "./logo-lockup";

type AppHeaderProps =
  | {
      variant: "public";
      role?: never;
      title?: never;
      subtitle?: never;
      ctaLabel?: string;
      ctaHref?: string;
    }
  | {
      variant: "auth";
      role?: never;
      title?: never;
      subtitle?: never;
      ctaLabel?: string;
    }
  | {
      variant: "dashboard";
      role: AppRole;
      title?: string;
      subtitle?: string;
      profileHref?: string;
      hasNotifications?: boolean;
    };

export function AppHeader(props: AppHeaderProps) {
  const pathname = usePathname();
  const [publicMenuOpen, setPublicMenuOpen] = React.useState(false);
  const publicSessionQuery = useAuthSessionQuery({ enabled: props.variant === "public" });
  const [publicUserName, setPublicUserName] = React.useState("");

  React.useEffect(() => {
    if (props.variant !== "public") {
      return;
    }

    const syncPublicUserName = () => {
      const session = readMockSession();
      if (session?.variant !== "user") {
        setPublicUserName("");
        return;
      }

      const profileName = getMockUserProfile().name.trim();
      const displayName = String(session.displayName || "").trim();
      setPublicUserName(profileName || displayName || "Pengguna");
    };

    syncPublicUserName();

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === MOCK_USER_PROFILE_STORAGE_KEY) {
        syncPublicUserName();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(MOCK_USER_PROFILE_EVENT, syncPublicUserName);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(MOCK_USER_PROFILE_EVENT, syncPublicUserName);
    };
  }, [props.variant, publicSessionQuery.data?.session?.displayName, publicSessionQuery.data?.session?.variant]);

  React.useEffect(() => {
    setPublicMenuOpen(false);
  }, [pathname]);

  const publicSession = props.variant === "public" ? publicSessionQuery.data?.session ?? null : null;
  const isPublicUserSession = publicSession?.variant === "user";
  const publicUserHref = isPublicUserSession ? publicSession.redirectTo || "/dashboard" : "/login";
  const resolvedPublicUserName = publicUserName || "Pengguna";

  if (props.variant === "public") {
    return (
      <header className="sticky top-0 z-(--z-header) border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-5 md:h-20 md:gap-6 md:px-6">
          <LogoLockup compact />
          <nav className="hidden items-center gap-8 md:flex">
            {publicNavigation.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-semibold text-muted-foreground transition-colors hover:text-role-accent",
                    isActive && "border-b-2 border-role-accent pb-1 text-role-accent",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <AppButton
              type="button"
              variant="outline"
              size="icon-sm"
              className="md:hidden"
              aria-label={publicMenuOpen ? "Tutup navigasi" : "Buka navigasi"}
              onClick={() => setPublicMenuOpen((current) => !current)}
            >
              {publicMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </AppButton>
            {isPublicUserSession ? (
              <>
                <Link
                  className="hidden max-w-[14rem] truncate text-sm font-semibold text-muted-foreground transition-colors hover:text-role-accent md:inline-flex"
                  href={publicUserHref}
                  title={resolvedPublicUserName}
                >
                  {resolvedPublicUserName}
                </Link>
                <AppSessionLogoutButton
                  label="Logout"
                  loadingLabel="Logout..."
                  size="lg"
                  fullWidth={false}
                  redirectTargetOverride="/"
                  confirmDescription="Anda akan keluar dari sesi aktif dan kembali ke beranda publik."
                  className="rounded-2xl md:rounded-[var(--radius-xl)]"
                />
              </>
            ) : (
              <>
                <Link
                  className="hidden text-sm font-semibold text-muted-foreground md:inline-flex"
                  href="/login/petugas"
                >
                  Masuk Petugas
                </Link>
                <Link href={props.ctaHref ?? "/login"}>
                  <AppButton
                    size="lg"
                    className="rounded-2xl md:rounded-[var(--radius-xl)]"
                  >
                    {props.ctaLabel ?? "Masuk Pengguna"}
                  </AppButton>
                </Link>
              </>
            )}
          </div>
        </div>
        {publicMenuOpen ? (
          <div className="border-t border-border bg-background md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-5">
              {publicNavigation.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
                      isActive
                        ? "bg-role-accent-soft text-role-accent"
                        : "text-foreground hover:bg-surface-container-low",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/bantuan"
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low"
              >
                Bantuan
              </Link>
              {isPublicUserSession ? (
                <Link
                  href={publicUserHref}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low"
                >
                  {resolvedPublicUserName}
                </Link>
              ) : (
                <Link
                  href="/login/petugas"
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low"
                >
                  Masuk Petugas
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </header>
    );
  }

  if (props.variant === "auth") {
    return (
      <header className="relative z-20 w-full px-4 py-4 sm:px-6 sm:py-5 md:px-10 md:py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <LogoLockup compact className="min-w-0" />
          <Link href="/bantuan" className="shrink-0 self-start sm:self-auto">
            <AppButton variant="outline">Bantuan</AppButton>
          </Link>
        </div>
      </header>
    );
  }

  const roleTheme = getRoleTheme(props.role);
  const profileHref = props.profileHref ?? roleTheme.utilityNavigation[0]?.href ?? "/";

  return (
    <header className="sticky top-0 z-(--z-header) border-b border-border bg-background/92 backdrop-blur-xl">
      <div className="px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-heading text-lg font-bold tracking-tight md:text-xl">
              {props.title ?? roleTheme.label}
            </p>
            {props.subtitle ? (
              <p className="mt-1 truncate text-sm text-muted-foreground">{props.subtitle}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <AppButton
              type="button"
              variant="outline"
              size="icon"
              className="relative rounded-full"
              aria-label="Notifikasi"
            >
              <Bell className="size-5" />
              {props.hasNotifications ? (
                <span className="absolute right-3 top-3 size-2 rounded-full bg-role-accent" />
              ) : null}
            </AppButton>
            <Link
              href={profileHref}
              aria-label="Buka profil"
              className="flex size-11 items-center justify-center rounded-full border border-border bg-surface-container-lowest text-role-accent transition-colors hover:bg-role-accent-soft"
            >
              <UserRound className="size-5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
