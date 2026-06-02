export const APPOINTMENT_UNPROCESSED_NOTE =
  "Antrean tidak sempat diproses karena hari layanan telah berganti. Tiket sudah hangus. Silakan ambil antrean baru.";

export const APPOINTMENT_AUTO_COMPLETED_NOTE =
  "Antrean ditutup otomatis karena layanan sudah berjalan tetapi belum diselesaikan petugas sebelum hari berganti.";

export const AUTO_CANCEL_PERSISTED_APPOINTMENT_STATUS_VALUES = [
  "booked",
  "confirmed",
  "calling",
] as const;

export const AUTO_COMPLETE_PERSISTED_APPOINTMENT_STATUS_VALUES = [
  "in-service",
] as const;

export const ACTIVE_PERSISTED_APPOINTMENT_STATUS_VALUES = [
  ...AUTO_CANCEL_PERSISTED_APPOINTMENT_STATUS_VALUES,
  ...AUTO_COMPLETE_PERSISTED_APPOINTMENT_STATUS_VALUES,
] as const;

export const ACTIVE_APPOINTMENT_STATUS_VALUES = [
  ...ACTIVE_PERSISTED_APPOINTMENT_STATUS_VALUES,
  "escalated",
] as const;

const ACTIVE_APPOINTMENT_STATUSES = new Set<string>(ACTIVE_APPOINTMENT_STATUS_VALUES);

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function getJakartaTodayDateKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function isPastServiceDate(dateKey: string) {
  const normalizedDateKey = String(dateKey || "").trim();
  if (!isDateKey(normalizedDateKey)) {
    return false;
  }

  const todayKey = getJakartaTodayDateKey();
  if (!isDateKey(todayKey)) {
    return false;
  }

  return normalizedDateKey < todayKey;
}

export function shouldAutoCloseAppointmentAsUnprocessed(
  status: unknown,
  dateKey: string,
) {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  if (!ACTIVE_APPOINTMENT_STATUSES.has(normalizedStatus)) {
    return false;
  }

  return isPastServiceDate(dateKey);
}

export function appendAppointmentAutoCloseNote(note: string) {
  const trimmed = String(note || "").trim();
  if (!trimmed) {
    return APPOINTMENT_UNPROCESSED_NOTE;
  }

  if (trimmed.includes(APPOINTMENT_UNPROCESSED_NOTE)) {
    return trimmed;
  }

  return `${trimmed} ${APPOINTMENT_UNPROCESSED_NOTE}`;
}

export function appendAppointmentAutoCompletedNote(note: string) {
  const trimmed = String(note || "").trim();
  if (!trimmed) {
    return APPOINTMENT_AUTO_COMPLETED_NOTE;
  }

  if (trimmed.includes(APPOINTMENT_AUTO_COMPLETED_NOTE)) {
    return trimmed;
  }

  return `${trimmed} ${APPOINTMENT_AUTO_COMPLETED_NOTE}`;
}
