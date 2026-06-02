"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Ticket,
  WalletCards,
} from "lucide-react";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppPageIntro } from "@/components/composite/app-page-intro";
import { getPageCopyByRoute } from "@/content/page-copy";
import {
  getUserAppointmentPresentation,
  getUserAppointmentsByState,
  type UserAppointmentPresentation,
  userAppointmentStatusMeta,
} from "@/content/user-appointments-content";
import { bookingServices } from "@/content/service-booking-content";
import { AppBadge } from "@/components/ui/app-badge";
import { AppButton } from "@/components/ui/app-button";
import { AppCard, AppCardTitle } from "@/components/ui/app-card";
import { AppQrTicket } from "@/components/ui/app-qr-ticket";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { buildAppointmentQrValue } from "@/features/user/appointment-qr";
import { ServiceDiscoveryCard } from "@/features/services/components/service-discovery-card";
import { UserAppointmentCard } from "@/features/user/components/user-appointment-card";
import { useLiveUserAppointments } from "@/features/user/use-live-user-appointments";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";
type AppointmentPresentation = UserAppointmentPresentation;

function isAppointmentPresentation(
  value: ReturnType<typeof getUserAppointmentPresentation>,
): value is AppointmentPresentation {
  return Boolean(value);
}

function getAppointmentSortKey(appointment: AppointmentPresentation) {
  const [startTime = "00:00"] = appointment.timeRange.split("-").map((segment) => segment.trim());
  return `${appointment.date} ${startTime.slice(0, 5)}`;
}

function getAppointmentFallbackTimestamp(appointment: AppointmentPresentation) {
  const [startTime = "00:00"] = appointment.timeRange
    .split("-")
    .map((segment) => segment.replace(/\bWIB\b/i, "").trim());
  const fallbackDate = Date.parse(`${appointment.date}T${startTime.slice(0, 5)}:00+07:00`);
  return Number.isFinite(fallbackDate) ? fallbackDate : 0;
}

function getAppointmentCreatedAtTimestamp(appointment: AppointmentPresentation) {
  const createdAtTimestamp = appointment.createdAt
    ? Date.parse(appointment.createdAt)
    : Number.NaN;

  if (Number.isFinite(createdAtTimestamp)) {
    return createdAtTimestamp;
  }

  return getAppointmentFallbackTimestamp(appointment);
}

function compareHistoryAppointmentsByCreatedAtDesc(
  left: AppointmentPresentation,
  right: AppointmentPresentation,
) {
  return (
    getAppointmentCreatedAtTimestamp(right) - getAppointmentCreatedAtTimestamp(left)
  );
}

function formatQueueStatValue(value: number | null, showLoadingState: boolean) {
  if (value === null) {
    return showLoadingState ? "..." : "-";
  }

  return value;
}

function formatQueueDisplayStatValue(
  value: string | number | null,
  showLoadingState: boolean,
) {
  if (value === null || value === "") {
    return showLoadingState ? "..." : "-";
  }

  return value;
}

