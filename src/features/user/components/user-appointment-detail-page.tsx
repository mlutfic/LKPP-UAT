"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  BellRing,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LifeBuoy,
  Loader2,
  MapPin,
  MessageSquare,
  Tag,
  Ticket,
  UsersRound,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppBadge } from "@/components/ui/app-badge";
import { AppButton } from "@/components/ui/app-button";
import {
  AppCard,
  AppCardDescription,
  AppCardTitle,
} from "@/components/ui/app-card";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppNotice } from "@/components/ui/app-notice";
import { AppQrTicket } from "@/components/ui/app-qr-ticket";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import {
  getUserAppointmentPresentation,
  userAppointmentStatusMeta,
  type UserAppointmentStatus,
} from "@/content/user-appointments-content";
import { buildAppointmentQrValue } from "@/features/user/appointment-qr";
import { parseBookingDraftData } from "@/features/services/booking-draft";
import { useLiveUserAppointments } from "@/features/user/use-live-user-appointments";
import { cancelAppointment } from "@/lib/api/appointments";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";

const USER_PROGRESS_STEPS: Array<{
  status: UserAppointmentStatus;
  label: string;
  icon: typeof Ticket;
}> = [
  { status: "booked", label: "Terjadwal", icon: Ticket },
  { status: "confirmed", label: "Sudah Hadir", icon: CheckCircle2 },
  { status: "escalated", label: "Dieskalasi", icon: BellRing },
  { status: "calling", label: "Dipanggil Unit", icon: BellRing },
  { status: "in-service", label: "Dilayani Unit", icon: UserRound },
  { status: "completed", label: "Selesai", icon: Check },
];

type DetailPresentation = NonNullable<
  ReturnType<typeof getUserAppointmentPresentation>
> & {
  headingEyebrow: string;
  headingTitle: string;
  headingDescription: string;
};

function buildConfirmationPreview(
  params: Record<string, string | undefined>,
): DetailPresentation | null {
  const draft = parseBookingDraftData(params);
  if (!draft) {
    return null;
  }

  return {
    id: draft.queueNumber,
    queueNumber: formatQueueNumberForDisplay(draft.queueNumber),
    rawQueueNumber: draft.queueNumber,
    serviceId: draft.service.id,
    applicantCategory: draft.applicantCategory,
    institutionName: draft.institutionName,
    date: draft.dateKey,
    dateLabel: draft.dateLabel,
    timeRange: draft.timeRange,
    status: "booked",
    serviceTopic: draft.serviceTopic,
    complaint: draft.complaint,
    guestCount: draft.guestCount,
    asalInstansi: draft.asalInstansi,
    location: `Frontdesk LKPP → ${draft.service.unitLabel}`,
    checkedIn: false,
    callCount: 0,
    autoCancelled: false,
    canCancel: true,
    summaryNote: "Antrian sudah tersimpan. Hadir sesuai jadwal untuk konfirmasi kehadiran di frontdesk.",
    activityLog: [
      "Antrian tersimpan sesuai layanan yang dipilih.",
      "Tanggal kunjungan sudah dicadangkan sesuai kapasitas harian.",
      "Silakan hadir sesuai jadwal untuk proses check-in.",
    ],
    preparationChecklist: draft.service.preparationNotes,
    serviceTitle: draft.service.title,
    serviceOfficialName: draft.service.officialName,
    serviceGroupLabel: draft.service.groupLabel,
    unitLabel: draft.service.unitLabel,
    headingEyebrow: "Detail Antrian",
    headingTitle: draft.service.title,
    headingDescription:
      "Antrian berhasil tersimpan dan siap dipantau dari jadwal aktif Anda.",
  };
}

function getGradientClass(serviceId: string) {
  const seed = serviceId
    .split("")
    .reduce((total, value) => total + value.charCodeAt(0), 0);

  const gradients = [
    "from-red-600 via-red-500 to-orange-400",
    "from-rose-600 via-red-500 to-amber-400",
    "from-amber-600 via-red-500 to-rose-500",
  ] as const;

  return gradients[seed % gradients.length];
}

const DEFAULT_SP4N_URL = "https://www.lapor.go.id/";

function markAppointmentCancelledInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  appointmentId: string,
) {
  queryClient.setQueryData<Record<string, unknown> | undefined>(
    ["user-live-appointments", userId],
    (currentValue) => {
      if (!currentValue || !Array.isArray(currentValue.appointments)) {
        return currentValue;
      }

      return {
        ...currentValue,
        appointments: currentValue.appointments.map((entry) => {
          if (!entry || typeof entry !== "object") {
            return entry;
          }

          const record = entry as Record<string, unknown>;
          const entryId = typeof record.id === "string" ? record.id.trim() : "";
          const queueNumber =
            typeof record.queueNumber === "string" ? record.queueNumber.trim() : "";

          if (entryId !== appointmentId && queueNumber !== appointmentId) {
            return entry;
          }

          return {
            ...record,
            status: "cancelled",
            autoCancelled: false,
          };
        }),
      };
    },
  );
}

export function UserAppointmentDetailPage({
  appointmentId,
  draftSearchParams,
}: {
  appointmentId: string;
  draftSearchParams?: Record<string, string | undefined>;
}) {
  const queryClient = useQueryClient();
  const live = useLiveUserAppointments();
  const isPreviewBooking = draftSearchParams?.preview === "booking";
  const staticAppointment =
    !isPreviewBooking ? getUserAppointmentPresentation(appointmentId) : null;
  const liveAppointment =
    !isPreviewBooking
      ? live.appointments?.find((entry) => entry.id === appointmentId)
      : null;
  const baseAppointment =
    isPreviewBooking
      ? buildConfirmationPreview(draftSearchParams ?? {})
      : (() => {
          const presentation = live.isLiveSession
            ? liveAppointment
            : liveAppointment ?? staticAppointment;
          if (!presentation) {
            return null;
          }

          return {
            ...presentation,
            headingEyebrow: "Detail Antrian",
            headingTitle: presentation.serviceTitle,
            headingDescription: presentation.summaryNote,
          };
        })();

  const [statusOverride, setStatusOverride] =
    React.useState<UserAppointmentStatus | null>(null);
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);

  const appointment = React.useMemo(() => {
    if (!baseAppointment) {
      return null;
    }

    if (!statusOverride) {
      return baseAppointment;
    }

    return {
      ...baseAppointment,
      status: statusOverride,
      canCancel: false,
      summaryNote:
        statusOverride === "cancelled"
          ? "Antrian telah dibatalkan dari halaman detail."
          : baseAppointment.summaryNote,
      activityLog:
        statusOverride === "cancelled"
          ? [...baseAppointment.activityLog, "Antrian dibatalkan oleh pengguna."]
          : baseAppointment.activityLog,
    };
  }, [baseAppointment, statusOverride]);
  const displayQueueNumber = appointment
    ? formatQueueNumberForDisplay(appointment.queueNumber)
    : "";
  const liveAppointmentId = appointment?.id ?? "";
  const liveUserId = live.session?.userId ?? "";
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!live.isLiveSession || !liveUserId || !liveAppointmentId) {
        return;
      }

      await cancelAppointment(liveAppointmentId, { userId: liveUserId });
      markAppointmentCancelledInCache(queryClient, liveUserId, liveAppointmentId);
      await queryClient.invalidateQueries({
        queryKey: ["user-live-appointments", liveUserId],
      });
    },
    onSuccess: () => {
      setStatusOverride("cancelled");
      setShowCancelDialog(false);
      toast.success("Antrian berhasil dibatalkan.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Antrian belum berhasil dibatalkan.",
      );
    },
  });

  if (!appointment) {
    if (live.isLiveSession && live.isLoading) {
      return (
        <DashboardShell
          role="user"
          currentPath="/jadwal-saya"
          title="Detail Antrian"
          subtitle="Memuat detail antrian Anda."
        >
          <div className="mx-auto max-w-3xl">
            <AppCard padding="lg" className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                Detail Antrian
              </p>
              <p className="text-lg font-semibold">Memuat data antrian...</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Kami sedang mengambil detail tiket terbaru dari sistem layanan.
              </p>
            </AppCard>
          </div>
        </DashboardShell>
      );
    }

    return (
      <DashboardShell
        role="user"
        currentPath="/jadwal-saya"
        title="Detail Antrian"
        subtitle="Detail antrian belum ditemukan."
      >
        <div className="mx-auto max-w-3xl">
          <AppEmptyState
            icon={Ticket}
            title="Detail antrian belum tersedia"
            description={
              live.isLiveSession
                ? "Data antrian live belum masuk atau tiket ini tidak ditemukan lagi."
                : "Antrian yang Anda buka tidak ditemukan."
            }
            actionLabel="Kembali ke antrian"
            actionHref="/jadwal-saya"
          />
        </div>
      </DashboardShell>
    );
  }

  const statusMeta = userAppointmentStatusMeta[appointment.status];
  const currentStepIndex = USER_PROGRESS_STEPS.findIndex(
    (step) => step.status === appointment.status,
  );
  const isCompleted = appointment.status === "completed";
  const isUnprocessed = appointment.status === "unprocessed";
  const isCancelled = appointment.status === "cancelled";
  const isNoShow = appointment.status === "no-show";
  const isAutoCancelled = Boolean(appointment.autoCancelled);
  const callCount = Math.max(appointment.callCount ?? 0, 0);
  const isRepeatCalling = appointment.status === "calling" && callCount > 1;
  const isRequeuedAfterMissedCall =
    callCount > 0 && ["booked", "confirmed", "escalated"].includes(appointment.status);
  const canCancel =
    Boolean(appointment.canCancel) && !isCancelled && !isNoShow && !isUnprocessed;

  function handleCancelAppointment() {
    if (isPreviewBooking || !live.isLiveSession) {
      setStatusOverride("cancelled");
      setShowCancelDialog(false);
      toast.success("Antrian berhasil dibatalkan.");
      return;
    }

    cancelMutation.mutate();
  }

  function handleOpenRating() {
    const target = process.env.NEXT_PUBLIC_STAFF_RATING_URL?.trim();
    if (!target) {
      toast.info("Tautan survei kepuasan akan disambungkan saat integrasi live diaktifkan.");
      return;
    }

    const normalized = /^https?:\/\//i.test(target) ? target : `https://${target}`;
    window.open(normalized, "_blank", "noopener,noreferrer");
  }

  function handleOpenSp4n() {
    const target = process.env.NEXT_PUBLIC_SP4N_LAPOR_URL?.trim() || DEFAULT_SP4N_URL;
    const normalized = /^https?:\/\//i.test(target) ? target : `https://${target}`;
    window.open(normalized, "_blank", "noopener,noreferrer");
  }

  return (
    <DashboardShell
      role="user"
      currentPath="/jadwal-saya"
      title="Detail Antrian"
      subtitle={appointment.headingDescription}
    >
      <div className="max-w-4xl space-y-5">
        <div className="flex flex-wrap justify-end gap-3">
          <Link href="/jadwal-saya">
            <AppButton variant="outline">Kembali</AppButton>
          </Link>
          {!isPreviewBooking ? (
            <Link href="/bantuan">
              <AppButton>Bantuan</AppButton>
            </Link>
          ) : null}
        </div>

        {appointment.status === "calling" ? (
          <AppNotice
            icon={BellRing}
            title={isRepeatCalling ? `Panggilan ke-${callCount}` : "Giliran Anda"}
            description={
              isRepeatCalling
                ? "Nomor antrian Anda dipanggil kembali. Silakan segera menuju unit terkait."
                : "Nomor antrian Anda sedang dipanggil. Silakan segera menuju unit terkait."
            }
          />
        ) : null}

        {appointment.status === "escalated" ? (
          <AppNotice
            icon={BellRing}
            title="Antrian sedang diteruskan"
            description="Petugas unit sedang meneruskan antrian Anda ke layanan lanjutan level 2. Pantau halaman ini untuk pembaruan berikutnya."
          />
        ) : null}

        <AppCard padding="md" className="space-y-4 overflow-hidden">
          <div className={`-mx-5 -mt-5 h-1 bg-gradient-to-r ${getGradientClass(appointment.serviceId)}`} />
          <div className="space-y-3 pt-4">
            <div className="space-y-2">
              <AppBadge tone="role">{appointment.serviceGroupLabel}</AppBadge>
              <div className="space-y-1">
                <p className="text-lg font-semibold">{appointment.serviceTitle}</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {appointment.unitLabel}
                </p>
              </div>
            </div>

            <div className="grid gap-4 rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-4 md:grid-cols-[minmax(0,1fr)_140px] md:items-center">
              <div className="text-center md:text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Nomor Antrian
                </p>
                <p className="mt-2 break-all font-heading text-3xl font-bold tracking-[-0.04em] sm:text-4xl md:text-5xl">
                  {displayQueueNumber}
                </p>
                <div className="mt-3 flex justify-center md:justify-start">
                  <AppStatusBadge
                    status={statusMeta.badgeStatus}
                    label={statusMeta.label}
                  />
                </div>
              </div>
              <div className="flex justify-center md:justify-end">
                <AppQrTicket
                  value={buildAppointmentQrValue({
                    id: appointment.id,
                    qrToken: appointment.qrToken,
                    queueNumber: appointment.rawQueueNumber || appointment.queueNumber,
                    serviceId: appointment.serviceId,
                    date: appointment.date,
                  })}
                  size={78}
                  label="QR Antrian"
                  subtle
                  ticketNumber={displayQueueNumber}
                  hideLabel
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailInfoCell
                icon={CalendarDays}
                label="Tanggal"
                value={appointment.dateLabel}
              />
              <DetailInfoCell
                icon={Clock3}
                label="Estimasi Waktu"
                value={appointment.timeRange}
              />
              <DetailInfoCell
                icon={UsersRound}
                label="Jumlah Tamu"
                value={`${appointment.guestCount} orang`}
              />
              <DetailInfoCell
                icon={MapPin}
                label="Lokasi"
                value={appointment.location}
              />
            </div>

            {appointment.applicantCategory ||
            appointment.institutionName ||
            appointment.serviceTopic ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {appointment.applicantCategory ? (
                  <DetailInfoCell
                    icon={UsersRound}
                    label="Kategori Instansi"
                    value={appointment.applicantCategory}
                  />
                ) : null}
                {appointment.serviceTopic ? (
                  <DetailInfoCell
                    icon={Tag}
                    label="Topik Layanan"
                    value={appointment.serviceTopic}
                  />
                ) : null}
                {appointment.institutionName ? (
                  <div className="sm:col-span-2">
                    <DetailInfoCell
                      icon={Building2}
                      label="Nama Instansi"
                      value={appointment.institutionName}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {["booked", "confirmed", "escalated", "calling", "in-service"].includes(
              appointment.status,
            ) ? (
              <AppNotice
                icon={Clock3}
                title="Datang 15 menit lebih awal"
                description="Lakukan check-in di frontdesk sebelum jam layanan dimulai."
              />
            ) : null}

            {isRepeatCalling || isRequeuedAfterMissedCall ? (
              <div className="flex flex-wrap gap-2">
                {isRepeatCalling ? (
                  <StatePill label={`Panggilan ke-${callCount}`} tone="info" />
                ) : null}
                {isRequeuedAfterMissedCall ? (
                  <StatePill label="Dijadwalkan ulang" tone="warning" />
                ) : null}
              </div>
            ) : null}

            <div className="rounded-[var(--radius-2xl)] bg-surface-container-low px-5 py-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="size-4" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                  Keluhan / kebutuhan
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {appointment.complaint}
              </p>
            </div>
          </div>
        </AppCard>

        {!isCancelled && !isNoShow && !isUnprocessed ? (
          <AppCard padding="md" className="space-y-4">
            <AppCardTitle>Progres layanan</AppCardTitle>
            <div className="space-y-4">
              {USER_PROGRESS_STEPS.map((step, index) => {
                const active = index === currentStepIndex;
                const complete = index < currentStepIndex;
                const StepIcon = step.icon;

                return (
                  <div key={step.status} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex size-9 items-center justify-center rounded-full border ${
                          active
                            ? "border-role-accent bg-role-accent-soft text-role-accent"
                            : complete
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-border bg-surface-container-low text-muted-foreground"
                        }`}
                      >
                        <StepIcon className="size-4" />
                      </div>
                      {index < USER_PROGRESS_STEPS.length - 1 ? (
                        <div
                          className={`mt-2 h-7 w-px ${
                            complete ? "bg-emerald-300" : "bg-border"
                          }`}
                        />
                      ) : null}
                    </div>
                    <div className="space-y-1 pb-2">
                      <p className={`font-semibold ${active ? "text-role-accent" : ""}`}>
                        {step.label}
                      </p>
                      {step.status === appointment.status ? (
                        <p className="text-sm leading-6 text-muted-foreground">
                          {statusMeta.note}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </AppCard>
        ) : null}

        {isRequeuedAfterMissedCall ? (
          <AppNotice
            icon={Clock3}
            tone="warning"
            title="Antrian dijadwalkan ulang"
            description="Anda tidak hadir pada panggilan sebelumnya. Periksa kembali jadwal terbaru pada tiket ini."
          />
        ) : null}

        {isUnprocessed ? (
          <AppNotice
            icon={XCircle}
            tone="warning"
            title="Antrean tidak diproses"
            description="Hari layanan sudah berganti sebelum antrean ini selesai diproses, sehingga tiket dipindahkan otomatis ke riwayat."
          />
        ) : null}

        {isCancelled || isNoShow ? (
          <AppNotice
            icon={XCircle}
            tone="warning"
            title={isCancelled ? "Antrian dibatalkan" : "Tidak hadir"}
            description={
              isCancelled
                ? isAutoCancelled
                  ? "Anda tidak hadir pada tanggal layanan, sehingga antrian dipindahkan ke riwayat dengan status dibatalkan."
                  : "Antrian Anda telah dibatalkan dari halaman detail."
                : "Anda tidak hadir pada jadwal yang sudah ditentukan."
            }
          />
        ) : null}

        {isCompleted ? (
          <AppNotice
            icon={CheckCircle2}
            title="Layanan sudah selesai"
            description="Setelah layanan selesai, Anda bisa mengisi survei kepuasan layanan. Jika masih ada keberatan atau pengaduan, gunakan kanal SP4N Lapor."
          />
        ) : null}

        <div className="flex flex-col gap-3">
          {isCompleted ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <AppButton size="lg" onClick={handleOpenRating}>
                <ExternalLink className="size-4" />
                Isi Survei Kepuasan
              </AppButton>
              <AppButton size="lg" variant="outline" onClick={handleOpenSp4n}>
                <ExternalLink className="size-4" />
                Buka SP4N Lapor
              </AppButton>
            </div>
          ) : null}

          {canCancel && !isPreviewBooking ? (
            <AppButton
              size="lg"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={() => setShowCancelDialog(true)}
            >
              Batalkan Antrian
            </AppButton>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/jadwal-saya" className="sm:flex-1">
              <AppButton fullWidth variant="outline">
                <Clock3 className="size-4" />
                Kembali ke Antrian
              </AppButton>
            </Link>
            {!isPreviewBooking ? (
              <Link href="/bantuan" className="sm:flex-1">
                <AppButton fullWidth>
                  <LifeBuoy className="size-4" />
                  Hubungi Bantuan
                </AppButton>
              </Link>
            ) : (
              <Link href="/layanan" className="sm:flex-1">
                <AppButton fullWidth>
                  <Ticket className="size-4" />
                  Ambil antrian baru
                </AppButton>
              </Link>
            )}
          </div>
        </div>
      </div>

      <AppDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Batalkan antrian?"
        description={`Antrian ${displayQueueNumber} akan dibatalkan dari jadwal aktif Anda.`}
      >
        <div className="space-y-4">
          <AppCard tone="soft" padding="md">
            <AppCardDescription>
              Gunakan pembatalan hanya jika Anda benar-benar tidak bisa hadir, agar slot layanan dapat dipakai pengguna lain.
            </AppCardDescription>
          </AppCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <AppButton variant="outline" onClick={() => setShowCancelDialog(false)}>
              Kembali
            </AppButton>
            <AppButton
              className="bg-red-700 hover:bg-red-800"
              disabled={cancelMutation.isPending}
              onClick={handleCancelAppointment}
            >
              {cancelMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Ya, batalkan
            </AppButton>
          </div>
        </div>
      </AppDialog>
    </DashboardShell>
  );
}

function DetailInfoCell({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ticket;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}

function StatePill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-cyan-200 bg-cyan-50 text-cyan-700";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}
    >
      {label}
    </span>
  );
}
