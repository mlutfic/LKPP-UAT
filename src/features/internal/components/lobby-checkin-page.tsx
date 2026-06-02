"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AppPageIntro } from "@/components/composite/app-page-intro";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import {
  AppCard,
  AppCardDescription,
  AppCardTitle,
} from "@/components/ui/app-card";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { getBookingServiceById } from "@/content/service-booking-content";
import { useLiveStaffAppointments } from "@/features/internal/use-live-staff-appointments";
import { useFrontdeskSettings } from "@/features/internal/use-frontdesk-settings";
import { useStaffRolePermissions } from "@/features/internal/use-staff-role-permissions";
import { parseAppointmentQrValue } from "@/features/user/appointment-qr";
import { lobbyCheckin } from "@/lib/api/appointments";
import { isInternalRole } from "@/lib/auth-session";
import { getInternalRoleLabel } from "@/lib/internal-role-policy";
import { readMockSession } from "@/lib/mock-auth";
import {
  formatQueueNumberForDisplay,
  matchesQueueNumberReference,
} from "@/lib/queue-number";
import { STAFF_CANONICAL_ROUTES } from "@/lib/internal-role-policy";

import { LobbyQrScanner } from "./lobby-qr-scanner";

type ScanResult = {
  appointmentId: string;
  queueNumber: string;
  serviceTitle: string;
  unitLabel: string;
  dateLabel: string;
  timeRange: string;
  statusLabel: string;
  sourceLabel: "QR kamera" | "ID manual";
};

type LobbyAppointmentResponse = {
  id?: string;
  queueNumber?: string;
  serviceId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  checkedIn?: boolean;
};

function formatTodayLabel() {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function CheckinField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-surface-container-low px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold leading-6 text-foreground">{value}</p>
    </div>
  );
}

