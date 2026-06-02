"use client";

import { getJakartaTodayKey } from "@/components/ui/app-date-filter";
import { type FrontdeskFilterSection } from "@/features/internal/components/frontdesk-filter-bar";
import { getInternalAppointmentStatusCategory } from "@/features/internal/internal-appointment-status";
import { type useLiveStaffAppointments } from "@/features/internal/use-live-staff-appointments";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";

export type FrontdeskRow = {
  appointmentId: string;
  createdAt?: string;
  userName: string;
  userNik: string;
  queueNumber: string;
  serviceId: string;
  serviceTitle: string;
  unitId: string;
  unitLabel: string;
  date: string;
  attendanceStatusLabel: string;
  queueStatusLabel: string;
  finalStatusLabel?: string;
  queueStatusCaption?: string;
  statusLabel: string;
  note: string;
  checkedIn: boolean;
  section: FrontdeskFilterSection;
  isEscalated?: boolean;
  escalationOriginLabel?: string | null;
  escalationReason?: string | null;
};

function resolveAttendanceStatusLabel(checkedIn: boolean) {
  return checkedIn ? "Sudah Hadir" : "Belum Check-in";
}

function resolveFinalStatusLabel(
  rawStatus: string,
  checkedIn: boolean,
  autoCancelled = false,
) {
  const category = getInternalAppointmentStatusCategory({
    status: rawStatus,
    checkedIn,
    autoCancelled,
  });

  if (category === "completed") {
    return "Selesai";
  }

  if (category === "unprocessed") {
    return "Tidak Diproses";
  }

  if (category === "cancelled-system" || category === "cancelled-manual") {
    return "Tidak Aktif";
  }

  if (category === "no-show") {
    return "Tidak Hadir";
  }

  return undefined;
}

function normalizeQueueLabel(
  rawStatus: string,
  checkedIn: boolean,
  isEscalated = false,
  autoCancelled = false,
) {
  if (isEscalated) {
    return {
      label: "Pindah Layanan / Eskalasi",
      note: checkedIn
        ? "Sudah diteruskan ke layanan tujuan level 2"
        : "Sudah dipindah ke layanan tujuan sebelum konfirmasi hadir",
      section: "history" as const,
      tone: "warning" as const,
    };
  }

  const category = getInternalAppointmentStatusCategory({
    status: rawStatus,
    checkedIn,
    autoCancelled,
  });

  if (category === "completed") {
    return {
      label: "Selesai",
      note: "Layanan tuntas",
      section: "history" as const,
      tone: "selesai" as const,
    };
  }

  if (category === "unprocessed") {
    return {
      label: "Tidak Diproses",
      note: "Hari layanan berganti sebelum antrean selesai diproses",
      section: "history" as const,
      tone: "warning" as const,
    };
  }

  if (category === "cancelled-system" || category === "cancelled-manual") {
    return {
      label: "Tidak Aktif",
      note:
        category === "cancelled-system"
          ? "Antrean ditutup otomatis oleh sistem"
          : "Antrean dibatalkan sebelum masuk ke unit",
      section: "history" as const,
      tone: "warning" as const,
    };
  }

  if (category === "no-show") {
    return {
      label: "Tidak Hadir",
      note: "Lewat slot kehadiran dan tidak check-in",
      section: "history" as const,
      tone: "warning" as const,
    };
  }

  if (category === "waiting-checkin") {
    return {
      label: "Menunggu Check-in",
      note: "Perlu konfirmasi kehadiran",
      section: "active" as const,
      tone: "diproses" as const,
    };
  }

  if (category === "calling" || category === "in-service") {
    return {
      label: "Dipanggil Unit",
      note: "Sudah diteruskan ke unit",
      section: "active" as const,
      tone: "dipanggil" as const,
    };
  }

  return {
    label: "Menunggu Panggilan Unit",
    note: "Tamu sudah check-in dan menunggu panggilan unit",
    section: "active" as const,
    tone: "aktif" as const,
  };
}

