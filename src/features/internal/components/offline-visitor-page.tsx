"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, QrCode, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppPageIntro } from "@/components/composite/app-page-intro";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { getJakartaTodayKey } from "@/components/ui/app-date-filter";
import { AppFormField } from "@/components/ui/app-form-field";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";
import {
  AppSearchSelect,
  type AppSearchSelectOption,
} from "@/components/ui/app-search-select";
import { AppTextarea } from "@/components/ui/app-textarea";
import {
  AppCard,
  AppCardDescription,
  AppCardTitle,
} from "@/components/ui/app-card";
import {
  bookingServices,
  getBookingServiceById,
} from "@/content/service-booking-content";
import {
  countAvailableSlotsRuntime,
  getNextAvailableSlotRuntime,
} from "@/features/services/legacy-slot-runtime";
import { normalizeBookingRuntimeData } from "@/features/services/runtime-data";
import { useStaffRolePermissions } from "@/features/internal/use-staff-role-permissions";
import { createAppointment, lobbyWalkin } from "@/lib/api/appointments";
import { getInitialData } from "@/lib/api/services";
import { isInternalRole } from "@/lib/auth-session";
import { getInternalRoleLabel } from "@/lib/internal-role-policy";
import { readMockSession } from "@/lib/mock-auth";
import { STAFF_CANONICAL_ROUTES } from "@/lib/internal-role-policy";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";

