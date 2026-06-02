"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { BellRing, MapPin, Ticket, Volume2, X } from "lucide-react";

import { AppBadge } from "@/components/ui/app-badge";
import { AppButton } from "@/components/ui/app-button";
import {
  getUserAppointmentPresentation,
  getUserAppointmentsByState,
} from "@/content/user-appointments-content";
import {
  isCallingAudioEnabled,
  playFullCallingAnnouncement,
  readCallingSpeechStatus,
  setCallingAudioEnabled,
  speakCallingAnnouncementImmediately,
  stopCallingAnnouncement,
  subscribeToCallingAudioEnabled,
  unlockCallingAudio,
} from "@/features/user/calling-sound";
import { useLiveUserAppointments } from "@/features/user/use-live-user-appointments";
import { useMockUserProfile } from "@/hooks/use-mock-user-profile";
import {
  buildCallingNotificationSignature,
  buildCallingNotificationTag,
} from "@/lib/calling-notification";
import {
  isAppleMobileDevice,
  isLocalhostHost,
  isMobileInstallSurface,
} from "@/lib/pwa";

const DISMISSED_SIGNATURE_KEY = "lkpp-user-calling-alert-dismissed";
const PUSH_CALLING_PARAM = "push";
const PUSH_CALLING_VALUE = "calling";
const PUSH_CALLING_ID_PARAM = "callingId";
const PUSH_CALLING_SIGNATURE_PARAM = "callingSig";
const PUSH_CALLING_CLIENT_MESSAGE_TYPE = "lkpp-calling-push";
type BrowserNotificationPermission = NotificationPermission | "unsupported";
type CallingNotificationPayload = {
  title: string;
  body: string;
  tag: string;
  url: string;
};
type IncomingCallingPushAppointment = CallingNotificationPayload & {
  id: string;
  queueNumber: string;
  serviceTitle: string;
  unitLabel: string;
  callCount: number;
  counterId?: number;
};

function extractCallingSignatureFromTag(tag: string) {
  const normalizedTag = tag.trim();
  if (!normalizedTag.startsWith("lkpp-calling-")) {
    return "";
  }

  return normalizedTag.slice("lkpp-calling-".length).trim();
}

function extractAppointmentIdFromPath(path: string) {
  const match = path.match(/\/jadwal-saya\/([^/?#]+)/i);
  return match?.[1]?.trim() || "";
}

function buildCallingNotificationUrl(path: string, tag: string) {
  if (typeof window === "undefined") {
    return path;
  }

  const targetUrl = new URL(path, window.location.origin);
  const appointmentId = extractAppointmentIdFromPath(targetUrl.pathname);
  const signature = extractCallingSignatureFromTag(tag);

  targetUrl.searchParams.set(PUSH_CALLING_PARAM, PUSH_CALLING_VALUE);
  if (appointmentId) {
    targetUrl.searchParams.set(PUSH_CALLING_ID_PARAM, appointmentId);
  }
  if (signature) {
    targetUrl.searchParams.set(PUSH_CALLING_SIGNATURE_PARAM, signature);
  }

  return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
}

function normalizeIncomingCallingPushAppointment(
  input: unknown,
): IncomingCallingPushAppointment | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const appointment = input as Record<string, unknown>;
  const id = typeof appointment.id === "string" ? appointment.id.trim() : "";
  const queueNumber =
    typeof appointment.queueNumber === "string"
      ? appointment.queueNumber.trim()
      : "";
  const serviceTitle =
    typeof appointment.serviceTitle === "string"
      ? appointment.serviceTitle.trim()
      : "";
  const unitLabel =
    typeof appointment.unitLabel === "string" ? appointment.unitLabel.trim() : "";

  if (!id || !queueNumber || !serviceTitle || !unitLabel) {
    return null;
  }

  return {
    id,
    title: typeof appointment.title === "string" ? appointment.title.trim() : "",
    body: typeof appointment.body === "string" ? appointment.body.trim() : "",
    tag: typeof appointment.tag === "string" ? appointment.tag.trim() : "",
    url: typeof appointment.url === "string" ? appointment.url.trim() : "",
    queueNumber,
    serviceTitle,
    unitLabel,
    callCount:
      typeof appointment.callCount === "number" &&
      Number.isFinite(appointment.callCount)
        ? appointment.callCount
        : 0,
    counterId:
      typeof appointment.counterId === "number" &&
      Number.isFinite(appointment.counterId)
        ? appointment.counterId
        : undefined,
  };
}

async function getServiceWorkerRegistration() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in window.navigator)
  ) {
    return null;
  }

  const existingRegistration = await window.navigator.serviceWorker
    .getRegistration()
    .catch(() => null);

  if (existingRegistration) {
    return existingRegistration;
  }

  if (isLocalhostHost(window.location.hostname)) {
    return null;
  }

  const registration = await window.navigator.serviceWorker
    .register("/sw.js")
    .catch(() => null);

  if (!registration) {
    return null;
  }

  return window.navigator.serviceWorker.ready.catch(() => registration);
}

