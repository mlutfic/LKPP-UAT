"use client";

import * as React from "react";
import type { VariantProps } from "class-variance-authority";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { buttonVariants } from "@/components/ui/button";
import { clearMockSession, readMockSession } from "@/lib/mock-auth";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export function AppSessionLogoutButton({
  collapsed = false,
  label = "Keluar Sesi",
  loadingLabel = "Keluar...",
  variant = "default",
  size = "default",
  fullWidth = true,
  className,
  redirectTargetOverride,
  confirmDescription = "Anda akan keluar dari sesi aktif dan diarahkan kembali ke halaman login.",
}: {
  collapsed?: boolean;
  label?: string;
  loadingLabel?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  fullWidth?: boolean;
  className?: string;
  redirectTargetOverride?: string;
  confirmDescription?: string;
}) {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [redirectTarget, setRedirectTarget] = React.useState("/login?logout=1");
  const logoutHref = `/api/auth/logout?next=${encodeURIComponent(redirectTarget)}`;

  React.useEffect(() => {
    if (redirectTargetOverride) {
      setRedirectTarget(redirectTargetOverride);
      return;
    }

    const session = readMockSession();
    setRedirectTarget(session?.variant === "staff" ? "/login/petugas?logout=1" : "/login?logout=1");
  }, [redirectTargetOverride]);

  async function handleLogout() {
    if (submitting) return;

    setSubmitting(true);
    let timeoutId: number | null = null;
    const controller = new AbortController();

    try {
      timeoutId = window.setTimeout(() => controller.abort(), 2500);

      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
      });
    } catch {
      // Even if the request fails, we still clear local state so the user is not trapped.
    }

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }

    clearMockSession();
    logout();
    void queryClient.cancelQueries();
    queryClient.removeQueries({ queryKey: ["auth-session"] });
    queryClient.removeQueries({ queryKey: ["runtime-role-permissions"] });
    queryClient.removeQueries({ queryKey: ["staff-live-appointments"] });
    toast.success("Sesi berhasil diakhiri.");

    try {
      window.location.replace(redirectTarget);
    } catch {
      window.location.assign(logoutHref);
    }
  }

  function openLogoutConfirm(event?: React.MouseEvent<HTMLAnchorElement>) {
    event?.preventDefault();
    if (submitting) return;
    setConfirmOpen(true);
  }

  if (collapsed) {
    return (
      <>
        <a
          href={logoutHref}
          aria-label="Keluar sesi"
          title="Keluar sesi"
          aria-busy={submitting}
          data-loading={submitting ? "true" : "false"}
          onClick={openLogoutConfirm}
          className={cn(
            buttonVariants({ size: "icon", variant: "default" }),
            "w-full",
            submitting && "pointer-events-none opacity-70",
          )}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
        </a>
        <AppConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Keluar dari sesi?"
          description={confirmDescription}
          confirmLabel="Keluar Sesi"
          confirmVariant="destructive"
          loading={submitting}
          onConfirm={async () => {
            setConfirmOpen(false);
            await handleLogout();
          }}
        />
      </>
    );
  }

  return (
    <>
      <a
        href={logoutHref}
        aria-busy={submitting}
        data-loading={submitting ? "true" : "false"}
        onClick={openLogoutConfirm}
        className={cn(
          buttonVariants({ size, variant }),
          fullWidth && "w-full",
          className,
          submitting && "pointer-events-none opacity-70",
        )}
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span>{loadingLabel}</span>
          </>
        ) : (
          label
        )}
      </a>
      <AppConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Keluar dari sesi?"
        description={confirmDescription}
        confirmLabel="Keluar Sesi"
        confirmVariant="destructive"
        loading={submitting}
        onConfirm={async () => {
          setConfirmOpen(false);
          await handleLogout();
        }}
      />
    </>
  );
}
