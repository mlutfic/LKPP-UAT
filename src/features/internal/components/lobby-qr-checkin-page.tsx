"use client";

import * as React from "react";
import {
  CheckCircle2,
  ClipboardPenLine,
  Loader2,
  QrCode,
  ScanLine,
} from "lucide-react";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from "@/components/ui/app-card";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";
import { lobbyCheckin } from "@/lib/api/appointments";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";

import { LobbyQrScanner } from "./lobby-qr-scanner";

type ParsedQrPayload = {
  appointmentId: string;
  source: "json" | "raw";
  rawValue: string;
};

type LobbyResultState = {
  status: "idle" | "success" | "error";
  title?: string;
  description?: string;
  appointment?: {
    id?: string;
    queueNumber?: string;
    startTime?: string;
    endTime?: string;
    status?: string;
    checkedInAt?: string;
  };
};

function parseAppointmentInput(value: string): ParsedQrPayload {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Masukkan QR text atau ID antrean terlebih dahulu.");
  }

  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as {
      appointmentId?: unknown;
    };

    if (typeof parsed.appointmentId === "string" && parsed.appointmentId.trim()) {
      return {
        appointmentId: parsed.appointmentId.trim(),
        source: "json",
        rawValue: trimmed,
      };
    }

    throw new Error("QR tidak memuat appointmentId yang valid.");
  }

  return {
    appointmentId: trimmed,
    source: "raw",
    rawValue: trimmed,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Check-in gagal diproses. Coba ulangi atau gunakan ID antrean secara manual.";
}

function getAppointmentSummary(data: unknown): LobbyResultState["appointment"] {
  if (!data || typeof data !== "object") {
    return undefined;
  }

  const appointment = data as Record<string, unknown>;

  return {
    id: typeof appointment.id === "string" ? appointment.id : undefined,
    queueNumber:
      typeof appointment.queueNumber === "string" ? appointment.queueNumber : undefined,
    startTime:
      typeof appointment.startTime === "string" ? appointment.startTime : undefined,
    endTime: typeof appointment.endTime === "string" ? appointment.endTime : undefined,
    status: typeof appointment.status === "string" ? appointment.status : undefined,
    checkedInAt:
      typeof appointment.checkedInAt === "string" ? appointment.checkedInAt : undefined,
  };
}