function normalizeLegacyLabel(
  rawStatus: string,
  checkedIn: boolean,
  isEscalated = false,
  autoCancelled = false,
) {
  if (isEscalated) {
    return {
      label: "Pindah Layanan / Eskalasi",
      note: checkedIn
        ? "Sudah diteruskan ke layanan tujuan level 2"
        : "Sudah dipindah ke layanan tujuan sebelum konfirmasi hadir",
      section: "history" as const,
      tone: "warning" as const,
    };
  }

  const category = getInternalAppointmentStatusCategory({
    status: rawStatus,
    checkedIn,
    autoCancelled,
  });

  if (category === "completed") {
    return {
      label: "Selesai",
      note: "Layanan tuntas",
      section: "history" as const,
      tone: "selesai" as const,
    };
  }

  if (category === "unprocessed") {
    return {
      label: "Tidak Diproses",
      note: "Hari layanan berganti sebelum antrean selesai diproses",
      section: "history" as const,
      tone: "warning" as const,
    };
  }

  if (category === "cancelled-system" || category === "cancelled-manual") {
    return {
      label: "Tidak Aktif",
      note:
        category === "cancelled-system"
          ? "Antrean ditutup otomatis oleh sistem"
          : "Antrean dibatalkan sebelum masuk ke unit",
      section: "history" as const,
      tone: "warning" as const,
    };
  }

  if (category === "no-show") {
    return {
      label: "Tidak Hadir",
      note: "Lewat slot kehadiran dan tidak check-in",
      section: "history" as const,
      tone: "warning" as const,
    };
  }

  if (category === "waiting-checkin") {
    return {
      label: "Belum Check-in",
      note: "Perlu konfirmasi kehadiran",
      section: "active" as const,
      tone: "diproses" as const,
    };
  }

  if (category === "calling" || category === "in-service") {
    return {
      label: "Dipanggil Unit",
      note: "Sudah diteruskan ke unit",
      section: "active" as const,
      tone: "dipanggil" as const,
    };
  }

  return {
    label: "Sudah Hadir",
    note: "Menunggu panggilan unit",
    section: "active" as const,
    tone: "aktif" as const,
  };
}

export function resolveFrontdeskAttendanceTone(attendanceStatusLabel: string) {
  return attendanceStatusLabel === "Sudah Hadir"
    ? ("aktif" as const)
    : ("diproses" as const);
}

export function resolveFrontdeskQueueTone(queueStatusLabel: string) {
  if (queueStatusLabel === "Selesai") {
    return "selesai" as const;
  }

  if (
    queueStatusLabel === "Pindah Layanan / Eskalasi" ||
    queueStatusLabel === "Tidak Diproses" ||
    queueStatusLabel === "Tidak Aktif" ||
    queueStatusLabel === "Tidak Hadir"
  ) {
    return "warning" as const;
  }

  if (queueStatusLabel === "Dipanggil Unit") {
    return "dipanggil" as const;
  }

  if (queueStatusLabel === "Menunggu Panggilan Unit") {
    return "aktif" as const;
  }

  return "diproses" as const;
}

