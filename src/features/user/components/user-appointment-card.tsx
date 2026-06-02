"use client";

import Link from "next/link";

import { AppCard } from "@/components/ui/app-card";
import { AppQrTicket } from "@/components/ui/app-qr-ticket";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import {
  getUserAppointmentPresentation,
  userAppointmentStatusMeta,
} from "@/content/user-appointments-content";
import { buildAppointmentQrValue } from "@/features/user/appointment-qr";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";

type UserAppointmentPresentation = NonNullable<
  ReturnType<typeof getUserAppointmentPresentation>
>;

export function UserAppointmentCard({
  appointment,
  href,
  compact = false,
}: {
  appointment: UserAppointmentPresentation;
  href: string;
  compact?: boolean;
}) {
  const meta = userAppointmentStatusMeta[appointment.status];
  const displayQueueNumber = formatQueueNumberForDisplay(appointment.queueNumber);
  const repeatCallNote =
    appointment.status === "calling" && (appointment.callCount ?? 0) > 1
      ? `Panggilan ke-${appointment.callCount}`
      : null;

  return (
    <Link href={href} className="block">
      <AppCard
        tone="elevated"
        padding="md"
        className="transition-[transform,background-color] hover:-translate-y-[1px] hover:bg-surface-container-lowest"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {appointment.dateLabel} • {appointment.timeRange}
                </p>
                <p
                  className={`truncate font-heading font-bold tracking-tight ${
                    compact ? "text-base leading-7" : "text-[1.08rem] leading-7"
                  }`}
                >
                  {appointment.serviceTitle}
                </p>
              </div>
              <AppStatusBadge status={meta.badgeStatus} label={meta.label} />
            </div>

            <p className="text-sm leading-6 text-muted-foreground">
              {appointment.unitLabel}
            </p>

            {repeatCallNote ? (
              <p className="text-xs font-medium leading-5 text-role-accent">
                {repeatCallNote}
              </p>
            ) : null}
          </div>

          <div
            className={`flex w-full shrink-0 flex-col items-center gap-2 rounded-[18px] border border-border/70 bg-surface-container-lowest px-3 py-3 sm:w-auto ${
              compact ? "sm:min-w-[112px]" : "sm:min-w-[122px]"
            }`}
          >
            <AppQrTicket
              value={buildAppointmentQrValue({
                id: appointment.id,
                qrToken: appointment.qrToken,
                queueNumber: appointment.rawQueueNumber || appointment.queueNumber,
                serviceId: appointment.serviceId,
                date: appointment.date,
              })}
              size={compact ? 46 : 50}
              label="QR"
              subtle
              ticketNumber={displayQueueNumber}
              hideLabel
            />
            <p
              className={`w-full break-all text-center font-heading font-bold leading-tight tracking-tight tabular-nums ${
                compact ? "text-[1.1rem] sm:text-[1.65rem]" : "text-[1.25rem] sm:text-[1.78rem]"
              }`}
            >
              {displayQueueNumber}
            </p>
          </div>
        </div>
      </AppCard>
    </Link>
  );
}
