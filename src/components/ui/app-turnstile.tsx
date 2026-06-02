"use client";

import * as React from "react";
import { Loader2, ShieldCheck } from "lucide-react";

type TurnstileTheme = "light" | "dark" | "auto";
type TurnstileSize = "normal" | "compact" | "flexible";

type TurnstileRenderOptions = {
  sitekey: string;
  theme?: TurnstileTheme;
  size?: TurnstileSize;
  action?: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
  "error-callback"?: (errorCode?: string) => void;
  retry?: "auto" | "never";
  "retry-interval"?: number;
  "refresh-expired"?: "auto" | "manual" | "never";
  "refresh-timeout"?: "auto" | "manual" | "never";
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  remove?: (widgetId: string) => void;
  reset?: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __lkppTurnstileLoader__?: Promise<TurnstileApi>;
  }
}

const TURNSTILE_SCRIPT_ID = "lkpp-turnstile-script";
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile hanya tersedia di browser."));
  }

  if (window.turnstile?.render) {
    return Promise.resolve(window.turnstile);
  }

  if (window.__lkppTurnstileLoader__) {
    return window.__lkppTurnstileLoader__;
  }

  window.__lkppTurnstileLoader__ = new Promise<TurnstileApi>(
    (resolve, reject) => {
      const existingScript = document.getElementById(
        TURNSTILE_SCRIPT_ID,
      ) as HTMLScriptElement | null;

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => {
            if (window.turnstile?.render) {
              resolve(window.turnstile);
            } else {
              reject(
                new Error("Turnstile tidak tersedia setelah script dimuat."),
              );
            }
          },
          { once: true },
        );
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Gagal memuat Turnstile.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.turnstile?.render) {
          resolve(window.turnstile);
        } else {
          reject(new Error("Turnstile tidak tersedia setelah script dimuat."));
        }
      };
      script.onerror = () => reject(new Error("Gagal memuat Turnstile."));
      document.head.appendChild(script);
    },
  );

  return window.__lkppTurnstileLoader__;
}

export function AppTurnstile({
  siteKey,
  action,
  theme = "auto",
  size = "flexible",
  resetKey = 0,
  onTokenChange,
  onError,
}: {
  siteKey: string;
  action?: string;
  theme?: TurnstileTheme;
  size?: TurnstileSize;
  resetKey?: number;
  onTokenChange: (token: string) => void;
  onError?: (message: string) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const widgetIdRef = React.useRef<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    const teardown = () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup failures.
        }
      }
      widgetIdRef.current = null;
      if (container) {
        container.innerHTML = "";
      }
    };

    const mount = async () => {
      setIsLoading(true);
      setErrorMessage("");
      onTokenChange("");

      try {
        const turnstile = await loadTurnstile();
        if (cancelled || !container) {
          return;
        }

        container.innerHTML = "";
        widgetIdRef.current = turnstile.render(container, {
          sitekey: siteKey,
          theme,
          size,
          action,
          retry: "auto",
          "retry-interval": 1500,
          "refresh-expired": "auto",
          "refresh-timeout": "auto",
          callback: (token: string) => {
            if (cancelled) return;
            setErrorMessage("");
            onTokenChange(String(token || "").trim());
          },
          "expired-callback": () => {
            if (cancelled) return;
            onTokenChange("");
            setErrorMessage("Verifikasi keamanan diperbarui. Coba lagi sebentar.");
          },
          "timeout-callback": () => {
            if (cancelled) return;
            onTokenChange("");
            setErrorMessage("Verifikasi keamanan habis waktu. Ulangi lagi.");
          },
          "error-callback": (code?: string) => {
            if (cancelled) return;
            onTokenChange("");
            const nextMessage = code
              ? `Verifikasi keamanan gagal (${code}).`
              : "Verifikasi keamanan gagal.";
            setErrorMessage(nextMessage);
            onError?.(nextMessage);
          },
        });
      } catch (error) {
        if (cancelled) return;
        const nextMessage =
          error instanceof Error
            ? error.message
            : "Gagal memuat verifikasi keamanan.";
        setErrorMessage(nextMessage);
        onError?.(nextMessage);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void mount();

    return () => {
      cancelled = true;
      teardown();
    };
  }, [action, onError, onTokenChange, resetKey, siteKey, size, theme]);

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <ShieldCheck className="size-4" />
        Verifikasi keamanan
      </div>
      <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-border/70 bg-surface-container-low px-4 py-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Memuat verifikasi...
          </div>
        ) : null}
        <div ref={containerRef} className="app-turnstile-slot min-h-[72px] w-full" />
      </div>
      {errorMessage ? (
        <p className="text-xs text-red-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}