export function LobbyQrCheckinPage() {
  const [inputValue, setInputValue] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [lastParsed, setLastParsed] = React.useState<ParsedQrPayload | null>(null);
  const [result, setResult] = React.useState<LobbyResultState>({
    status: "idle",
  });

  const handleSubmit = React.useCallback(
    async (value: string) => {
      setIsSubmitting(true);

      try {
        const parsed = parseAppointmentInput(value);
        setLastParsed(parsed);

        const response = await lobbyCheckin(parsed.appointmentId);
        const responseObject =
          response && typeof response === "object"
            ? (response as Record<string, unknown>)
            : null;

        const message =
          responseObject && typeof responseObject.message === "string"
            ? responseObject.message
            : "Check-in berhasil dicatat.";

        const appointmentSummary = getAppointmentSummary(
          responseObject ? responseObject.appointment : undefined,
        );

        setResult({
          status: "success",
          title: "Check-in berhasil",
          description: message,
          appointment: appointmentSummary,
        });
      } catch (error) {
        setResult({
          status: "error",
          title: "Check-in belum berhasil",
          description: getErrorMessage(error),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const handleManualSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleSubmit(inputValue);
  };

  const handleDetected = React.useCallback(
    async (value: string) => {
      setInputValue(value);
      await handleSubmit(value);
    },
    [handleSubmit],
  );

  return (
    <DashboardShell
      role="resepsionis"
      currentPath="/lobby"
      title="Check-in Lobby"
      subtitle="Scan QR atau masukkan ID antrean untuk check-in tamu."
    >
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Check-in Lobby
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Gunakan kamera untuk scan QR tiket tamu, atau tempel QR text dan ID antrean jika perlu.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-6">
            <AppCard padding="lg">
              <AppCardHeader>
              <AppCardTitle className="flex items-center gap-2 text-2xl">
                  <QrCode className="size-5 text-role-accent" />
                  Scan QR
                </AppCardTitle>
                <AppCardDescription>
                  Arahkan kamera ke QR antrean. Halaman ini hanya membaca tiket lalu mencatat check-in.
                </AppCardDescription>
              </AppCardHeader>
              <AppCardContent>
                <LobbyQrScanner
                  disabled={isSubmitting}
                  onDetected={(value) => {
                    void handleDetected(value);
                  }}
                />
              </AppCardContent>
            </AppCard>

            <AppCard padding="lg">
              <AppCardHeader>
              <AppCardTitle className="flex items-center gap-2 text-2xl">
                  <ClipboardPenLine className="size-5 text-role-accent" />
                  Input Manual
                </AppCardTitle>
                <AppCardDescription>
                  Tempel QR text penuh atau masukkan ID antrean jika scan tidak tersedia.
                </AppCardDescription>
              </AppCardHeader>
              <AppCardContent>
                <form className="space-y-4" onSubmit={handleManualSubmit}>
                  <AppInput
                    value={inputValue}
                    onChange={(event) => setInputValue(event.currentTarget.value)}
                    placeholder='Contoh: {"appointmentId":"apt-123"} atau apt-123'
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <div className="flex flex-wrap gap-3">
                    <AppButton type="submit" disabled={isSubmitting || !inputValue.trim()}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <ScanLine className="size-4" />
                          Proses check-in
                        </>
                      )}
                    </AppButton>
                    <AppButton
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => {
                        setInputValue("");
                        setLastParsed(null);
                        setResult({ status: "idle" });
                      }}
                    >
                      Bersihkan
                    </AppButton>
                  </div>
                </form>
              </AppCardContent>
            </AppCard>
          </div>

          <AppCard padding="lg" className="h-fit">
            <AppCardHeader>
              <AppCardTitle className="text-2xl">Hasil Check-in</AppCardTitle>
              <AppCardDescription>
                Ringkasan hasil scan atau input manual akan muncul di sini.
              </AppCardDescription>
            </AppCardHeader>
            <AppCardContent>
              {result.status === "idle" ? (
                <AppNotice
                  icon={QrCode}
                  title="Belum ada hasil check-in"
                  description="Hasil check-in akan tampil setelah QR atau ID dikenali."
                />
              ) : null}

              {result.status === "error" ? (
                <AppNotice
                  icon={ClipboardPenLine}
                  title={result.title ?? "Check-in belum berhasil"}
                  description={result.description ?? "Coba gunakan QR text atau ID antrean yang benar."}
                  tone="danger"
                />
              ) : null}

              {result.status === "success" ? (
                <div className="space-y-4">
                  <AppNotice
                    icon={CheckCircle2}
                    title={result.title ?? "Check-in berhasil"}
                    description={result.description ?? "Kehadiran tamu sudah tercatat."}
                  />

                  {result.appointment ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Nomor antrean
                        </p>
                        <p className="mt-2 text-xl font-bold text-foreground">
                          {formatQueueNumberForDisplay(result.appointment.queueNumber ?? "-")}
                        </p>
                      </div>
                      <div className="rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Status
                        </p>
                        <p className="mt-2 text-base font-semibold text-foreground">
                          {result.appointment.status ?? "checked-in"}
                        </p>
                      </div>
                      <div className="rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Slot layanan
                        </p>
                        <p className="mt-2 text-base font-semibold text-foreground">
                          {result.appointment.startTime && result.appointment.endTime
                            ? `${result.appointment.startTime} - ${result.appointment.endTime}`
                            : "-"}
                        </p>
                      </div>
                      <div className="rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          ID antrean
                        </p>
                        <p className="mt-2 truncate text-sm font-medium text-foreground">
                          {result.appointment.id ?? lastParsed?.appointmentId ?? "-"}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {lastParsed ? (
                    <div className="rounded-[var(--radius-xl)] border border-border bg-surface-container-low px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Sumber input
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {lastParsed.source === "json" ? "QR text" : "ID manual"}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </AppCardContent>
          </AppCard>
        </div>
      </div>
    </DashboardShell>
  );
}
