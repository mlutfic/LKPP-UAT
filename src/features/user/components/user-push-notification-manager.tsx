"use client";

import * as React from "react";
import { BellRing, Loader2, Share2, X } from "lucide-react";
import { toast } from "sonner";

import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppDialog } from "@/components/ui/app-dialog";
import { readMockSession } from "@/lib/mock-auth";
import {
  canUseWebPushOnCurrentSurface,
  hasWebPushBrowserSupport,
  requiresHomeScreenInstallForWebPush,
} from "@/lib/pwa";

const DISMISSED_ENABLE_PROMPT_KEY = "lkpp-web-push-dismissed";
const DISMISSED_INSTALL_PROMPT_KEY = "lkpp-web-push-install-dismissed";

type PushConfigResponse = {
  ok?: boolean;
  enabled?: boolean;
  publicKey?: string;
};

function getDismissedPromptKey(requiresInstall: boolean) {
  return requiresInstall
    ? DISMISSED_INSTALL_PROMPT_KEY
    : DISMISSED_ENABLE_PROMPT_KEY;
}

function urlBase64ToUint8Array(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const decoded = window.atob(`${normalized}${padding}`);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

async function registerPushSubscription(publicKey: string) {
  const registration = await window.navigator.serviceWorker.register("/sw.js");
  const readyRegistration = await window.navigator.serviceWorker.ready.catch(
    () => registration,
  );
  const existingSubscription = await readyRegistration.pushManager.getSubscription();
  const subscription =
    existingSubscription ||
    (await readyRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const payload = subscription.toJSON();
  const response = await fetch("/api/push/subscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscription: payload,
      userAgent: window.navigator.userAgent,
    }),
  });
  const result = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok || result.ok === false) {
    throw new Error(result.error || "Gagal mengaktifkan notifikasi background.");
  }
}