type OfflineVisitorResult = {
  appointmentId: string;
  queueNumber: string;
  serviceTitle: string;
  unitLabel: string;
  dateLabel: string;
  timeRange: string;
  visitorName: string;
  visitorPhone: string;
};

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateKey}T08:00:00+07:00`));
}

function formatTimeRange(startTime: string, endTime: string) {
  return `${startTime} WIB - ${endTime} WIB`;
}

function SummaryField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] bg-surface-container-low px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold leading-6 text-foreground">{value}</p>
    </div>
  );
}

export function OfflineVisitorPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = React.useMemo(() => readMockSession(), []);
  const sessionRole =
    session?.variant === "staff" && session.role && isInternalRole(session.role)
      ? session.role
      : undefined;
  const activeRole = sessionRole ?? "resepsionis";
  const roleLabel = sessionRole ? getInternalRoleLabel(sessionRole) : "Petugas";
  const permissionQuery = useStaffRolePermissions(activeRole, {
    enabled: Boolean(sessionRole),
  });
  const todayKey = React.useMemo(() => getJakartaTodayKey(), []);
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
  const canCreateWalkIn = hasLiveStaffSession && canCheckIn;

  const [visitorName, setVisitorName] = React.useState("");
  const [visitorPhone, setVisitorPhone] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [complaint, setComplaint] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<OfflineVisitorResult | null>(null);

  const runtimeQuery = useQuery({
    queryKey: [
      "offline-visitor-runtime",
      staffActor?.staffId ?? "anonymous",
      todayKey,
    ],
    enabled: hasLiveStaffSession,
    staleTime: 30_000,
    queryFn: async () => {
      const response = await getInitialData(staffActor);
      return normalizeBookingRuntimeData(response.data);
    },
  });

  const runtimeData = runtimeQuery.data;
  const enabledServiceIds = React.useMemo(() => {
    if (!runtimeData?.services.length) {
      return null;
    }

    return new Set(
      runtimeData.services
        .filter((service) => service.enabled)
        .map((service) => service.id.trim().toUpperCase()),
    );
  }, [runtimeData]);

  const availableServices = React.useMemo(() => {
    return bookingServices.filter((service) =>
      enabledServiceIds ? enabledServiceIds.has(service.id) : true,
    );
  }, [enabledServiceIds]);

  const serviceOptions = React.useMemo<AppSearchSelectOption[]>(
    () =>
      availableServices.map((service) => ({
        value: service.id,
        label: service.title,
        keywords: [
          service.id,
          service.unitLabel,
          service.groupLabel,
          service.officialName,
          service.description,
        ],
      })),
    [availableServices],
  );

  const selectedService = React.useMemo(
    () => (serviceId ? getBookingServiceById(serviceId) : null),
    [serviceId],
  );

  const nextSlot =
    serviceId && runtimeData
      ? getNextAvailableSlotRuntime(
          serviceId,
          todayKey,
          runtimeData.services,
          runtimeData.appointments,
          runtimeData.settings,
          runtimeData.unorConfigs,
        )
      : null;

  const remainingSlots =
    serviceId && runtimeData
      ? countAvailableSlotsRuntime(
          serviceId,
          todayKey,
          runtimeData.services,
          runtimeData.appointments,
          runtimeData.settings,
          runtimeData.unorConfigs,
        )
      : 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionRole) {
      toast.error("Halaman walk-in hanya bisa dipakai oleh akun petugas.");
      return;
    }

    if (!staffActor?.staffId) {
      toast.error(`Masuk sebagai ${roleLabel.toLowerCase()} live terlebih dahulu.`);
      return;
    }

    if (!canCheckIn) {
      toast.error(`Akses walk-in belum tersedia untuk ${roleLabel.toLowerCase()}.`);
      return;
    }

    if (!visitorName.trim()) {
      toast.error("Nama tamu wajib diisi.");
      return;
    }

    if (!visitorPhone.trim()) {
      toast.error("Nomor HP tamu wajib diisi.");
      return;
    }

    if (!serviceId.trim()) {
      toast.error("Pilih layanan terlebih dahulu.");
      return;
    }

    if (!selectedService || !nextSlot) {
      toast.error("Slot layanan hari ini belum tersedia.");
      return;
    }

    setSubmitting(true);
    try {
      const walkInResult = await lobbyWalkin(
        {
          name: visitorName.trim(),
          phone: visitorPhone.trim(),
          serviceId,
          complaint: complaint.trim() || "Walk-in",
        },
        staffActor,
      );

      const bookingResult = await createAppointment({
        userId: walkInResult.userId,
        serviceId,
        date: todayKey,
        startTime: nextSlot.startTime,
        endTime: nextSlot.endTime,
        complaint: complaint.trim() || "Walk-in",
        jumlahTamu: 1,
        isWalkIn: true,
        institutionName: "Walk-in Frontdesk",
        asalInstansi: "Walk-in Frontdesk",
      });

      const appointment = bookingResult.appointment;
      const queueNumber =
        typeof appointment?.queueNumber === "string" && appointment.queueNumber.trim()
          ? appointment.queueNumber.trim()
          : serviceId;
      const appointmentId =
        typeof appointment?.id === "string" && appointment.id.trim()
          ? appointment.id.trim()
          : queueNumber;

      setResult({
        appointmentId,
        queueNumber,
        serviceTitle: selectedService.title,
        unitLabel: selectedService.unitLabel,
        dateLabel: formatDateLabel(todayKey),
        timeRange: formatTimeRange(nextSlot.startTime, nextSlot.endTime),
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim(),
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff-live-appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["booking-runtime-data"] }),
        queryClient.invalidateQueries({ queryKey: ["offline-visitor-runtime"] }),
      ]);

      toast.success("Walk-in berhasil didaftarkan.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal mendaftarkan walk-in.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell
      role={activeRole}
      currentPath={STAFF_CANONICAL_ROUTES.resepsionis.offlineVisitor}
      title="Daftar Walk-in"
      subtitle="Daftarkan tamu yang datang langsung ke lobby hari ini"
    >
      <div className="space-y-6">
        <AppPageIntro
          eyebrow="Area Frontdesk"
          title="Daftar walk-in hari ini"
          description="Gunakan halaman ini untuk mencatat tamu yang belum booking, lalu terbitkan antrean hari ini ke layanan yang masih punya slot."
          actions={
            <>
              <AppButton
                variant="outline"
                onClick={() => router.push(STAFF_CANONICAL_ROUTES[activeRole].dashboard)}
              >
                Dashboard
              </AppButton>
              <AppButton
                onClick={() =>
                  router.push(`${STAFF_CANONICAL_ROUTES.resepsionis.lobby}?mode=scan`)
                }
              >
                <QrCode className="size-4" />
                Check-in Lobby
              </AppButton>
            </>
          }
        />

        {!sessionRole ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Halaman ini untuk sesi petugas internal.
          </p>
        ) : null}

        {sessionRole && !hasLiveStaffSession ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Gunakan sesi {roleLabel.toLowerCase()} live untuk membuat walk-in.
          </p>
        ) : null}

        {hasLiveStaffSession && !canCheckIn ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Akses walk-in belum tersedia pada sesi ini.
          </p>
        ) : null}

        {runtimeQuery.isError ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Slot hari ini belum bisa dimuat.
          </p>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <AppCard padding="lg" className="space-y-5">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                Form Walk-in
              </p>
              <AppCardTitle className="text-2xl">Data tamu dan layanan</AppCardTitle>
              <AppCardDescription>
                Pilih layanan yang masih tersedia hari ini, lalu sistem akan menerbitkan antrean untuk tamu yang datang langsung.
              </AppCardDescription>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <AppFormField label="Nama Tamu" density="compact" labelTone="quiet">
                <AppInput
                  value={visitorName}
                  onChange={(event) => setVisitorName(event.target.value)}
                  placeholder="Nama lengkap tamu"
                  autoComplete="name"
                  disabled={!canCreateWalkIn}
                />
              </AppFormField>

              <AppFormField label="Nomor HP" density="compact" labelTone="quiet">
                <AppInput
                  value={visitorPhone}
                  onChange={(event) => setVisitorPhone(event.target.value)}
                  placeholder="08xxxxxxxxxx"
                  autoComplete="tel"
                  inputMode="tel"
                  disabled={!canCreateWalkIn}
                />
              </AppFormField>

              <AppFormField label="Layanan" density="compact" labelTone="quiet">
                <AppSearchSelect
                  value={serviceId}
                  onValueChange={setServiceId}
                  options={serviceOptions}
                  placeholder="Pilih layanan hari ini"
                  searchPlaceholder="Cari layanan atau unit"
                  emptyMessage="Layanan tidak ditemukan."
                  disabled={!canCreateWalkIn}
                />
              </AppFormField>

              <AppFormField
                label="Keperluan"
                density="compact"
                labelTone="quiet"
                description="Opsional. Catat ringkas kebutuhan tamu bila perlu."
              >
                <AppTextarea
                  value={complaint}
                  onChange={(event) => setComplaint(event.target.value)}
                  placeholder="Contoh: perlu pendampingan katalog elektronik"
                  rows={4}
                  disabled={!canCreateWalkIn}
                />
              </AppFormField>

              <div className="flex flex-wrap gap-3">
                <AppButton
                  type="submit"
                  loading={submitting}
                  loadingLabel="Mendaftarkan..."
                  disabled={!canCreateWalkIn || !selectedService || !nextSlot}
                >
                  <UserPlus className="size-4" />
                  Daftarkan walk-in
                </AppButton>
                <AppButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setVisitorName("");
                    setVisitorPhone("");
                    setServiceId("");
                    setComplaint("");
                    setResult(null);
                  }}
                >
                  Bersihkan
                </AppButton>
              </div>
            </form>
          </AppCard>

          <div className="space-y-6">
            <AppCard padding="lg" className="space-y-4">
              <div className="space-y-1">
                <AppCardTitle className="text-2xl">Slot hari ini</AppCardTitle>
                <AppCardDescription>
                  Ringkasan slot layanan yang akan dipakai untuk tamu walk-in hari ini.
                </AppCardDescription>
              </div>

              {selectedService ? (
                <div className="space-y-4">
                  <SummaryField label="Layanan" value={selectedService.title} />
                  <SummaryField label="Direktorat / Unit" value={selectedService.unitLabel} />
                  <SummaryField label="Tanggal" value={formatDateLabel(todayKey)} />
                  <SummaryField
                    label="Slot Berikutnya"
                    value={
                      nextSlot
                        ? formatTimeRange(nextSlot.startTime, nextSlot.endTime)
                        : "Belum ada slot hari ini"
                    }
                  />
                  <SummaryField
                    label="Sisa Slot"
                    value={selectedService ? `${remainingSlots} slot` : "-"}
                  />
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-surface-container-lowest px-5 py-8 text-center">
                  <p className="text-sm font-semibold">Pilih layanan terlebih dahulu</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Setelah layanan dipilih, slot hari ini akan muncul di panel ini.
                  </p>
                </div>
              )}

              {selectedService && !nextSlot ? (
                <AppNotice
                  icon={AlertCircle}
                  title="Jadwal layanan hari ini penuh"
                  description="Pilih layanan lain atau arahkan tamu ke jadwal kunjungan berikutnya."
                  tone="warning"
                />
              ) : null}
            </AppCard>

            <AppCard padding="lg" className="space-y-4">
              <div className="space-y-1">
                <AppCardTitle className="text-2xl">Hasil pendaftaran</AppCardTitle>
                <AppCardDescription>
                  Tampilkan nomor antrean yang baru diterbitkan setelah walk-in berhasil.
                </AppCardDescription>
              </div>

              {result ? (
                <div className="space-y-4">
                  <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Nomor antrean
                    </p>
                    <p className="mt-2 font-heading text-4xl font-bold tracking-[-0.04em] text-foreground">
                      {formatQueueNumberForDisplay(result.queueNumber)}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <SummaryField label="Tamu" value={result.visitorName} />
                    <SummaryField label="Nomor HP" value={result.visitorPhone} />
                    <SummaryField label="Layanan" value={result.serviceTitle} />
                    <SummaryField label="Unit" value={result.unitLabel} />
                    <SummaryField label="Jadwal" value={`${result.dateLabel} • ${result.timeRange}`} />
                    <SummaryField label="Referensi" value={result.appointmentId} />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <AppButton
                      variant="outline"
                      onClick={() => router.push(STAFF_CANONICAL_ROUTES.resepsionis.lobby)}
                    >
                      <QrCode className="size-4" />
                      Ke Check-in Lobby
                    </AppButton>
                    <AppButton
                      onClick={() => router.push(STAFF_CANONICAL_ROUTES[activeRole].dashboard)}
                    >
                      Lihat Dashboard
                    </AppButton>
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-surface-container-lowest px-5 py-8 text-center">
                  <p className="text-sm font-semibold">Belum ada walk-in dibuat</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Setelah berhasil didaftarkan, nomor antrean baru akan tampil di sini.
                  </p>
                </div>
              )}
            </AppCard>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
