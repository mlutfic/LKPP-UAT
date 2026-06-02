"use client";

import Image from "next/image";
import * as React from "react";
import { Download, Share2, X } from "lucide-react";

import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppDialog } from "@/components/ui/app-dialog";
import {
  isAppleMobileDevice,
  isLocalhost,
  isMobileInstallSurface,
  isStandaloneMode,
} from "@/lib/pwa";

type BeforeInstallPromptChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<BeforeInstallPromptChoice>;
};

const DISMISSED_SESSION_KEY = "lkpp-pwa-install-dismissed";
const LOCALHOST_SW_RESET_KEY = "lkpp-localhost-sw-reset";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [dismissedForSession, setDismissedForSession] = React.useState(false);
  const [installed, setInstalled] = React.useState(false);
  const [isMobileSurface, setIsMobileSurface] = React.useState(false);
  const [isIosInstallPath, setIsIosInstallPath] = React.useState(false);
  const [isInstalling, setIsInstalling] = React.useState(false);
  const [instructionDialogOpen, setInstructionDialogOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsMobileSurface(isMobileInstallSurface());
    setInstalled(isStandaloneMode());
    setIsIosInstallPath(isAppleMobileDevice() && !isStandaloneMode());

    try {
      setDismissedForSession(window.sessionStorage.getItem(DISMISSED_SESSION_KEY) === "1");
    } catch {
      setDismissedForSession(false);
    }

    const shouldDisableLocalCaching =
      process.env.NODE_ENV !== "production" || isLocalhost();

    if (shouldDisableLocalCaching) {
      const registrationsPromise =
        "serviceWorker" in window.navigator
          ? window.navigator.serviceWorker
              .getRegistrations()
              .then((registrations) => {
                return Promise.all(
                  registrations.map((registration) => registration.unregister()),
                ).then(() => registrations);
              })
              .catch(() => [])
          : Promise.resolve([]);

      const cacheCleanupPromise =
        "caches" in window
          ? window.caches
              .keys()
              .then((keys) =>
                Promise.all(
                  keys
                    .filter((key) => key.startsWith("lkpp-antrian"))
                    .map((key) => window.caches.delete(key)),
                ),
              )
              .catch(() => [])
          : Promise.resolve([]);

      void Promise.all([registrationsPromise, cacheCleanupPromise]).then(
        ([registrations]) => {
          const shouldForceReload =
            isLocalhost() &&
            (Boolean(window.navigator.serviceWorker?.controller) ||
              registrations.length > 0);

          if (!shouldForceReload) {
            try {
              window.sessionStorage.removeItem(LOCALHOST_SW_RESET_KEY);
            } catch {
              // Ignore storage errors.
            }
            return;
          }

          try {
            if (window.sessionStorage.getItem(LOCALHOST_SW_RESET_KEY) === "1") {
              return;
            }

            window.sessionStorage.setItem(LOCALHOST_SW_RESET_KEY, "1");
          } catch {
            // Ignore storage errors and keep going.
          }

          window.location.reload();
        },
      );

      return;
    }

    if ("serviceWorker" in window.navigator) {
      void window.navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredPrompt(installEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setDismissedForSession(false);
      try {
        window.sessionStorage.removeItem(DISMISSED_SESSION_KEY);
      } catch {
        // Ignore storage errors.
      }
    };

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleModeChange = (nextEvent: MediaQueryListEvent) => {
      if (nextEvent.matches) {
        handleInstalled();
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleInstalled);
    mediaQuery.addEventListener("change", handleModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleInstalled);
      mediaQuery.removeEventListener("change", handleModeChange);
    };
  }, []);

  const handleDismiss = () => {
    setDismissedForSession(true);
    try {
      window.sessionStorage.setItem(DISMISSED_SESSION_KEY, "1");
    } catch {
      // Ignore storage errors.
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setInstructionDialogOpen(true);
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
    } finally {
      setDeferredPrompt(null);
      setIsInstalling(false);
    }
  };

  const shouldShow =
    isMobileSurface &&
    !isLocalhost() &&
    !installed &&
    !dismissedForSession &&
    (Boolean(deferredPrompt) || isIosInstallPath);

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[55] flex justify-center px-3 sm:hidden">
        <AppCard
          tone="glass"
          padding="md"
          className="pointer-events-auto w-full max-w-[22rem] rounded-[24px] border border-border/60 bg-white/96 p-4 shadow-(--shadow-float)"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-white ring-1 ring-border/50">
              <Image
                src="/pwa/icon-192.png"
                alt=""
                width={48}
                height={48}
                className="size-9 object-contain"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <Image
                    src="/brand/logo-lkpp.png"
                    alt="LKPP"
                    width={100}
                    height={24}
                    className="h-4.5 w-auto object-contain"
                  />
                  <p className="text-[0.95rem] font-semibold leading-5 text-foreground">Instal Layanan LKPP</p>
                  <p className="text-[0.78rem] leading-5 text-muted-foreground">
                    {deferredPrompt
                      ? "Akses lebih cepat dari ikon aplikasi."
                      : "Pasang dari menu Bagikan ke layar utama."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground"
                  aria-label="Tutup prompt instal aplikasi"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <AppButton
                onClick={handleInstall}
                loading={isInstalling}
                size="sm"
                className="mt-3 h-9 w-full rounded-full text-sm"
              >
                <Download className="size-4" />
                {deferredPrompt ? "Instal" : "Cara instal"}
              </AppButton>
            </div>
          </div>
        </AppCard>
      </div>

      <AppDialog
        open={instructionDialogOpen}
        onOpenChange={setInstructionDialogOpen}
        title="Instal Layanan LKPP"
        description="Buka menu Bagikan lalu pilih Tambah ke Layar Utama."
      >
        <div className="rounded-[22px] border border-border bg-surface-container-low px-4 py-4">
          <p className="text-sm leading-6 text-foreground">
            Tap <span className="font-semibold">Bagikan</span>{" "}
            <Share2 className="mx-1 inline size-4 align-[-2px]" />
            lalu pilih <span className="font-semibold">Tambah ke Layar Utama</span>.
          </p>
        </div>
      </AppDialog>
    </>
  );
}