export function UserPushNotificationManager() {
  const [hydrated, setHydrated] = React.useState(false);
  const [pushEnabled, setPushEnabled] = React.useState(false);
  const [publicKey, setPublicKey] = React.useState("");
  const [permission, setPermission] = React.useState<NotificationPermission | "unsupported">(
    "unsupported",
  );
  const [requiresInstall, setRequiresInstall] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [installDialogOpen, setInstallDialogOpen] = React.useState(false);
  const [session] = React.useState(() => readMockSession());
  const syncInFlightRef = React.useRef(false);

  const hasLiveUserSession =
    session?.variant === "user" &&
    session.authMode === "live" &&
    Boolean(session.userId);

  React.useEffect(() => {
    const syncSurfaceState = () => {
      const nextRequiresInstall = requiresHomeScreenInstallForWebPush();
      setHydrated(true);
      setRequiresInstall(nextRequiresInstall);

      if (!hasWebPushBrowserSupport()) {
        setPermission("unsupported");
      } else {
        setPermission(window.Notification.permission);
      }

      try {
        setDismissed(
          window.localStorage.getItem(getDismissedPromptKey(nextRequiresInstall)) === "1",
        );
      } catch {
        setDismissed(false);
      }
    };

    syncSurfaceState();

    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleSurfaceChange = () => {
      syncSurfaceState();
    };

    window.addEventListener("focus", handleSurfaceChange);
    mediaQuery.addEventListener("change", handleSurfaceChange);

    return () => {
      window.removeEventListener("focus", handleSurfaceChange);
      mediaQuery.removeEventListener("change", handleSurfaceChange);
    };
  }, []);

  React.useEffect(() => {
    if (!hasLiveUserSession) {
      return;
    }

    let cancelled = false;

    const loadConfig = async () => {
      try {
        const response = await fetch("/api/push/config", {
          method: "GET",
          cache: "no-store",
        });
        const result = (await response.json().catch(() => ({}))) as PushConfigResponse;

        if (cancelled) {
          return;
        }

        setPushEnabled(Boolean(response.ok && result.ok !== false && result.enabled));
        setPublicKey(String(result.publicKey || "").trim());
      } catch {
        if (!cancelled) {
          setPushEnabled(false);
          setPublicKey("");
        }
      }
    };

    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, [hasLiveUserSession]);

  const syncSubscription = React.useCallback(async () => {
    if (
      !hasLiveUserSession ||
      !pushEnabled ||
      !publicKey ||
      !canUseWebPushOnCurrentSurface() ||
      window.Notification.permission !== "granted"
    ) {
      return;
    }

    if (syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;
    setSyncing(true);
    try {
      await registerPushSubscription(publicKey);
    } finally {
      syncInFlightRef.current = false;
      setSyncing(false);
    }
  }, [hasLiveUserSession, publicKey, pushEnabled]);

  React.useEffect(() => {
    if (!hydrated || permission !== "granted") {
      return;
    }

    void syncSubscription().catch(() => undefined);
  }, [hydrated, permission, syncSubscription]);

  const handleEnable = async () => {
    if (requiresInstall) {
      setInstallDialogOpen(true);
      return;
    }

    if (!canUseWebPushOnCurrentSurface()) {
      setPermission("unsupported");
      toast.error("Browser ini belum mendukung notifikasi background.");
      return;
    }

    setSyncing(true);
    try {
      const nextPermission = await window.Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        toast.message("Izin notifikasi belum diaktifkan.");
        return;
      }

      await syncSubscription();
      toast.success("Notifikasi panggilan background aktif.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal mengaktifkan notifikasi background.",
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(getDismissedPromptKey(requiresInstall), "1");
    } catch {
      // Ignore storage errors.
    }
  };

  const shouldShowInstallPrompt =
    hydrated && hasLiveUserSession && pushEnabled && requiresInstall && !dismissed;
  const shouldShowEnablePrompt =
    hydrated &&
    hasLiveUserSession &&
    pushEnabled &&
    !requiresInstall &&
    permission === "default" &&
    !dismissed;

  if (!shouldShowInstallPrompt && !shouldShowEnablePrompt) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[55] flex justify-center px-3">
        <AppCard
          tone="glass"
          padding="md"
          className="pointer-events-auto w-full max-w-[24rem] rounded-[24px] border border-border/60 bg-white/96 p-4 shadow-(--shadow-float)"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-role-accent-soft text-role-accent">
              {shouldShowInstallPrompt ? <Share2 className="size-5" /> : <BellRing className="size-5" />}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {shouldShowInstallPrompt
                      ? "Pasang aplikasi LKPP dulu"
                      : "Aktifkan notifikasi panggilan"}
                  </p>
                  <p className="text-[0.8rem] leading-5 text-muted-foreground">
                    {shouldShowInstallPrompt
                      ? "Di iPhone dan iPad, notifikasi web baru aktif setelah aplikasi dipasang ke layar utama."
                      : "Agar panggilan antrean tetap muncul sebagai teks saat browser tidak sedang dibuka atau suara HP tidak terdengar."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground"
                  aria-label="Tutup prompt notifikasi"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <AppButton size="sm" onClick={handleEnable} disabled={syncing}>
                  {syncing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : shouldShowInstallPrompt ? (
                    <Share2 className="size-4" />
                  ) : (
                    <BellRing className="size-4" />
                  )}
                  {shouldShowInstallPrompt ? "Cara instal" : "Aktifkan"}
                </AppButton>
                <AppButton size="sm" variant="outline" onClick={handleDismiss} disabled={syncing}>
                  Nanti
                </AppButton>
              </div>
            </div>
          </div>
        </AppCard>
      </div>

      <AppDialog
        open={installDialogOpen}
        onOpenChange={setInstallDialogOpen}
        title="Aktifkan Notifikasi di iPhone/iPad"
        description="Notifikasi panggilan di perangkat Apple perlu dijalankan dari aplikasi web yang dipasang ke layar utama."
      >
        <div className="rounded-[22px] border border-border bg-surface-container-low px-4 py-4">
          <p className="text-sm leading-6 text-foreground">
            Buka menu <span className="font-semibold">Bagikan</span>{" "}
            <Share2 className="mx-1 inline size-4 align-[-2px]" />
            lalu pilih <span className="font-semibold">Tambah ke Layar Utama</span>.
            Setelah aplikasi dibuka dari ikon tersebut, aktifkan notifikasi panggilan.
          </p>
        </div>
      </AppDialog>
    </>
  );
}
