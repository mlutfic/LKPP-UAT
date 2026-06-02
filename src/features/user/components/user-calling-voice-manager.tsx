"use client";

import * as React from "react";
import { Volume2, X } from "lucide-react";
import { toast } from "sonner";

import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import {
  activateCallingAudio,
  isCallingAudioEnabled,
  readCallingSpeechStatus,
  subscribeToCallingAudioEnabled,
} from "@/features/user/calling-sound";
import { readMockSession } from "@/lib/mock-auth";
import { isAppleMobileDevice, requiresHomeScreenInstallForWebPush } from "@/lib/pwa";

const DISMISSED_CALLING_VOICE_PROMPT_KEY = "lkpp-calling-voice-prompt-dismissed";

export function UserCallingVoiceManager() {
  const [hydrated, setHydrated] = React.useState(false);
  const [callingAudioEnabled, setCallingAudioEnabled] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [isAppleMobile, setIsAppleMobile] = React.useState(false);
  const [requiresHomeScreenInstall, setRequiresHomeScreenInstall] =
    React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [hint, setHint] = React.useState<string | null>(null);
  const [session] = React.useState(() => readMockSession());

  const hasLiveUserSession =
    session?.variant === "user" &&
    session.authMode === "live" &&
    Boolean(session.userId);

  React.useEffect(() => {
    setHydrated(true);
    setCallingAudioEnabled(isCallingAudioEnabled());
    setIsAppleMobile(isAppleMobileDevice());
    setRequiresHomeScreenInstall(requiresHomeScreenInstallForWebPush());

    try {
      setDismissed(
        window.sessionStorage.getItem(DISMISSED_CALLING_VOICE_PROMPT_KEY) === "1",
      );
    } catch {
      setDismissed(false);
    }
  }, []);

  React.useEffect(() => {
    return subscribeToCallingAudioEnabled((enabled) => {
      setCallingAudioEnabled(enabled);
    });
  }, []);

  const handleActivate = async () => {
    setSyncing(true);
    setHint(null);

    try {
      const result = await activateCallingAudio();
      if (result.activated) {
        setCallingAudioEnabled(true);
        toast.success("Suara panggilan sudah aktif.");
        return;
      }

      const speechStatus = await readCallingSpeechStatus();

      if (!speechStatus.supported) {
        setHint("Browser ini belum mendukung suara panggilan.");
        return;
      }

      if (speechStatus.hasServerTts) {
        setHint(
          isAppleMobile
            ? "Audio panggilan server belum berhasil dipicu. Ketuk Aktifkan Suara sekali lagi dari Safari atau aplikasi di Layar Utama."
            : "Audio panggilan server belum berhasil dipicu. Ketuk Aktifkan Suara sekali lagi.",
        );
        return;
      }

      if (!speechStatus.hasPreferredVoice || !result.hasIndonesianVoice) {
        setHint(
          isAppleMobile
            ? "Voice cadangan Indonesia belum tersedia. Buka aplikasi dari Safari atau Layar Utama, lalu pilih voice Bahasa Indonesia."
            : "Voice cadangan Indonesia belum tersedia. Aktifkan Text-to-Speech Google lalu pilih Bahasa Indonesia.",
        );
        return;
      }

      setHint(
        isAppleMobile
          ? "Safari iPhone masih menahan suara. Ketuk Aktifkan Suara sekali lagi."
          : "Browser masih menahan suara. Ketuk Aktifkan Suara sekali lagi.",
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISSED_CALLING_VOICE_PROMPT_KEY, "1");
    } catch {
      // Ignore storage failures.
    }
  };

  if (!hydrated || !hasLiveUserSession || callingAudioEnabled || dismissed) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[54] flex justify-center px-3 sm:top-5">
      <AppCard
        tone="glass"
        padding="md"
        className="pointer-events-auto w-full max-w-[26rem] rounded-[24px] border border-border/60 bg-white/96 p-4 shadow-(--shadow-float)"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-role-accent-soft text-role-accent">
            <Volume2 className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Aktifkan suara panggilan
                </p>
                <p className="text-[0.8rem] leading-5 text-muted-foreground">
                  Klik sekali agar panggilan antrean memakai suara Indonesia natural di browser ini.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground"
                aria-label="Tutup prompt suara panggilan"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {requiresHomeScreenInstall ? (
              <p className="text-[0.78rem] leading-5 text-muted-foreground">
                Di iPhone/iPad, suara dan notifikasi lebih stabil jika aplikasi dibuka dari ikon di Layar Utama.
              </p>
            ) : null}

            {hint ? (
              <div className="rounded-[18px] border border-amber-300/30 bg-amber-50/80 px-3 py-2 text-[0.8rem] leading-5 text-amber-900">
                {hint}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <AppButton
                size="sm"
                onClick={handleActivate}
                loading={syncing}
                loadingLabel="Mengaktifkan..."
              >
                <Volume2 className="size-4" />
                Aktifkan Suara
              </AppButton>
              <AppButton
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                disabled={syncing}
              >
                Nanti
              </AppButton>
            </div>
          </div>
        </div>
      </AppCard>
    </div>
  );
}
