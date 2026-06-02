import type { UserAppointmentStatus } from "@/content/user-appointments-content";
import { APPOINTMENT_UNPROCESSED_NOTE } from "@/lib/appointment-auto-close";

const USER_APPOINTMENT_BLOCKING_NEW_BOOKING_STATUSES = new Set<UserAppointmentStatus>([
  "booked",
  "confirmed",
  "escalated",
  "calling",
  "in-service",
]);

export function normalizeUserAppointmentStatus(
  value: unknown,
): UserAppointmentStatus {
  const normalizedRaw = `${value || ""}`.trim().toLowerCase();
  const normalized =
    normalizedRaw === "in_service" || normalizedRaw === "serving"
      ? "in-service"
      : normalizedRaw === "called"
        ? "calling"
        : normalizedRaw;

  if (
    normalized === "booked" ||
    normalized === "confirmed" ||
    normalized === "escalated" ||
    normalized === "calling" ||
    normalized === "in-service" ||
    normalized === "completed" ||
    normalized === "unprocessed" ||
    normalized === "cancelled" ||
    normalized === "no-show"
  ) {
    return normalized;
  }

  return "booked";
}

function isEscalationNote(value: unknown) {
  const note = `${value || ""}`.trim();
  if (!note) {
    return false;
  }

  return note
    .split(/\r?\n/)
    .some((line) => /^(Eskalasi|Pindah layanan)\b/i.test(line.trim()));
}

function hasAutoCloseNote(value: unknown) {
  return `${value || ""}`.includes(APPOINTMENT_UNPROCESSED_NOTE);
}

export function resolveEffectiveUserAppointmentStatus(options: {
  status: unknown;
  date: string;
  endTime: string;
  autoCancelled?: boolean;
  note?: unknown;
}) {
  const normalizedStatus = normalizeUserAppointmentStatus(options.status);
  const isExpiredActiveStatus =
    (normalizedStatus === "unprocessed" || normalizedStatus === "cancelled") &&
    hasAutoCloseNote(options.note);
  const isEscalated =
    !isExpiredActiveStatus &&
    isEscalationNote(options.note) &&
    (normalizedStatus === "booked" || normalizedStatus === "confirmed");
  const effectiveStatus = isEscalated
      ? ("escalated" satisfies UserAppointmentStatus)
      : normalizedStatus;

  return {
    status: effectiveStatus,
    autoCancelled: Boolean(options.autoCancelled),
    isEscalated,
    isExpiredActiveStatus,
    autoClosedUnprocessed: isExpiredActiveStatus,
  };
}

export function isUserAppointmentBlockingNewBooking(status: UserAppointmentStatus) {
  return USER_APPOINTMENT_BLOCKING_NEW_BOOKING_STATUSES.has(status);
}