async function closeServiceWorkerCallingNotifications(options?: {
  exceptTag?: string;
}) {
  const registration = await getServiceWorkerRegistration();
  if (!registration?.getNotifications) {
    return;
  }

  const notifications = await registration.getNotifications().catch(() => []);
  notifications.forEach((notification) => {
    const currentTag = notification.tag?.trim() || "";
    if (!currentTag.startsWith("lkpp-calling-")) {
      return;
    }

    if (options?.exceptTag && currentTag === options.exceptTag) {
      return;
    }

    notification.close();
  });
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function waitForForegroundReady(timeoutMs = 2_200) {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    if (document.visibilityState === "visible") {
      window.setTimeout(resolve, 140);
      return;
    }

    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      document.removeEventListener("visibilitychange", handleReady);
      window.removeEventListener("focus", handleReady);
      window.removeEventListener("pageshow", handleReady);
      window.setTimeout(resolve, 140);
    };

    const handleReady = () => {
      if (document.visibilityState === "visible") {
        finish();
      }
    };

    document.addEventListener("visibilitychange", handleReady);
    window.addEventListener("focus", handleReady);
    window.addEventListener("pageshow", handleReady);
    window.setTimeout(finish, timeoutMs);
  });
}

export function UserCallingAlert() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const live = useLiveUserAppointments();
  const { completionStatus } = useMockUserProfile(true);
  const [hydrated, setHydrated] = React.useState(false);
  const [dismissedSignature, setDismissedSignature] = React.useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = React.useState(false);
  const [isReplayingAudio, setIsReplayingAudio] = React.useState(false);
  const [manualReplayRecommended, setManualReplayRecommended] = React.useState(false);
  const [speechHint, setSpeechHint] = React.useState<string | null>(null);
  const [isAppleMobile, setIsAppleMobile] = React.useState(false);
  const [isMobileSurface, setIsMobileSurface] = React.useState(false);
  const [callingAudioEnabled, setCallingAudioEnabledState] = React.useState(false);
  const [browserNotificationPermission, setBrowserNotificationPermission] =
    React.useState<BrowserNotificationPermission>("unsupported");
  const previousSignatureRef = React.useRef<string | null>(null);
  const browserNotificationSignatureRef = React.useRef<string | null>(null);
  const browserNotificationRef = React.useRef<Notification | null>(null);

  const fallbackCallingAppointment = React.useMemo(() => {
    return getUserAppointmentsByState("active")
      .map((appointment) => getUserAppointmentPresentation(appointment.id))
      .find((appointment) => appointment?.status === "calling");
  }, []);

  const callingAppointment = live.isLiveSession
    ? live.currentCallingAppointment
    : fallbackCallingAppointment;
  const liveUserId =
    live.session?.authMode === "live" && live.session.userId
      ? live.session.userId.trim()
      : "";

  React.useEffect(() => {
    setHydrated(true);
    setIsAppleMobile(isAppleMobileDevice());
    setIsMobileSurface(isMobileInstallSurface());
    setCallingAudioEnabledState(isCallingAudioEnabled());
    try {
      setDismissedSignature(window.sessionStorage.getItem(DISMISSED_SIGNATURE_KEY));
    } catch {
      setDismissedSignature(null);
    }

    if ("Notification" in window) {
      setBrowserNotificationPermission(window.Notification.permission);
      return;
    }

    setBrowserNotificationPermission("unsupported");
  }, []);

  React.useEffect(() => {
    return subscribeToCallingAudioEnabled((enabled) => {
      setCallingAudioEnabledState(enabled);
    });
  }, []);

  React.useEffect(() => {
    const handleInteraction = () => {
      unlockCallingAudio();
    };

    document.addEventListener("click", handleInteraction, { passive: true });
    document.addEventListener("touchstart", handleInteraction, { passive: true });

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, []);

  React.useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in window.navigator) ||
      isLocalhostHost(window.location.hostname)
    ) {
      return;
    }

    void getServiceWorkerRegistration();
  }, []);

  const signature = callingAppointment
    ? buildCallingNotificationSignature({
        appointmentId: callingAppointment.id,
        callCount: callingAppointment.callCount,
        counterId: callingAppointment.counterId,
      })
    : null;
  const forcedNotificationAppointmentId =
    searchParams.get(PUSH_CALLING_ID_PARAM)?.trim() || "";
  const forcedNotificationSignature = searchParams.get(PUSH_CALLING_SIGNATURE_PARAM)?.trim() || "";
  const forcedOpenFromNotification =
    searchParams.get(PUSH_CALLING_PARAM) === PUSH_CALLING_VALUE &&
    Boolean(callingAppointment) &&
    ((!forcedNotificationAppointmentId ||
      forcedNotificationAppointmentId === callingAppointment?.id) &&
      (!forcedNotificationSignature || forcedNotificationSignature === signature));

  const clearPushOpenParams = React.useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextUrl = new URL(window.location.href);
    let changed = false;

    if (nextUrl.searchParams.has(PUSH_CALLING_PARAM)) {
      nextUrl.searchParams.delete(PUSH_CALLING_PARAM);
      changed = true;
    }

    if (nextUrl.searchParams.has(PUSH_CALLING_SIGNATURE_PARAM)) {
      nextUrl.searchParams.delete(PUSH_CALLING_SIGNATURE_PARAM);
      changed = true;
    }

    if (nextUrl.searchParams.has(PUSH_CALLING_ID_PARAM)) {
      nextUrl.searchParams.delete(PUSH_CALLING_ID_PARAM);
      changed = true;
    }

    if (!changed) {
      return;
    }

    router.replace(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }, [router]);

  const prepareAnnouncementPlayback = React.useCallback(
    async (fromNotification: boolean) => {
      if (fromNotification) {
        await waitForForegroundReady();
      }

      unlockCallingAudio();
      await wait(fromNotification ? 180 : 60);
    },
    [],
  );

  const playAnnouncementForQueue = React.useCallback(
    async (
      queueNumber: string,
      counterId?: number,
      options?: {
        fromNotification?: boolean;
        allowRetry?: boolean;
        manualTrigger?: boolean;
      },
    ) => {
      const fromNotification = options?.fromNotification ?? false;
      const allowRetry = options?.allowRetry ?? false;
      const manualTrigger = options?.manualTrigger ?? false;

      if (!isCallingAudioEnabled()) {
        setManualReplayRecommended(true);
        setSpeechHint(
          "Aktifkan Suara Panggilan dulu agar suara petugas bisa keluar dengan pelafalan Indonesia.",
        );
        return false;
      }

      await prepareAnnouncementPlayback(fromNotification);
      stopCallingAnnouncement();

      let speechStarted = await playFullCallingAnnouncement(queueNumber, counterId);

      if (!speechStarted && allowRetry) {
        await prepareAnnouncementPlayback(true);
        stopCallingAnnouncement();
        speechStarted = await playFullCallingAnnouncement(queueNumber, counterId);
      }

      if (speechStarted) {
        setManualReplayRecommended(false);
        setSpeechHint(null);
        return true;
      }

      const speechStatus = await readCallingSpeechStatus();
      setManualReplayRecommended(true);

      if (!speechStatus.supported) {
        setSpeechHint("Browser ini belum mendukung suara panggilan petugas.");
      } else if (speechStatus.hasServerTts) {
        setSpeechHint(
          isAppleMobile
            ? "Audio panggilan server belum berhasil keluar di iPhone ini. Ketuk tombol putar suara di bawah atau buka aplikasi dari Layar Utama."
            : "Audio panggilan server belum berhasil keluar otomatis. Ketuk tombol putar suara di bawah.",
        );
      } else if (speechStatus.voiceCount === 0) {
        setSpeechHint(
          isAppleMobile
            ? "Voice bawaan iPhone belum siap dipakai di browser ini. Coba buka dari Safari atau aplikasi yang dipasang ke Layar Utama."
            : "Voice TTS di browser belum tersedia. Coba aktifkan Text-to-Speech Google di ponsel.",
        );
      } else if (!speechStatus.hasPreferredVoice) {
        setSpeechHint(
          isAppleMobile
            ? "Voice Indonesia belum tersedia di iPhone ini. Buka dari Safari atau aplikasi di Layar Utama, lalu pilih voice Bahasa Indonesia."
            : "Voice Indonesia belum tersedia di perangkat ini. Aktifkan Text-to-Speech Google lalu pilih Bahasa Indonesia.",
        );
      } else if (manualTrigger) {
        setSpeechHint(
          isAppleMobile
            ? "Safari iPhone masih memblokir suara petugas. Coba lagi dari tombol ini atau buka aplikasi dari Layar Utama."
            : "Suara petugas masih diblokir browser. Pastikan Text-to-Speech Google aktif lalu coba lagi.",
        );
      } else {
        setSpeechHint(
          isAppleMobile
            ? "Di iPhone, suara petugas perlu dipicu dari tap langsung. Ketuk tombol putar suara di bawah."
            : "Suara petugas belum ikut terputar otomatis. Ketuk tombol putar suara di bawah.",
        );
      }

      return false;
    },
    [isAppleMobile, prepareAnnouncementPlayback],
  );

  const playAnnouncement = React.useCallback(
    async (options?: {
      fromNotification?: boolean;
      allowRetry?: boolean;
      manualTrigger?: boolean;
    }) => {
      return playAnnouncementForQueue(
        callingAppointment?.queueNumber ?? "",
        callingAppointment?.counterId,
        options,
      );
    },
    [
      callingAppointment?.counterId,
      callingAppointment?.queueNumber,
      playAnnouncementForQueue,
    ],
  );

  React.useEffect(() => {
    if (
      !hydrated ||
      !liveUserId ||
      typeof window === "undefined" ||
      !("serviceWorker" in window.navigator)
    ) {
      return;
    }

    let cancelled = false;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const payload =
        event.data && typeof event.data === "object"
          ? (event.data as {
              type?: unknown;
              appointment?: unknown;
              openedFromNotification?: unknown;
            })
          : null;

      if (payload?.type !== PUSH_CALLING_CLIENT_MESSAGE_TYPE) {
        return;
      }

      const pushAppointment = normalizeIncomingCallingPushAppointment(
        payload.appointment,
      );

      if (pushAppointment) {
        const pushSignature = buildCallingNotificationSignature({
          appointmentId: pushAppointment.id,
          callCount: pushAppointment.callCount,
          counterId: pushAppointment.counterId,
        });

        if (
          dismissedSignature !== pushSignature ||
          Boolean(payload.openedFromNotification)
        ) {
          previousSignatureRef.current = pushSignature;
          setManualReplayRecommended(false);
          setSpeechHint(null);
          setIsPlayingAudio(true);

          void playAnnouncementForQueue(
            pushAppointment.queueNumber,
            pushAppointment.counterId,
            {
              fromNotification: Boolean(payload.openedFromNotification),
              allowRetry: Boolean(payload.openedFromNotification),
            },
          ).finally(() => {
            if (!cancelled) {
              setIsPlayingAudio(false);
            }
          });
        }
      }

      void queryClient.refetchQueries({
        queryKey: ["user-live-appointments", liveUserId],
        type: "active",
      });
    };

    window.navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    return () => {
      cancelled = true;
      window.navigator.serviceWorker.removeEventListener(
        "message",
        handleServiceWorkerMessage,
      );
    };
  }, [
    dismissedSignature,
    hydrated,
    liveUserId,
    playAnnouncementForQueue,
    queryClient,
  ]);

  React.useEffect(() => {
    if (!hydrated || !completionStatus.isComplete || !signature || !callingAppointment) {
      previousSignatureRef.current = signature ?? null;
      return;
    }

    if (dismissedSignature === signature && !forcedOpenFromNotification) {
      previousSignatureRef.current = signature;
      return;
    }

    const previousSignature = previousSignatureRef.current;
    previousSignatureRef.current = signature;

    if (previousSignature === signature && !forcedOpenFromNotification) {
      return;
    }

    let cancelled = false;
    setIsPlayingAudio(true);
    setManualReplayRecommended(false);
    setSpeechHint(null);

    void (async () => {
      if (cancelled) {
        return;
      }

      await playAnnouncement({
        fromNotification: forcedOpenFromNotification,
        allowRetry: forcedOpenFromNotification,
      });
    })().finally(() => {
      if (!cancelled) {
        setIsPlayingAudio(false);
      }
    });

    return () => {
      cancelled = true;
      setIsPlayingAudio(false);
      stopCallingAnnouncement();
    };
  }, [
    callingAppointment,
    completionStatus.isComplete,
    dismissedSignature,
    forcedOpenFromNotification,
    hydrated,
    playAnnouncement,
    signature,
  ]);

  React.useEffect(() => {
    if (
      !hydrated ||
      !completionStatus.isComplete ||
      !signature ||
      !callingAppointment ||
      (dismissedSignature === signature && !forcedOpenFromNotification) ||
      browserNotificationPermission !== "granted" ||
      typeof window === "undefined" ||
      !("Notification" in window) ||
      (document.visibilityState === "visible" && !isMobileSurface)
    ) {
      return;
    }

    if (browserNotificationSignatureRef.current === signature) {
      return;
    }

    browserNotificationSignatureRef.current = signature;
    browserNotificationRef.current?.close();

    const destination =
      typeof callingAppointment.counterId === "number" && callingAppointment.counterId > 0
        ? `Silakan menuju loket ${callingAppointment.counterId}.`
        : "Silakan menuju unit layanan Anda.";
    const tag = buildCallingNotificationTag({
      appointmentId: callingAppointment.id,
      callCount: Math.max(callingAppointment.callCount ?? 0, 0),
      counterId: callingAppointment.counterId,
    });
    const notificationAppointment: IncomingCallingPushAppointment = {
      id: callingAppointment.id,
      title: `Antrian ${callingAppointment.queueNumber} sedang dipanggil`,
      body: `${callingAppointment.serviceTitle} • ${destination}`,
      tag,
      url: buildCallingNotificationUrl(
        `/jadwal-saya/${callingAppointment.id}`,
        tag,
      ),
      queueNumber: callingAppointment.queueNumber,
      serviceTitle: callingAppointment.serviceTitle,
      unitLabel: callingAppointment.unitLabel,
      callCount: Math.max(callingAppointment.callCount ?? 0, 0),
      counterId: callingAppointment.counterId,
    };
    let cancelled = false;

    void (async () => {
      const registration = await getServiceWorkerRegistration();
      if (cancelled) {
        return;
      }

      if (registration?.showNotification) {
        try {
          await closeServiceWorkerCallingNotifications();
          await registration.showNotification(notificationAppointment.title, {
            body: notificationAppointment.body,
            icon: "/pwa/icon-192.png",
            badge: "/pwa/icon-192.png",
            tag: notificationAppointment.tag,
            requireInteraction: true,
            data: {
              url: notificationAppointment.url,
              appointment: notificationAppointment,
            },
          });
          return;
        } catch {
          // Fall back to page-level notifications below.
        }
      }

      try {
        const notification = new window.Notification(notificationAppointment.title, {
          body: notificationAppointment.body,
          icon: "/pwa/icon-192.png",
          badge: "/pwa/icon-192.png",
          tag: notificationAppointment.tag,
          requireInteraction: true,
          data: {
            url: notificationAppointment.url,
            appointment: notificationAppointment,
          },
        });

        notification.onclick = () => {
          notification.close();
          window.focus();
          window.location.assign(notificationAppointment.url);
        };

        if (!cancelled) {
          browserNotificationRef.current = notification;
          return;
        }

        notification.close();
      } catch {
        browserNotificationSignatureRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
      browserNotificationRef.current?.close();
      if (browserNotificationRef.current) {
        browserNotificationRef.current = null;
      }
      void closeServiceWorkerCallingNotifications();
    };
  }, [
    browserNotificationPermission,
    callingAppointment,
    completionStatus.isComplete,
    dismissedSignature,
    forcedOpenFromNotification,
    hydrated,
    isMobileSurface,
    signature,
  ]);

  React.useEffect(() => {
    if (!hydrated || typeof document === "undefined") {
      return;
    }

    if (document.visibilityState !== "visible") {
      return;
    }

    void closeServiceWorkerCallingNotifications();
  }, [hydrated, signature]);

  const shouldShow =
    hydrated &&
    completionStatus.isComplete &&
    Boolean(callingAppointment) &&
    (dismissedSignature !== signature || forcedOpenFromNotification);

  const handleDismiss = () => {
    if (!signature) return;
    stopCallingAnnouncement();
    browserNotificationRef.current?.close();
    void closeServiceWorkerCallingNotifications();
    setIsPlayingAudio(false);
    setDismissedSignature(signature);
    clearPushOpenParams();
    try {
      window.sessionStorage.setItem(DISMISSED_SIGNATURE_KEY, signature);
    } catch {
      // Ignore storage errors in private mode / disabled storage.
    }
  };

  const handleOpenDetail = () => {
    if (!callingAppointment) return;
    handleDismiss();
    router.push(`/jadwal-saya/${callingAppointment.id}`);
  };

  const handleReplayAudio = async () => {
    if (!callingAppointment || isPlayingAudio || isReplayingAudio) {
      return;
    }

    setIsReplayingAudio(true);
    setSpeechHint(null);
    setManualReplayRecommended(false);

    try {
      if (!callingAudioEnabled) {
        const speechStatus = await readCallingSpeechStatus();

        if (!speechStatus.supported) {
          setManualReplayRecommended(true);
          setSpeechHint("Browser ini belum mendukung suara panggilan petugas.");
          return;
        }

        if (!speechStatus.hasPreferredVoice) {
          setManualReplayRecommended(true);
          setSpeechHint(
            isAppleMobile
              ? "Voice cadangan Indonesia belum tersedia di iPhone ini. Buka dari Safari atau aplikasi di Layar Utama, lalu pilih voice Bahasa Indonesia."
              : "Voice cadangan Indonesia belum tersedia di perangkat ini. Aktifkan Text-to-Speech Google lalu pilih Bahasa Indonesia.",
          );
          return;
        }

        setCallingAudioEnabled(true);
        setCallingAudioEnabledState(true);
      }

      if (isAppleMobile) {
        unlockCallingAudio();
        stopCallingAnnouncement();
        const started = await speakCallingAnnouncementImmediately(
          callingAppointment.queueNumber,
          callingAppointment.counterId,
        );

        if (started) {
          setSpeechHint(null);
          return;
        }

        const speechStatus = await readCallingSpeechStatus();
        setManualReplayRecommended(true);

        if (!speechStatus.supported) {
          setSpeechHint("Safari di iPhone belum mendukung suara petugas di perangkat ini.");
        } else if (speechStatus.hasServerTts) {
          setSpeechHint("Safari iPhone masih menahan audio panggilan server. Coba tap lagi tombol ini atau buka aplikasi dari Layar Utama.");
        } else if (speechStatus.voiceCount === 0) {
          setSpeechHint("Voice iPhone belum tersedia. Coba restart Safari atau buka aplikasi dari Layar Utama.");
        } else {
          setSpeechHint("Safari iPhone masih menahan suara petugas. Coba tap lagi tombol ini.");
        }

        return;
      }

      await playAnnouncement({ manualTrigger: true });
    } finally {
      setIsReplayingAudio(false);
    }
  };

  const handleEnableBrowserNotification = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setBrowserNotificationPermission("unsupported");
      return;
    }

    try {
      const permission = await window.Notification.requestPermission();
      setBrowserNotificationPermission(permission);
    } catch {
      setBrowserNotificationPermission(window.Notification.permission);
    }
  };

  if (!shouldShow || !callingAppointment) {
    return null;
  }

  const callCount = Math.max(callingAppointment.callCount ?? 0, 0);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-md"
      onClick={handleDismiss}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-emerald-500/20 bg-[linear-gradient(180deg,rgba(7,18,31,0.94)_0%,rgba(9,21,34,0.96)_100%)] shadow-[0_30px_70px_-36px_rgba(15,23,42,0.62)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-300" />
        <div className="space-y-5 p-6">
          <div className="flex items-center justify-between gap-3">
            <AppBadge tone="role">
              <BellRing className="size-3.5" />
              {callCount > 1 ? `Panggilan ke-${callCount}` : "Panggilan antrian"}
            </AppBadge>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex size-9 items-center justify-center rounded-full border border-white/10 text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Tutup pemberitahuan"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="font-heading text-2xl font-bold tracking-[-0.04em] text-white">
              {callCount > 1 ? "Panggilan ulang" : "Giliran Anda"}
            </p>
            <p className="text-sm leading-6 text-white/72">
              {callCount > 1
                ? "Nomor antrian Anda dipanggil lagi. Silakan menuju unit terkait."
                : "Nomor antrian Anda sedang dipanggil. Silakan menuju unit terkait sekarang."}
            </p>
          </div>

          {isPlayingAudio ? (
            <div className="flex items-center gap-2 text-xs text-emerald-200/75">
              <Volume2 className="size-3.5" />
              <span>Memutar pengumuman antrian...</span>
            </div>
          ) : null}

          {manualReplayRecommended ? (
            <div className="rounded-[22px] border border-amber-300/20 bg-amber-50/8 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100/80">
                Suara petugas
              </p>
              <p className="mt-1 text-sm leading-6 text-white/72">
                {speechHint || "Suara manusia belum keluar otomatis. Ketuk tombol di bawah untuk memutar panggilan langsung dari halaman ini."}
              </p>
              <AppButton
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={handleReplayAudio}
                loading={isReplayingAudio}
                loadingLabel={callingAudioEnabled ? "Memutar suara..." : "Mengaktifkan suara..."}
              >
                <Volume2 className="size-4" />
                {callingAudioEnabled ? "Putar Suara Panggilan" : "Aktifkan & Putar Suara"}
              </AppButton>
            </div>
          ) : null}

          {browserNotificationPermission === "default" ? (
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/62">
                Notifikasi browser
              </p>
              <p className="mt-1 text-sm leading-6 text-white/72">
                Aktifkan supaya panggilan antrian tetap muncul saat tab sedang tidak aktif.
              </p>
              <AppButton
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={handleEnableBrowserNotification}
              >
                Aktifkan Notifikasi
              </AppButton>
            </div>
          ) : null}

          <div className="rounded-[24px] border border-white/8 bg-white/[0.04] px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                <Ticket className="size-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="truncate font-semibold text-white">{callingAppointment.serviceTitle}</p>
                <p className="truncate text-xs leading-5 text-white/62">
                  {callingAppointment.queueNumber} • {callingAppointment.unitLabel}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/58">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{callingAppointment.location}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <AppButton fullWidth className="sm:flex-1 sm:w-auto" onClick={handleOpenDetail}>
              Buka Detail Antrian
            </AppButton>
            <AppButton
              fullWidth
              variant="outline"
              className="sm:flex-1 sm:w-auto"
              onClick={handleDismiss}
            >
              Tutup
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}