export function UserDashboardPage() {
  const copy = getPageCopyByRoute("/dashboard");
  const live = useLiveUserAppointments();
  const fallbackActiveAppointments = getUserAppointmentsByState("active")
    .map((appointment) => getUserAppointmentPresentation(appointment.id))
    .filter(isAppointmentPresentation);
  const fallbackHistoryAppointments = getUserAppointmentsByState("history")
    .map((appointment) => getUserAppointmentPresentation(appointment.id))
    .filter(isAppointmentPresentation);
  const liveAppointments = live.appointments;
  const showLiveLoadingState = live.isLiveSession && live.isLoading && !liveAppointments;
  const activeAppointments = live.isLiveSession
    ? (liveAppointments?.filter((appointment) =>
        ["booked", "confirmed", "escalated", "calling", "in-service"].includes(
          appointment.status,
        ),
      ) ?? [])
    : fallbackActiveAppointments;
  const historyAppointments = live.isLiveSession
    ? (liveAppointments?.filter((appointment) =>
        ["completed", "unprocessed", "cancelled", "no-show"].includes(
          appointment.status,
        ),
      ) ?? [])
    : fallbackHistoryAppointments;
  const sortedHistoryAppointments = [...historyAppointments].sort(
    compareHistoryAppointmentsByCreatedAtDesc,
  );
  const sortedActiveAppointments = [...activeAppointments].sort((left, right) =>
    getAppointmentSortKey(left).localeCompare(getAppointmentSortKey(right)),
  );
  const today = new Date().toISOString().split("T")[0];
  const todayAppointments = sortedActiveAppointments.filter((appointment) => appointment.date === today);
  const upcomingAppointments = sortedActiveAppointments.filter((appointment) => appointment.date > today);

  const primaryActive =
    todayAppointments.find((appointment) =>
      ["calling", "in-service"].includes(appointment.status),
    ) ??
    todayAppointments[0] ??
    upcomingAppointments[0] ??
    null;

  const latestHistoryAppointments = sortedHistoryAppointments.slice(0, 1);
  const servicePreview = bookingServices.slice(0, 6);
  const nextScheduledAppointment = upcomingAppointments[0] ?? todayAppointments[0] ?? null;
  const primaryQueueMetrics = primaryActive
    ? live.queueMetricsByAppointmentId[primaryActive.id] ?? null
    : null;
  const statusSummaryTitle = primaryActive
    ? userAppointmentStatusMeta[primaryActive.status].label
    : showLiveLoadingState
      ? "Memuat status antrian"
      : "Belum ada antrian aktif";
  const primaryDisplayQueueNumber = primaryActive
    ? formatQueueNumberForDisplay(primaryActive.queueNumber)
    : "";
  const nextDisplayQueueNumber = nextScheduledAppointment
    ? formatQueueNumberForDisplay(nextScheduledAppointment.queueNumber)
    : "";
  const statusSummaryNote = primaryActive
    ? `${primaryDisplayQueueNumber} · ${primaryActive.summaryNote}`
    : showLiveLoadingState
      ? "Kami sedang mengambil status antrian terbaru dari sistem layanan."
      : "Ambil layanan baru untuk memulai antrian Anda.";
  const scheduleSummaryTitle = nextScheduledAppointment
    ? `${nextDisplayQueueNumber} · ${nextScheduledAppointment.timeRange}`
    : showLiveLoadingState
      ? "Memuat jadwal"
      : "Belum ada jadwal";
  const scheduleSummaryNote = nextScheduledAppointment
    ? `${nextScheduledAppointment.dateLabel} · ${nextScheduledAppointment.unitLabel}`
    : showLiveLoadingState
      ? "Jadwal kunjungan berikutnya sedang disinkronkan."
      : "Belum ada jadwal kunjungan.";
  const serviceSummaryTitle =
    live.isLiveSession && live.availableServiceCount === null
      ? live.isLoading || live.isFetching
        ? "Memuat layanan"
        : "Data layanan belum tersedia"
      : `${live.availableServiceCount ?? bookingServices.length} layanan aktif`;
  const serviceSummaryNote =
    live.isLiveSession && live.availableServiceCount === null
      ? live.isLoading || live.isFetching
        ? "Daftar layanan aktif sedang dimuat dari sistem."
        : "Daftar layanan aktif belum berhasil dimuat."
      : (live.availableServiceCount ?? bookingServices.length) > 0
        ? "Pilih layanan untuk membuat booking baru."
        : "Belum ada layanan yang bisa dibooking saat ini.";

  return (
    <DashboardShell
      role="user"
      currentPath="/dashboard"
      title={copy?.title ?? "Dashboard Pengguna"}
      subtitle={
        copy?.description ??
        "Pantau antrian aktif, jadwal kunjungan, dan pembaruan layanan LKPP."
      }
    >
      <div className="space-y-6">
        <AppPageIntro
          eyebrow={copy?.heroEyebrow || copy?.title}
          title={copy?.heroTitle || copy?.title || "Dashboard Pengguna"}
          description={
            copy?.heroDescription ||
            copy?.description ||
            "Pantau antrian aktif, jadwal kunjungan, dan pembaruan layanan LKPP."
          }
          actions={
            <>
              <Link href="/jadwal-saya">
                <AppButton variant="outline">Jadwal Saya</AppButton>
              </Link>
              <Link href="/layanan">
                <AppButton>
                  Ambil antrian
                  <ArrowRight className="size-4" />
                </AppButton>
              </Link>
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AppStatCard
            label="Nomor Anda"
            value={formatQueueStatValue(
              primaryQueueMetrics?.queueSequence ?? null,
              showLiveLoadingState,
            )}
            description="Urutan antrean Anda pada layanan hari ini."
            icon={Ticket}
          />
          <AppStatCard
            tone="info"
            label="Sedang Dilayani"
            value={formatQueueDisplayStatValue(
              primaryQueueMetrics?.currentServingQueueNumber ??
                primaryQueueMetrics?.currentServingSequence ??
                null,
              showLiveLoadingState,
            )}
            description="Nomor yang sedang diproses oleh unit."
            icon={CheckCircle2}
          />
          <AppStatCard
            tone="warning"
            label="Sebelum Giliran Anda"
            value={formatQueueStatValue(
              primaryQueueMetrics?.beforeYourTurnCount ?? null,
              showLiveLoadingState,
            )}
            description="Perkiraan nomor sebelum antrean Anda."
            icon={CalendarDays}
          />
          <AppStatCard
            tone="neutral"
            label="Sisa Kuota Hari Ini"
            value={formatQueueStatValue(
              primaryQueueMetrics?.remainingQueueCount ?? null,
              showLiveLoadingState,
            )}
            description="Slot booking unit yang masih tersedia pada tanggal ini."
            icon={WalletCards}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
          <AppCard padding="md" className="space-y-5 overflow-visible">
            {primaryActive ? (
              <>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <AppBadge tone="role">Antrian Aktif</AppBadge>
                    <div className="space-y-1">
                      <p className="break-all font-heading text-3xl font-bold tracking-[-0.04em] sm:text-4xl md:text-6xl">
                        {primaryDisplayQueueNumber}
                      </p>
                      <AppStatusBadge
                        status={userAppointmentStatusMeta[primaryActive.status].badgeStatus}
                        label={userAppointmentStatusMeta[primaryActive.status].label}
                      />
                    </div>
                  </div>
                  <div className="flex justify-center md:justify-end">
                    <AppQrTicket
                      value={buildAppointmentQrValue({
                        id: primaryActive.id,
                        qrToken: primaryActive.qrToken,
                        queueNumber: primaryActive.rawQueueNumber || primaryActive.queueNumber,
                        serviceId: primaryActive.serviceId,
                        date: primaryActive.date,
                      })}
                      size={82}
                      label="QR Antrian"
                      ticketNumber={primaryDisplayQueueNumber}
                      hideLabel
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <DashboardInfoCell label="Layanan" value={primaryActive.serviceTitle} />
                  <DashboardInfoCell label="Unit tujuan" value={primaryActive.unitLabel} />
                  <DashboardInfoCell
                    label="Jadwal"
                    value={`${primaryActive.dateLabel} • ${primaryActive.timeRange}`}
                  />
                  <DashboardInfoCell label="Lokasi" value={primaryActive.location} />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link href={`/jadwal-saya/${primaryActive.id}`}>
                    <AppButton>
                      Lihat Detail Antrian
                      <ArrowRight className="size-4" />
                    </AppButton>
                  </Link>
                  <Link href="/layanan">
                    <AppButton variant="outline">Ambil antrian</AppButton>
                  </Link>
                </div>
              </>
            ) : (
              <div className="rounded-[28px] border border-border bg-background/70 p-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface-container-low">
                  <Ticket className="size-7 text-role-accent" />
                </div>
                <p className="mt-4 text-2xl font-bold tracking-tight">
                  {showLiveLoadingState ? "Memuat antrian live" : "Belum ada antrian aktif"}
                </p>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                  {showLiveLoadingState
                    ? "Kami sedang mengambil status antrian terbaru dari sistem layanan."
                    : "Antrian aktif akan tampil di sini setelah Anda memilih layanan."}
                </p>
                {!showLiveLoadingState ? (
                  <Link href="/layanan" className="mt-5 inline-flex">
                    <AppButton>Ambil antrian</AppButton>
                  </Link>
                ) : null}
              </div>
            )}

            {latestHistoryAppointments.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Riwayat terbaru</p>
                  <Link href="/jadwal-saya">
                    <AppButton size="sm" variant="outline">
                      Lihat semua
                    </AppButton>
                  </Link>
                </div>
                <div className="space-y-2.5">
                  {latestHistoryAppointments.map((appointment) => (
                    <AppointmentMiniCard
                      key={appointment.id}
                      appointment={appointment}
                    />
                  ))}
                </div>
              </div>
            )}
          </AppCard>

          <AppCard padding="md" className="space-y-4">
              <AppCardTitle>Ringkasan</AppCardTitle>
            <div className="space-y-3">
              <SummaryBoardItem
                label="Status antrian"
                title={statusSummaryTitle}
                note={statusSummaryNote}
              />
              <SummaryBoardItem
                label="Jadwal berikutnya"
                title={scheduleSummaryTitle}
                note={scheduleSummaryNote}
              />
              <SummaryBoardItem
                label="Layanan tersedia"
                title={serviceSummaryTitle}
                note={serviceSummaryNote}
              />
            </div>
          </AppCard>
            </div>

        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              Ambil Antrian
            </p>
            <h2 className="font-heading text-xl font-bold tracking-tight">
              Layanan cepat
            </h2>
          </div>
          <Link href="/layanan">
            <AppButton variant="outline">
              <ArrowRight className="size-4" />
              Buka semua
            </AppButton>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 overflow-visible sm:grid-cols-2 xl:grid-cols-3">
          {servicePreview.map((service) => (
            <ServiceDiscoveryCard
              key={service.id}
              service={service}
            />
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

function SummaryBoardItem({
  label,
  title,
  note,
}: {
  label: string;
  title: string;
  note: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6">{title}</p>
      <p className="mt-1 text-xs leading-6 text-muted-foreground">{note}</p>
    </div>
  );
}

function DashboardInfoCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}

function AppointmentMiniCard({
  appointment,
}: {
  appointment: AppointmentPresentation;
}) {
  return (
    <UserAppointmentCard
      appointment={appointment}
      href={`/jadwal-saya/${appointment.id}`}
      compact
    />
  );
}
