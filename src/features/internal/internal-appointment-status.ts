export type InternalAppointmentStatusCategory =
  | "waiting-checkin"
  | "ready"
  | "calling"
  | "in-service"
  | "completed"
  | "unprocessed"
  | "cancelled-system"
  | "cancelled-manual"
  | "no-show";

type ResolveStatusOptions = {
  status: string;
  checkedIn?: boolean;
  autoCancelled?: boolean;
};

export function getInternalAppointmentStatusCategory({
  status,
  checkedIn = false,
  autoCancelled = false,
}: ResolveStatusOptions): InternalAppointmentStatusCategory {
  const normalized = status.trim().toLowerCase();

  if (normalized === "completed" || normalized.includes("selesai")) {
    return "completed";
  }

  if (normalized === "unprocessed" || normalized.includes("tidak diproses")) {
    return "unprocessed";
  }

  if (
    normalized === "no-show" ||
    normalized.includes("tidak hadir") ||
    normalized.includes("tidak check-in")
  ) {
    return "no-show";
  }

  if (
    normalized === "cancelled" ||
    normalized.includes("dibatalkan sistem") ||
    normalized.includes("batal sistem") ||
    normalized.includes("dibatalkan otomatis") ||
    normalized.includes("dibatalkan manual") ||
    normalized.includes("dibatalkan pengguna") ||
    normalized.includes("dibatalkan")
  ) {
    return autoCancelled ||
      normalized.includes("sistem") ||
      normalized.includes("otomatis")
      ? "cancelled-system"
      : "cancelled-manual";
  }

  if (
    normalized === "in-service" ||
    normalized.includes("sedang dilayani") ||
    normalized.includes("diproses")
  ) {
    return "in-service";
  }

  if (normalized === "calling" || normalized.includes("dipanggil")) {
    return "calling";
  }

  if (
    normalized.includes("siap dipanggil") ||
    normalized.includes("sudah hadir")
  ) {
    return "ready";
  }

  if (
    normalized === "booked" ||
    normalized === "confirmed" ||
    normalized.includes("menunggu")
  ) {
    return checkedIn ? "ready" : "waiting-checkin";
  }

  return checkedIn ? "ready" : "waiting-checkin";
}

export function getInternalAppointmentStatusLabel(
  options: ResolveStatusOptions,
) {
  const category = getInternalAppointmentStatusCategory(options);

  if (category === "waiting-checkin") {
    return "Menunggu Check-in";
  }

  if (category === "ready") {
    return "Siap Dipanggil";
  }

  if (category === "calling") {
    return "Dipanggil";
  }

  if (category === "in-service") {
    return "Sedang Dilayani";
  }

  if (category === "completed") {
    return "Selesai";
  }

  if (category === "unprocessed") {
    return "Tidak Diproses";
  }

  if (category === "cancelled-system") {
    return "Dibatalkan Sistem";
  }

  if (category === "cancelled-manual") {
    return "Dibatalkan Pengguna";
  }

  return "Tidak Hadir";
}

export function isInternalAppointmentCancelledCategory(
  category: InternalAppointmentStatusCategory,
) {
  return category === "cancelled-system" || category === "cancelled-manual";
}