export function LobbyCheckinPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const session = React.useMemo(() => readMockSession(), []);
  const sessionRole =
    session?.variant === "staff" && session.role && isInternalRole(session.role)
      ? session.role
      : undefined;
  const activeRole = sessionRole ?? "resepsionis";
  const roleLabel = sessionRole ? getInternalRoleLabel(sessionRole) : "Petugas";
  const { settings } = useFrontdeskSettings();
  const liveAppointments = useLiveStaffAppointments();
  const permissionQuery = useStaffRolePermissions(activeRole, {
    enabled: Boolean(sessionRole),
  });
  const staffActor = React.useMemo(
    () =>
      session?.authMode === "live" &&
      session?.variant === "staff" &&
      sessionRole &&
      session.staffId
        ? { staffId: session.staffId }
        : undefined,
    [session, sessionRole],
  );
  const canCheckIn = permissionQuery.permissions?.canCheckIn ?? false;
  const hasLiveStaffSession = Boolean(staffActor?.staffId);
  const canOperateCheckIn = hasLiveStaffSession && canCheckIn;
  const [manualValue, setManualValue] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ScanResult | null>(null);

  const todayLabel = React.useMemo(() => formatTodayLabel(), []);
  const autoStartScanner =
    searchParams.get("mode") === "scan" || settings.autoStartScanner;
  const checkinMode = searchParams.get("mode");
  const showCheckinExperience =
    checkinMode === "scan" ||
    checkinMode === "manual" ||
    Boolean(searchParams.get("appointmentId")?.trim()) ||
    Boolean(searchParams.get("reference")?.trim());

  React.useEffect(() => {
    const presetValue =
      searchParams.get("appointmentId")?.trim() ||
      searchParams.get("reference")?.trim() ||
      "";

    if (presetValue) {
      setManualValue(presetValue);
    }
  }, [searchParams]);

  const resolveAppointmentId = React.useCallback(
    (rawValue: string) => {
      const parsed = parseAppointmentQrValue(rawValue);
      const directValue = String(parsed?.appointmentId ?? rawValue).trim();
      const normalizedDirectValue = directValue.toUpperCase();
      const matchingAppointment = liveAppointments.appointments?.find((appointment) => {
        return (
          appointment.id.trim().toUpperCase() === normalizedDirectValue ||
          matchesQueueNumberReference(appointment.queueNumber, normalizedDirectValue) ||
          matchesQueueNumberReference(
            "rawQueueNumber" in appointment ? appointment.rawQueueNumber : "",
            normalizedDirectValue,
          )
        );
      });

      return {
        parsed,
        appointmentId: matchingAppointment?.id ?? directValue,
        queueNumber:
          matchingAppointment?.queueNumber ??
          parsed?.queueNumber ??
          normalizedDirectValue,
      };
    },
    [liveAppointments.appointments],
  );

  const submitCheckin = React.useCallback(async (rawValue: string, sourceLabel: ScanResult["sourceLabel"]) => {
    const { parsed, appointmentId, queueNumber } = resolveAppointmentId(rawValue);

    if (!appointmentId) {
      setErrorMessage("QR atau kode antrean tidak dikenali. Coba scan ulang atau masukkan nomor antrean yang valid.");
      return;
    }

    if (!sessionRole) {
      setErrorMessage("Halaman check-in lobby hanya bisa dipakai oleh akun petugas.");
      return;
    }

    if (!staffActor?.staffId) {
      setErrorMessage(`Masuk sebagai ${roleLabel.toLowerCase()} live terlebih dahulu untuk mencatat check-in.`);
      return;
    }

    if (!canCheckIn) {
      setErrorMessage("Akses check-in belum tersedia pada sesi ini.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await lobbyCheckin(appointmentId, staffActor);
      const responseAppointment =
        response && typeof response === "object" && "appointment" in response
          ? (response.appointment as LobbyAppointmentResponse | undefined)
          : undefined;
      const serviceId = String(responseAppointment?.serviceId || parsed?.serviceId || "").trim().toUpperCase();
      const service = serviceId ? getBookingServiceById(serviceId) : null;
      const dateLabel = String(responseAppointment?.date || parsed?.visitDate || "-").trim() || "-";
      const startTime = String(responseAppointment?.startTime || "").trim();
      const endTime = String(responseAppointment?.endTime || "").trim();
      const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : "-";
      const normalizedStatus = String(responseAppointment?.status || "").trim().toLowerCase();
      const statusLabel =
        responseAppointment?.checkedIn || normalizedStatus === "confirmed"
          ? "Sudah Hadir"
          : normalizedStatus === "calling"
            ? "Dipanggil Unit"
            : normalizedStatus === "in-service"
              ? "Sedang Dilayani"
              : normalizedStatus === "completed"
                ? "Selesai"
                : "Check-in diproses";

      setResult({
        appointmentId: String(responseAppointment?.id || appointmentId).trim(),
        queueNumber: formatQueueNumberForDisplay(
          String(responseAppointment?.queueNumber || queueNumber || appointmentId).trim(),
        ),
        serviceTitle: service?.title ?? "Layanan LKPP",
        unitLabel: service?.unitLabel ?? "Frontdesk LKPP",
        dateLabel,
        timeRange,
        statusLabel,
        sourceLabel,
      });
      if (staffActor?.staffId) {
        await queryClient.invalidateQueries({
          queryKey: ["staff-live-appointments", staffActor.staffId],
        });
      }
      toast.success("Check-in berhasil dicatat.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memproses check-in dari QR.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [canCheckIn, queryClient, resolveAppointmentId, roleLabel, sessionRole, staffActor]);

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitCheckin(manualValue, "ID manual");
  }

  return (
    <DashboardShell
      role={activeRole}
      currentPath={STAFF_CANONICAL_ROUTES.resepsionis.lobby}
      title="Lobby Check-in"
      subtitle="Petugas yang memiliki akses dapat mencatat kehadiran tamu hari ini."
    >
      <div className="space-y-6">
        <AppPageIntro
          eyebrow="Area Frontdesk"
          title={showCheckinExperience ? "Check-in lobby hari ini" : "Operasional lobby hari ini"}
          description={
            showCheckinExperience
              ? `Hari ini, ${todayLabel}. Scan QR atau masukkan nomor antrean untuk mencatat kehadiran tamu sebelum diteruskan ke unit.`
              : `Hari ini, ${todayLabel}. Pilih proses operasional frontdesk yang ingin dijalankan: check-in antrean atau pendaftaran walk-in.`
          }
          actions={
            showCheckinExperience ? (
              <>
                <AppButton
                  variant="outline"
                  onClick={() => router.push(STAFF_CANONICAL_ROUTES.resepsionis.lobby)}
                >
                  Kembali
                </AppButton>
                <AppButton
                  variant="outline"
                  onClick={() => router.push(STAFF_CANONICAL_ROUTES.resepsionis.offlineVisitor)}
                >
                  Daftar Walk-in
                </AppButton>
              </>
            ) : null
          }
        />

        <p className="text-sm leading-6 text-muted-foreground">
          Check-in hari ini akan diteruskan ke unit tujuan setelah diproses.
        </p>

        {!sessionRole ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Halaman ini untuk sesi petugas internal.
          </p>
        ) : null}

        {sessionRole && !hasLiveStaffSession ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Gunakan sesi {roleLabel.toLowerCase()} live untuk memproses check-in.
          </p>
        ) : null}

        {!showCheckinExperience ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <AppCard padding="lg" className="space-y-5">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                  Check-in Antrean
                </p>
                <AppCardTitle className="text-2xl">Tamu sudah booking</AppCardTitle>
                <AppCardDescription>
                  Cari nomor antrean atau scan QR untuk mencatat kehadiran tamu yang sudah memiliki jadwal.
                </AppCardDescription>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <AppButton
                  disabled={!canOperateCheckIn}
                  onClick={() =>
                    router.push(`${STAFF_CANONICAL_ROUTES.resepsionis.lobby}?mode=manual`)
                  }
                >
                  <Search className="size-4" />
                  Input Manual
                </AppButton>
                <AppButton
                  variant="outline"
                  disabled={!canOperateCheckIn}
                  onClick={() =>
                    router.push(`${STAFF_CANONICAL_ROUTES.resepsionis.lobby}?mode=scan`)
                  }
                >
                  <QrCode className="size-4" />
                  Scan QR
                </AppButton>
              </div>
            </AppCard>

            <AppCard padding="lg" className="space-y-5">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                  Daftar Walk-in
                </p>
                <AppCardTitle className="text-2xl">Tamu belum booking</AppCardTitle>
                <AppCardDescription>
                  Buatkan antrean hari ini untuk tamu yang datang langsung ke lobby dan masih punya slot layanan.
                </AppCardDescription>
              </div>

              <AppButton
                disabled={!canOperateCheckIn}
                onClick={() => router.push(STAFF_CANONICAL_ROUTES.resepsionis.offlineVisitor)}
              >
                <UserPlus className="size-4" />
                Buka Form Walk-in
              </AppButton>
            </AppCard>
          </div>
        ) : null}

        {showCheckinExperience ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <AppCard padding="lg" className="space-y-5">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                  Scan QR
                </p>
                <AppCardTitle className="text-2xl">Baca tiket tamu</AppCardTitle>
                <AppCardDescription>
                  Arahkan kamera ke QR antrean untuk mencatat kehadiran dengan cepat.
                </AppCardDescription>
              </div>

              <LobbyQrScanner
                disabled={submitting || !canOperateCheckIn}
                autoStart={autoStartScanner}
                onDetected={(value) => {
                  void submitCheckin(value, "QR kamera");
                }}
              />
            </AppCard>

            <AppCard padding="md" className="space-y-4">
              <div className="space-y-1">
                <AppCardTitle>Input manual</AppCardTitle>
                <AppCardDescription>
                  Tempel QR text atau masukkan nomor antrean jika scan tidak tersedia.
                </AppCardDescription>
              </div>

              <form className="space-y-3" onSubmit={handleManualSubmit}>
                <AppInput
                  value={manualValue}
                  onChange={(event) => setManualValue(event.target.value)}
                  placeholder="Contoh: D12-04-260501-001"
                  autoComplete="off"
                  disabled={!canOperateCheckIn}
                />
                <div className="flex flex-wrap gap-3">
                  <AppButton
                    type="submit"
                    disabled={!manualValue.trim() || submitting || !canOperateCheckIn}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <Search className="size-4" />
                        Proses check-in
                      </>
                    )}
                  </AppButton>
                  <AppButton
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => {
                      setManualValue("");
                      setResult(null);
                      setErrorMessage(null);
                    }}
                  >
                    <RefreshCw className="size-4" />
                    Bersihkan
                  </AppButton>
                </div>
              </form>

              {errorMessage ? (
                <AppNotice icon={AlertCircle} title="Pemindaian belum berhasil" description={errorMessage} tone="danger" />
              ) : null}

              {!canCheckIn ? (
                <AppNotice
                  icon={AlertCircle}
                  title="Akses belum tersedia"
                  description={`Check-in untuk ${roleLabel.toLowerCase()} belum aktif pada sesi ini.`}
                  tone="warning"
                />
              ) : null}
            </AppCard>
          </div>

          <AppCard padding="lg" className="space-y-5 h-fit">
            <div className="space-y-1">
              <AppCardTitle className="text-2xl">Hasil check-in</AppCardTitle>
              <AppCardDescription>
                Ringkasan antrean terakhir yang dibaca dari kamera atau input manual.
              </AppCardDescription>
            </div>

            {result ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 rounded-[24px] bg-surface-container-low px-4 py-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Nomor antrean
                    </p>
                    <p className="font-heading text-4xl font-bold tracking-[-0.04em]">
                      {formatQueueNumberForDisplay(result.queueNumber)}
                    </p>
                  </div>
                  <AppStatusBadge status="aktif" label={result.statusLabel} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CheckinField label="Layanan" value={result.serviceTitle} />
                  <CheckinField label="Lokasi" value={result.unitLabel} />
                  <CheckinField label="Jadwal" value={`${result.dateLabel} • ${result.timeRange}`} />
                  <CheckinField label="Referensi" value={result.appointmentId} />
                </div>

                <div className="rounded-[20px] border border-border bg-surface-container-low px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Sumber input
                  </p>
                  <p className="mt-1.5 text-sm font-semibold leading-6 text-foreground">
                    {result.sourceLabel}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-surface-container-lowest px-5 py-8 text-center">
                <p className="text-sm font-semibold">Belum ada antrean diproses</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Mulai scan QR atau masukkan nomor antrean untuk check-in.
                </p>
              </div>
            )}

            <AppNotice
              icon={AlertCircle}
              title="Tugas petugas lobby"
              description="Petugas yang diberi akses mencatat kehadiran dan meneruskan antrean ke unit. Pemanggilan tetap dilakukan di unit."
            />
          </AppCard>
        </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}
