"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LifeBuoy, Ticket } from "lucide-react";

import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppNotice } from "@/components/ui/app-notice";
import { AppPagination } from "@/components/ui/app-pagination";
import { AppTabs } from "@/components/ui/app-tabs";
import {
  getUserAppointmentPresentation,
  getUserAppointmentsByState,
  type UserAppointmentPresentation,
} from "@/content/user-appointments-content";
import { UserAppointmentCard } from "@/features/user/components/user-appointment-card";
import { useLiveUserAppointments } from "@/features/user/use-live-user-appointments";
import { useClientPagination } from "@/hooks/use-client-pagination";
import {
  formatQueueNumberForDisplay,
  matchesQueueNumberReference,
} from "@/lib/queue-number";

function isAppointmentPresentation(
  value: ReturnType<typeof getUserAppointmentPresentation>,
): value is UserAppointmentPresentation {
  return Boolean(value);
}

function getAppointmentFallbackTimestamp(appointment: UserAppointmentPresentation) {
  const [startTime = "00:00"] = appointment.timeRange
    .split("-")
    .map((segment) => segment.replace(/\bWIB\b/i, "").trim());
  const fallbackDate = Date.parse(`${appointment.date}T${startTime.slice(0, 5)}:00+07:00`);
  return Number.isFinite(fallbackDate) ? fallbackDate : 0;
}

function getAppointmentCreatedAtTimestamp(appointment: UserAppointmentPresentation) {
  const createdAtTimestamp = appointment.createdAt
    ? Date.parse(appointment.createdAt)
    : Number.NaN;

  if (Number.isFinite(createdAtTimestamp)) {
    return createdAtTimestamp;
  }

  return getAppointmentFallbackTimestamp(appointment);
}

function compareHistoryAppointmentsByCreatedAtDesc(
  left: UserAppointmentPresentation,
  right: UserAppointmentPresentation,
) {
  return (
    getAppointmentCreatedAtTimestamp(right) - getAppointmentCreatedAtTimestamp(left)
  );
}

export function UserAppointmentsPage() {
  const searchParams = useSearchParams();
  const live = useLiveUserAppointments();
  const reference = searchParams.get("reference")?.trim().toUpperCase() ?? "";
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
  const prioritizedActiveAppointments = reference
    ? [...activeAppointments].sort((left, right) => {
        const leftMatch = matchesQueueNumberReference(
          left.rawQueueNumber || left.queueNumber,
          reference,
        )
          ? 0
          : 1;
        const rightMatch = matchesQueueNumberReference(
          right.rawQueueNumber || right.queueNumber,
          reference,
        )
          ? 0
          : 1;
        return leftMatch - rightMatch;
      })
    : activeAppointments;
  const prioritizedHistoryAppointments = reference
    ? [...sortedHistoryAppointments].sort((left, right) => {
        const leftMatch = matchesQueueNumberReference(
          left.rawQueueNumber || left.queueNumber,
          reference,
        )
          ? 0
          : 1;
        const rightMatch = matchesQueueNumberReference(
          right.rawQueueNumber || right.queueNumber,
          reference,
        )
          ? 0
          : 1;
        if (leftMatch !== rightMatch) {
          return leftMatch - rightMatch;
        }

        return compareHistoryAppointmentsByCreatedAtDesc(left, right);
      })
    : sortedHistoryAppointments;
  const hasReferenceMatch = [...activeAppointments, ...historyAppointments].some(
    (appointment) =>
      matchesQueueNumberReference(
        appointment.rawQueueNumber || appointment.queueNumber,
        reference,
      ),
  );
  const displayReference = formatQueueNumberForDisplay(reference);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-stretch gap-3 sm:justify-end">
        <Link href="/layanan">
          <AppButton className="w-full sm:w-auto">
            <Ticket className="size-4" />
            Ambil antrian
          </AppButton>
        </Link>
      </div>

      {live.isLiveSession && live.isError ? (
        <AppNotice
          icon={LifeBuoy}
          title="Data live belum berhasil dimuat"
          description="Coba muat ulang halaman setelah beberapa saat untuk mengambil antrian terbaru dari sistem layanan."
        />
      ) : null}

      {reference ? (
        <AppNotice
          icon={Ticket}
          title={
            hasReferenceMatch
              ? `Referensi antrian ${displayReference} ditemukan`
              : `Mencari referensi antrian ${displayReference}`
          }
          description={
            hasReferenceMatch
              ? "Antrian yang cocok kami naikkan ke urutan teratas agar lebih cepat dibaca."
              : "Jika antrian ini milik akun Anda, detailnya akan muncul begitu data live berhasil dimuat."
          }
        />
      ) : null}

      {showLiveLoadingState ? (
        <AppCard padding="md">
          <p className="text-sm font-semibold">Memuat antrian live</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Kami sedang menyinkronkan antrian aktif dan riwayat terbaru dari sistem layanan.
          </p>
        </AppCard>
      ) : null}

      <AppCard padding="none" className="overflow-hidden">
        <div className="px-5 py-5 lg:px-6">
          <AppTabs
            defaultValue="active"
            tabs={[
              {
                value: "active",
                label: `Aktif (${activeAppointments.length})`,
                content: (
                  <PaginatedAppointmentsCardList
                    appointments={prioritizedActiveAppointments}
                    emptyTitle="Belum ada antrian aktif"
                    emptyDescription="Setelah antrian tersimpan, antrian aktif Anda akan muncul di sini."
                    itemLabel="antrian"
                  />
                ),
              },
              {
                value: "history",
                label: `Riwayat (${historyAppointments.length})`,
                content: (
                  <PaginatedAppointmentsCardList
                    appointments={prioritizedHistoryAppointments}
                    emptyTitle="Belum ada riwayat layanan"
                    emptyDescription="Riwayat selesai, tidak diproses, batal, atau tidak hadir akan muncul setelah layanan berjalan."
                    itemLabel="riwayat"
                    allowPageSizeChange={false}
                  />
                ),
              },
            ]}
          />
        </div>
      </AppCard>
    </div>
  );
}

function PaginatedAppointmentsCardList({
  appointments,
  emptyTitle,
  emptyDescription,
  itemLabel,
  allowPageSizeChange = true,
}: {
  appointments: UserAppointmentPresentation[];
  emptyTitle: string;
  emptyDescription: string;
  itemLabel: string;
  allowPageSizeChange?: boolean;
}) {
  const pagination = useClientPagination(appointments, 5);

  if (appointments.length === 0) {
    return (
      <AppEmptyState
        icon={Ticket}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel="Ambil antrian"
        actionHref="/layanan"
      />
    );
  }

  return (
    <div className="space-y-3">
      {pagination.pageItems.map((appointment) => {
        return (
          <UserAppointmentCard
            key={appointment.id}
            appointment={appointment}
            href={`/jadwal-saya/${appointment.id}`}
          />
        );
      })}
      <AppPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        pageSize={allowPageSizeChange ? pagination.pageSize : undefined}
        onPageSizeChange={allowPageSizeChange ? pagination.setPageSize : undefined}
        totalItems={pagination.totalItems}
        startItem={pagination.startItem}
        endItem={pagination.endItem}
        itemLabel={itemLabel}
      />
    </div>
  );
}