export function buildFrontdeskRows(
  appointments: ReturnType<typeof useLiveStaffAppointments>["appointments"],
): FrontdeskRow[] {
  if (!appointments?.length) {
    return [];
  }

  return appointments
    .map((appointment) => {
      const normalizedCategory = getInternalAppointmentStatusCategory({
        status: appointment.rawStatus || appointment.status,
        checkedIn: appointment.checkedIn,
        autoCancelled: Boolean(appointment.autoCancelled),
      });
      const legacyStatus = normalizeLegacyLabel(
        appointment.rawStatus || appointment.status,
        appointment.checkedIn,
        Boolean(appointment.isEscalated),
        Boolean(appointment.autoCancelled),
      );
      const queueStatus = normalizeQueueLabel(
        appointment.rawStatus || appointment.status,
        appointment.checkedIn,
        Boolean(appointment.isEscalated),
        Boolean(appointment.autoCancelled),
      );
      const finalStatusLabel = resolveFinalStatusLabel(
        appointment.rawStatus || appointment.status,
        appointment.checkedIn,
        Boolean(appointment.autoCancelled),
      );
      const attendanceStatusLabel = resolveAttendanceStatusLabel(
        appointment.checkedIn,
      );
      return {
        appointmentId: appointment.id,
        createdAt: appointment.createdAt,
        userName: appointment.userName,
        userNik: appointment.userNik,
        queueNumber: appointment.queueNumber,
        serviceId: appointment.serviceId,
        serviceTitle: appointment.serviceTitle,
        unitId: appointment.unitId,
        unitLabel: appointment.unitLabel,
        date: appointment.date,
        attendanceStatusLabel,
        queueStatusLabel: queueStatus.label,
        finalStatusLabel,
        queueStatusCaption:
          appointment.isEscalated && normalizedCategory === "completed"
            ? appointment.unitLabel
              ? `Selesai di ${appointment.unitLabel} (level 2)`
              : "Selesai di unit penanganan (level 2)"
            : appointment.isEscalated && normalizedCategory === "unprocessed"
              ? appointment.unitLabel
                ? `Tidak diproses di ${appointment.unitLabel} (level 2)`
                : "Tidak diproses di unit penanganan (level 2)"
            : undefined,
        statusLabel: legacyStatus.label,
        note:
          appointment.isEscalated
            ? [
                queueStatus.note,
                appointment.serviceTitle ? `Tujuan: ${appointment.serviceTitle}` : null,
                appointment.unitLabel ? appointment.unitLabel : null,
                appointment.escalationOriginLabel
                  ? `Dari: ${appointment.escalationOriginLabel}`
                  : null,
                appointment.escalationReason || null,
              ]
                .filter(Boolean)
                .join(" · ")
            : queueStatus.note,
        checkedIn: appointment.checkedIn,
        section: queueStatus.section,
        isEscalated: appointment.isEscalated,
        escalationOriginLabel: appointment.escalationOriginLabel,
        escalationReason: appointment.escalationReason,
      } satisfies FrontdeskRow;
    })
    .sort((left, right) => {
      const leftCreatedAt = (left.createdAt || "").trim();
      const rightCreatedAt = (right.createdAt || "").trim();
      const createdAtComparison = rightCreatedAt.localeCompare(leftCreatedAt);
      if (createdAtComparison !== 0) {
        return createdAtComparison;
      }

      return right.queueNumber.localeCompare(left.queueNumber);
    });
}

export function buildFrontdeskFallbackRows(
  rows: Array<{
    id: string;
    title: string;
    status: string;
    note: string;
  }> = [],
): FrontdeskRow[] {
  return rows.map((row) => {
    const normalizedStatus = row.status.toLowerCase();
    const isHistory =
      normalizedStatus.includes("selesai") ||
      normalizedStatus.includes("tidak diproses") ||
      normalizedStatus.includes("tidak hadir") ||
      normalizedStatus.includes("tidak aktif") ||
      normalizedStatus.includes("batal");
    const attendanceStatusLabel =
      normalizedStatus.includes("belum") || normalizedStatus.includes("tidak hadir")
        ? "Belum Check-in"
        : "Sudah Hadir";
    const queueStatusLabel = normalizedStatus.includes("belum check-in")
      ? "Menunggu Check-in"
      : normalizedStatus.includes("sudah hadir") || normalizedStatus.includes("siap dipanggil")
        ? "Menunggu Panggilan Unit"
        : row.status;

    return {
      appointmentId: row.id,
      createdAt: undefined,
      userName: "Nama tamu belum tersedia",
      userNik: "-",
      queueNumber: formatQueueNumberForDisplay(row.id),
      serviceId: row.id,
      serviceTitle: row.title,
      unitId: "fallback",
      unitLabel: "Unit layanan LKPP",
      date: getJakartaTodayKey(),
      attendanceStatusLabel,
      queueStatusLabel,
      finalStatusLabel: isHistory ? queueStatusLabel : undefined,
      queueStatusCaption: undefined,
      statusLabel: row.status,
      note: row.note,
      checkedIn: !normalizedStatus.includes("belum"),
      section: isHistory ? "history" : "active",
    };
  });
}
