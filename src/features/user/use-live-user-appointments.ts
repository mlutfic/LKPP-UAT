"use client";

import * as React from "react";
import { useQuery, type QueryClient } from "@tanstack/react-query";

import {
  type UserAppointmentPresentation,
  userAppointmentStatusMeta,
} from "@/content/user-appointments-content";
import { getBookingServiceById } from "@/content/service-booking-content";
import { resolveEffectiveUserAppointmentStatus } from "@/features/user/appointment-status-utils";
import { normalizeBookingRuntimeData } from "@/features/services/runtime-data";
import {
  APPOINTMENT_UNPROCESSED_NOTE,
  getJakartaTodayDateKey,
} from "@/lib/appointment-auto-close";
import { getScopedData } from "@/lib/api/services";
import { readMockSession } from "@/lib/mock-auth";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";

type LiveScopedResponse = {
  users?: unknown[];
  units?: unknown[];
  services?: unknown[];
  appointments?: unknown[];
};

type QueueLookupMatch = {
  id: string;
  queueNumber: string;
  status: UserAppointmentPresentation["status"];
  summaryNote: string;
  checkedIn: boolean;
  callCount: number;
  counterId?: number;
  serviceId: string;
  serviceTitle: string;
  unitLabel: string;
  date: string;
  dateLabel: string;
  timeRange: string;
};

type LookupFallbackPayload = {
  kind: "lookup-fallback";
  appointments: UserAppointmentPresentation[];
};

export type UserQueueOverviewMetrics = {
  queueSequence: number | null;
  totalQueueCount: number | null;
  remainingQueueCount: number | null;
  currentServingQueueNumber: string | null;
  currentServingSequence: number | null;
  beforeYourTurnCount: number | null;
};

type QueueProgressEntry = {
  date: string;
  series: string;
  sequence: number;
  status: UserAppointmentPresentation["status"];
  serviceId: string;
};

type QueueProgressRequest = {
  serviceId: string;
  date: string;
  series: string;
};

type QueueGroupProgressSummary = {
  currentServingQueueNumber: string | null;
  currentServingSequence: number | null;
  beforeYourTurnAnchorSequence: number;
};

type QueueProgressSummary = QueueProgressRequest & QueueGroupProgressSummary;

const FAST_USER_REFRESH_INTERVAL_MS = 2_500;
const DEFAULT_USER_REFRESH_INTERVAL_MS = 8_000;

export type LiveAppointmentSeed = {
  id: string;
  qrToken?: string;
  userId: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  queueNumber: string;
  counterId?: number;
  complaint: string;
  jumlahTamu: number;
  status?: string;
  checkedIn?: boolean;
  callCount?: number;
  applicantCategory?: string;
  institutionName?: string;
  serviceTopic?: string;
  asalInstansi?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRuntimeServiceEnabled(service: Record<string, unknown>) {
  if (typeof service.enabled === "boolean") {
    return service.enabled;
  }

  if (typeof service.is_active === "boolean") {
    return service.is_active;
  }

  if (typeof service.active === "boolean") {
    return service.active;
  }

  return true;
}

function formatDateLabel(dateKey: string) {
  if (!dateKey) {
    return "Tanggal belum tersedia";
  }

  const date = new Date(`${dateKey}T08:00:00+07:00`);
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildSummaryNote(
  status: UserAppointmentPresentation["status"],
  autoCancelled: boolean,
) {
  if (status === "unprocessed") {
    return APPOINTMENT_UNPROCESSED_NOTE;
  }

  if (status === "cancelled" && autoCancelled) {
    return "Pengguna tidak hadir pada tanggal layanan, sehingga antrian dibatalkan otomatis oleh sistem.";
  }

  return userAppointmentStatusMeta[status].note;
}

function buildActivityLog(
  status: UserAppointmentPresentation["status"],
  checkedIn: boolean,
  autoCancelled: boolean,
) {
  const steps = ["Antrian tersimpan di sistem."];

  if (
    checkedIn ||
    ["confirmed", "escalated", "calling", "in-service", "completed"].includes(status)
  ) {
    steps.push("Kehadiran terkonfirmasi di frontdesk.");
  }

  if (status === "escalated") {
    steps.push("Antrian diteruskan ke layanan lanjutan level 2.");
  } else if (status === "calling") {
    steps.push("Unit sedang memanggil antrian Anda.");
  } else if (status === "in-service") {
    steps.push("Sesi layanan sedang berlangsung di unit tujuan.");
  } else if (status === "completed") {
    steps.push("Layanan selesai dan ditutup oleh petugas.");
  } else if (status === "unprocessed") {
    steps.push(APPOINTMENT_UNPROCESSED_NOTE);
  } else if (status === "cancelled") {
    steps.push(
      autoCancelled
        ? "Pengguna tidak hadir pada tanggal layanan, sehingga antrian dibatalkan otomatis oleh sistem."
        : "Antrian dibatalkan sebelum sesi layanan berlangsung.",
    );
  } else if (status === "no-show") {
    steps.push("Antrian ditutup karena tidak ada check-in pada jadwal yang ditentukan.");
  }

  return steps;
}

function normalizeQueueDisplayValue(value: unknown) {
  const normalizedValue = asString(value).trim().toUpperCase();
  if (!normalizedValue) {
    return "";
  }

  return formatQueueNumberForDisplay(normalizedValue) || normalizedValue;
}

function extractQueueSequence(value: unknown) {
  const normalizedValue = normalizeQueueDisplayValue(value);
  if (!normalizedValue) {
    return null;
  }

  const sequenceSegment = normalizedValue.split("-").at(-1) || "";
  if (!/^\d+$/.test(sequenceSegment)) {
    return null;
  }

  const sequence = Number.parseInt(sequenceSegment, 10);
  return Number.isFinite(sequence) && sequence > 0 ? sequence : null;
}

function extractQueueSeries(value: unknown, fallbackServiceId = "") {
  const normalizedValue = normalizeQueueDisplayValue(value);
  if (normalizedValue) {
    const parts = normalizedValue.split("-");
    const sequenceSegment = parts.at(-1) || "";
    if (parts.length >= 2 && /^\d+$/.test(sequenceSegment)) {
      return parts.slice(0, -1).join("-");
    }
  }

  return asString(fallbackServiceId).trim().toUpperCase();
}

function buildQueueGroupKey(date: string, series: string) {
  return `${date}::${series}`;
}

function buildUnitQuotaKey(date: string, unorId: string) {
  return `${date}::${String(unorId).trim()}`;
}

function buildQueueProgressEntry(appointment: Record<string, unknown>) {
  const serviceId = asString(appointment.serviceId ?? appointment.service_id)
    .trim()
    .toUpperCase();
  const date = asString(appointment.date ?? appointment.appointment_date).trim();
  const rawQueueNumber =
    asString(appointment.queueNumber ?? appointment.queue_number)
      .trim()
      .toUpperCase() || serviceId;
  const sequence = extractQueueSequence(rawQueueNumber);
  const series = extractQueueSeries(rawQueueNumber, serviceId);
  const note =
    asString(appointment.staffNote).trim() ||
    asString(appointment.staff_note).trim() ||
    asString(appointment.note).trim();
  const resolvedStatus = resolveEffectiveUserAppointmentStatus({
    status: appointment.status,
    date,
    endTime: asString(appointment.endTime ?? appointment.end_time).trim(),
    autoCancelled: Boolean(appointment.autoCancelled ?? appointment.auto_cancelled),
    note,
  });
  const checkedIn = Boolean(appointment.checkedIn ?? appointment.checked_in);
  const callCount = asNumber(
    appointment.callCount ?? appointment.call_count,
    0,
  );
  const status =
    ["calling", "in-service", "completed", "unprocessed", "cancelled", "no-show"].includes(
      resolvedStatus.status,
    )
      ? resolvedStatus.status
      : checkedIn && callCount > 0
        ? "calling"
        : resolvedStatus.status;

  if (!date || !series || sequence === null) {
    return null;
  }

  return {
    date,
    series,
    sequence,
    status,
    serviceId,
  } satisfies QueueProgressEntry;
}

function buildQueueMetricsByAppointmentId(
  data: LiveScopedResponse,
  appointments: UserAppointmentPresentation[],
  queueProgressByGroupKey?: Map<string, QueueGroupProgressSummary>,
) {
  const normalizedRuntimeData = normalizeBookingRuntimeData(data);
  const runtimeServices = normalizedRuntimeData?.services ?? [];
  const runtimeUnorConfigs = normalizedRuntimeData?.unorConfigs ?? [];
  const serviceById = new Map(runtimeServices.map((service) => [service.id, service] as const));
  const rawAppointments = Array.isArray(data.appointments) ? data.appointments : [];
  const queueEntries = rawAppointments
    .map(asRecord)
    .filter((appointment): appointment is Record<string, unknown> => Boolean(appointment))
    .map(buildQueueProgressEntry)
    .filter((entry): entry is QueueProgressEntry => entry !== null);
  const entriesByGroupKey = new Map<string, QueueProgressEntry[]>();
  const activeQuotaStatuses = new Set(["booked", "confirmed", "calling", "in-service"]);
  const activeQuotaCountByUnitDateKey = new Map<string, number>();

  for (const entry of queueEntries) {
    const groupKey = buildQueueGroupKey(entry.date, entry.series);
    if (!entriesByGroupKey.has(groupKey)) {
      entriesByGroupKey.set(groupKey, []);
    }

    entriesByGroupKey.get(groupKey)?.push(entry);

    const serviceConfig = serviceById.get(entry.serviceId);
    if (!serviceConfig || !activeQuotaStatuses.has(entry.status)) {
      continue;
    }

    const unitQuotaKey = buildUnitQuotaKey(entry.date, serviceConfig.unorId);
    activeQuotaCountByUnitDateKey.set(
      unitQuotaKey,
      (activeQuotaCountByUnitDateKey.get(unitQuotaKey) ?? 0) + 1,
    );
  }

  const groupMetrics = new Map<
    string,
    Pick<
      UserQueueOverviewMetrics,
      | "totalQueueCount"
      | "remainingQueueCount"
      | "currentServingQueueNumber"
      | "currentServingSequence"
    > & {
      beforeYourTurnAnchorSequence: number;
    }
  >();

  for (const [groupKey, entries] of entriesByGroupKey.entries()) {
    const serviceId = entries[0]?.serviceId ?? "";
    const serviceConfig = serviceById.get(serviceId);
    const unorConfig = runtimeUnorConfigs.find(
      (entry) => entry.unorId === serviceConfig?.unorId,
    );
    const configuredDailyQuota =
      unorConfig && Number.isFinite(unorConfig.dailyQuota) && unorConfig.dailyQuota >= 0
        ? Math.trunc(unorConfig.dailyQuota)
        : null;
    const remainingDailyQuota =
      configuredDailyQuota === null || !serviceConfig
        ? null
        : Math.max(
            0,
            configuredDailyQuota -
              (activeQuotaCountByUnitDateKey.get(
                buildUnitQuotaKey(entries[0]?.date ?? "", serviceConfig.unorId),
              ) ?? 0),
          );
    const activeServingSequences = entries
      .filter((entry) => ["calling", "in-service"].includes(entry.status))
      .map((entry) => entry.sequence);
    const completedSequences = entries
      .filter((entry) => entry.status === "completed")
      .map((entry) => entry.sequence);
    const activeServingSequence =
      activeServingSequences.length > 0 ? Math.max(...activeServingSequences) : null;
    const lastCompletedSequence =
      completedSequences.length > 0 ? Math.max(...completedSequences) : null;
    const currentServingSequence =
      activeServingSequence ??
      (lastCompletedSequence !== null ? lastCompletedSequence + 1 : null);
    const beforeYourTurnAnchorSequence =
      currentServingSequence ??
      (lastCompletedSequence !== null ? lastCompletedSequence + 1 : 1);
    const authoritativeProgress = queueProgressByGroupKey?.get(groupKey);

    groupMetrics.set(groupKey, {
      totalQueueCount: configuredDailyQuota,
      remainingQueueCount: remainingDailyQuota,
      currentServingQueueNumber:
        authoritativeProgress?.currentServingQueueNumber ?? null,
      currentServingSequence:
        authoritativeProgress?.currentServingSequence ?? currentServingSequence,
      beforeYourTurnAnchorSequence:
        authoritativeProgress?.beforeYourTurnAnchorSequence ??
        beforeYourTurnAnchorSequence,
    });
  }

  return Object.fromEntries(
    appointments.map((appointment) => {
      const queueSequence = extractQueueSequence(
        appointment.rawQueueNumber || appointment.queueNumber,
      );
      const queueSeries = extractQueueSeries(
        appointment.rawQueueNumber || appointment.queueNumber,
        appointment.serviceId,
      );
      const groupKey = buildQueueGroupKey(appointment.date, queueSeries);
      const metrics = groupMetrics.get(groupKey);

      return [
        appointment.id,
        {
          queueSequence,
          totalQueueCount: metrics?.totalQueueCount ?? null,
          remainingQueueCount: metrics?.remainingQueueCount ?? null,
          currentServingQueueNumber: metrics?.currentServingQueueNumber ?? null,
          currentServingSequence: metrics?.currentServingSequence ?? null,
          beforeYourTurnCount:
            queueSequence !== null && metrics
              ? Math.max(queueSequence - metrics.beforeYourTurnAnchorSequence, 0)
              : null,
        } satisfies UserQueueOverviewMetrics,
      ] as const;
    }),
  );
}

function buildLookupFallbackQueueMetrics(
  appointments: UserAppointmentPresentation[],
  queueProgressByGroupKey?: Map<string, QueueGroupProgressSummary>,
) {
  return Object.fromEntries(
    appointments.map((appointment) => {
      const queueSequence = extractQueueSequence(
        appointment.rawQueueNumber || appointment.queueNumber,
      );
      const queueSeries = extractQueueSeries(
        appointment.rawQueueNumber || appointment.queueNumber,
        appointment.serviceId,
      );
      const groupKey = buildQueueGroupKey(appointment.date, queueSeries);
      const progress = queueProgressByGroupKey?.get(groupKey);

      return [
        appointment.id,
        {
          queueSequence,
          totalQueueCount: null,
          remainingQueueCount: null,
          currentServingQueueNumber: progress?.currentServingQueueNumber ?? null,
          currentServingSequence: progress?.currentServingSequence ?? null,
          beforeYourTurnCount:
            queueSequence !== null && progress
              ? Math.max(queueSequence - progress.beforeYourTurnAnchorSequence, 0)
              : null,
        } satisfies UserQueueOverviewMetrics,
      ] as const;
    }),
  );
}

function shouldTrackQueueProgressForAppointment(
  appointment: UserAppointmentPresentation,
) {
  return ["booked", "confirmed", "escalated", "calling", "in-service"].includes(
    appointment.status,
  );
}

function buildQueueProgressRequests(
  appointments: UserAppointmentPresentation[] | null,
) {
  if (!appointments?.length) {
    return [];
  }

  const requests = appointments
    .filter(shouldTrackQueueProgressForAppointment)
    .map((appointment) => {
      const serviceId = asString(appointment.serviceId).trim().toUpperCase();
      const date = asString(appointment.date).trim();
      const series = extractQueueSeries(
        appointment.rawQueueNumber || appointment.queueNumber,
        serviceId,
      );

      if (!serviceId || !date || !series) {
        return null;
      }

      return {
        serviceId,
        date,
        series,
      } satisfies QueueProgressRequest;
    })
    .filter((entry): entry is QueueProgressRequest => entry !== null)
    .sort((left, right) =>
      `${left.date}::${left.series}`.localeCompare(`${right.date}::${right.series}`),
    );

  return Array.from(
    new Map(
      requests.map((entry) => [
        buildQueueGroupKey(entry.date, entry.series),
        entry,
      ]),
    ).values(),
  );
}

function buildQueueGroupProgressMap(
  summaries: QueueProgressSummary[] | undefined,
) {
  return new Map(
    (summaries ?? []).map((summary) => [
      buildQueueGroupKey(summary.date, summary.series),
      {
        currentServingQueueNumber: summary.currentServingQueueNumber,
        currentServingSequence: summary.currentServingSequence,
        beforeYourTurnAnchorSequence: summary.beforeYourTurnAnchorSequence,
      } satisfies QueueGroupProgressSummary,
    ]),
  );
}

function mapLiveAppointmentsToPresentation(
  data: LiveScopedResponse,
  currentUserId: string,
) {
  const users = Array.isArray(data.users) ? data.users : [];
  const services = Array.isArray(data.services) ? data.services : [];
  const units = Array.isArray(data.units) ? data.units : [];
  const appointments = Array.isArray(data.appointments) ? data.appointments : [];

  const currentUser = users
    .map(asRecord)
    .find((user) => asString(user?.id).trim() === currentUserId);

  const unitNameById = new Map(
    units
      .map(asRecord)
      .filter((unit): unit is Record<string, unknown> => Boolean(unit))
      .map((unit) => [asString(unit.id).trim().toUpperCase(), asString(unit.name).trim()]),
  );

  const runtimeServiceById = new Map(
    services
      .map(asRecord)
      .filter((service): service is Record<string, unknown> => Boolean(service))
      .map((service) => [asString(service.id).trim().toUpperCase(), service]),
  );

  return appointments
    .map(asRecord)
    .filter((appointment): appointment is Record<string, unknown> => Boolean(appointment))
    .filter((appointment) => asString(appointment.userId).trim() === currentUserId)
    .map((appointment) => {
      const serviceId = asString(appointment.serviceId).trim().toUpperCase();
      const serviceRegistry = getBookingServiceById(serviceId);
      const runtimeService = runtimeServiceById.get(serviceId);
      const unitId = serviceRegistry?.unitId || asString(runtimeService?.unorId).trim().toUpperCase();
      const unitLabel =
        serviceRegistry?.unitLabel ||
        unitNameById.get(unitId) ||
        asString(runtimeService?.name).trim() ||
        unitId ||
        "Unit layanan LKPP";
      const serviceTitle =
        serviceRegistry?.title ||
        asString(runtimeService?.name).trim() ||
        serviceId;
      const officialName =
        serviceRegistry?.officialName ||
        asString(runtimeService?.description).trim() ||
        serviceTitle;
      const groupLabel = serviceRegistry?.groupLabel || "Layanan LKPP";
      const date = asString(appointment.date).trim();
      const note =
        asString(appointment.staffNote).trim() ||
        asString(appointment.staff_note).trim() ||
        asString(appointment.note).trim();
      const resolvedStatus = resolveEffectiveUserAppointmentStatus({
        status: appointment.status,
        date,
        endTime: asString(appointment.endTime).trim(),
        autoCancelled: Boolean(appointment.autoCancelled),
        note,
      });
      const status = resolvedStatus.status;
      const checkedIn = Boolean(appointment.checkedIn);
      const rawQueueNumber =
        asString(appointment.queueNumber).trim().toUpperCase() || serviceId;
      const queueNumber = formatQueueNumberForDisplay(rawQueueNumber) || rawQueueNumber;
      const guestCount = Math.max(asNumber(appointment.jumlahTamu, 1), 1);
      const userOrigin = asString(currentUser?.asalInstansi).trim();
      const applicantCategory = asString(appointment.applicantCategory).trim();
      const institutionName = asString(appointment.institutionName).trim();
      const serviceTopic = asString(appointment.serviceTopic).trim();
      const createdAt =
        asString(appointment.createdAt).trim() ||
        asString(appointment.created_at).trim();

      return {
        id: asString(appointment.id).trim() || queueNumber,
        qrToken:
          asString(appointment.qrToken).trim() ||
          asString(appointment.qr_token).trim() ||
          undefined,
        createdAt: createdAt || undefined,
        queueNumber,
        rawQueueNumber,
        counterId: typeof appointment.counterId === "number" ? appointment.counterId : undefined,
        serviceId,
        applicantCategory: applicantCategory || undefined,
        institutionName: institutionName || undefined,
        serviceTopic: serviceTopic || undefined,
        date,
        dateLabel: formatDateLabel(date),
        timeRange: `${asString(appointment.startTime).trim()} - ${asString(appointment.endTime).trim()} WIB`,
        status,
        complaint:
          asString(appointment.complaint).trim() || "Belum ada rincian tambahan.",
        guestCount,
        asalInstansi: userOrigin || "Instansi belum diisi",
        location: `Frontdesk LKPP → ${unitLabel}`,
        checkedIn,
        callCount: asNumber(appointment.callCount, 0),
        autoCancelled: resolvedStatus.autoCancelled,
        canCancel: ["booked", "confirmed"].includes(status),
        summaryNote: buildSummaryNote(status, resolvedStatus.autoCancelled),
        activityLog: buildActivityLog(status, checkedIn, resolvedStatus.autoCancelled),
        preparationChecklist:
          serviceRegistry?.preparationNotes || ["Siapkan dokumen pendukung dan datang sesuai jadwal layanan."],
        serviceTitle,
        serviceOfficialName: officialName,
        serviceGroupLabel: groupLabel,
        unitLabel,
      } satisfies UserAppointmentPresentation;
    })
    .sort((left, right) => {
      const leftKey = `${left.date} ${left.timeRange}`;
      const rightKey = `${right.date} ${right.timeRange}`;
      return leftKey.localeCompare(rightKey);
    });
}

function mapLookupAppointmentsToPresentation(matches: QueueLookupMatch[]) {
  return matches.map((appointment) => {
    const serviceRegistry = getBookingServiceById(appointment.serviceId);
    const serviceTitle = serviceRegistry?.title || appointment.serviceTitle || appointment.serviceId;
    const officialName = serviceRegistry?.officialName || appointment.serviceTitle || serviceTitle;
    const groupLabel = serviceRegistry?.groupLabel || "Layanan LKPP";
    const resolvedStatus = resolveEffectiveUserAppointmentStatus({
      status: appointment.status,
      date: appointment.date,
      endTime:
        appointment.timeRange
          .split("-")
          .map((segment) => segment.replace(/\bWIB\b/i, "").trim())[1] ?? "",
      autoCancelled: false,
      note: appointment.summaryNote,
    });
    const status = resolvedStatus.status;

    return {
      id: appointment.id,
      createdAt: undefined,
      queueNumber: formatQueueNumberForDisplay(appointment.queueNumber),
      rawQueueNumber: String(appointment.queueNumber || "").trim().toUpperCase(),
      counterId: appointment.counterId,
      serviceId: appointment.serviceId,
      date: appointment.date,
      dateLabel: appointment.dateLabel,
      timeRange: appointment.timeRange,
      status,
      complaint: "Rincian layanan dapat dilihat dari detail antrian.",
      guestCount: 1,
      asalInstansi: "Instansi belum tersedia",
      location: `Frontdesk LKPP → ${appointment.unitLabel}`,
      checkedIn: appointment.checkedIn,
      callCount: appointment.callCount,
      autoCancelled: resolvedStatus.autoCancelled,
      canCancel: ["booked", "confirmed"].includes(status),
      summaryNote: buildSummaryNote(status, resolvedStatus.autoCancelled),
      activityLog: buildActivityLog(
        status,
        appointment.checkedIn,
        resolvedStatus.autoCancelled,
      ),
      preparationChecklist:
        serviceRegistry?.preparationNotes || ["Siapkan dokumen pendukung dan hadir sesuai jadwal layanan."],
      serviceTitle,
      serviceOfficialName: officialName,
      serviceGroupLabel: groupLabel,
      unitLabel: appointment.unitLabel,
    } satisfies UserAppointmentPresentation;
  });
}

function isLookupFallbackPayload(value: unknown): value is LookupFallbackPayload {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { kind?: unknown }).kind === "lookup-fallback" &&
      Array.isArray((value as { appointments?: unknown }).appointments),
  );
}

function shouldUseFastRefreshForAppointment(
  status: UserAppointmentPresentation["status"],
  checkedIn: boolean,
  date: string,
  todayKey: string,
) {
  if (checkedIn || status === "calling" || status === "in-service") {
    return true;
  }

  return (
    date === todayKey &&
    ["booked", "confirmed", "escalated"].includes(status)
  );
}

function shouldUseFastUserRefresh(
  data: unknown,
  userId: string,
  userEmail: string,
) {
  if (!data) {
    return false;
  }

  const todayKey = getJakartaTodayDateKey();

  if (isLookupFallbackPayload(data)) {
    return data.appointments.some(
      (appointment) =>
        shouldUseFastRefreshForAppointment(
          appointment.status,
          Boolean(appointment.checkedIn),
          appointment.date,
          todayKey,
        ),
    );
  }

  const runtimeData = data as LiveScopedResponse;
  const appointments = Array.isArray(runtimeData.appointments)
    ? runtimeData.appointments
    : [];

  return appointments
    .map(asRecord)
    .filter((appointment): appointment is Record<string, unknown> => Boolean(appointment))
    .filter((appointment) => {
      const appointmentUserId = asString(appointment.userId).trim();
      const appointmentUserEmail = asString(
        appointment.userEmail ?? appointment.user_email,
      )
        .trim()
        .toLowerCase();

      return (
        (appointmentUserId && appointmentUserId === userId) ||
        (appointmentUserEmail && appointmentUserEmail === userEmail)
      );
    })
    .some((appointment) => {
      const date = asString(appointment.date ?? appointment.appointment_date).trim();
      const checkedIn = Boolean(appointment.checkedIn ?? appointment.checked_in);
      const status = resolveEffectiveUserAppointmentStatus({
        status: appointment.status,
        date,
        endTime: asString(appointment.endTime ?? appointment.end_time).trim(),
        note:
          asString(appointment.staffNote).trim() ||
          asString(appointment.staff_note).trim() ||
          asString(appointment.note).trim(),
        autoCancelled: Boolean(appointment.autoCancelled ?? appointment.auto_cancelled),
      }).status;

      return shouldUseFastRefreshForAppointment(
        status,
        checkedIn,
        date,
        todayKey,
      );
    });
}

async function fetchLookupFallbackAppointments(email: string) {
  const response = await fetch("/api/public/queue-lookup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ lookup: email }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    matches?: QueueLookupMatch[];
  };

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Gagal memuat antrian pengguna.");
  }

  return mapLookupAppointmentsToPresentation(
    Array.isArray(payload.matches) ? payload.matches : [],
  );
}

async function fetchQueueProgressSummaries(
  requests: QueueProgressRequest[],
) {
  if (!requests.length) {
    return [] as QueueProgressSummary[];
  }

  const response = await fetch("/api/public/queue-progress", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    progress?: QueueProgressSummary[];
  };

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Gagal memuat progres antrean.");
  }

  return Array.isArray(payload.progress) ? payload.progress : [];
}

export function seedLiveUserAppointmentCache(
  queryClient: QueryClient,
  userId: string,
  appointment: LiveAppointmentSeed,
) {
  queryClient.setQueryData<LiveScopedResponse>(["user-live-appointments", userId], (current) => {
    const currentAppointments = Array.isArray(current?.appointments) ? current?.appointments : [];
    const nextAppointment = { ...appointment, userId };
    const nextAppointments = currentAppointments
      .filter((entry) => Boolean(asRecord(entry)))
      .filter((entry) => asRecord(entry)?.id !== nextAppointment.id)
      .concat(nextAppointment);

    return {
      ...(current ?? {}),
      appointments: nextAppointments,
    };
  });
}

export function useLiveUserAppointments() {
  const session = React.useMemo(() => readMockSession(), []);
  const userId =
    session?.authMode === "live" && session.userId ? session.userId.trim() : "";
  const userEmail =
    session?.authMode === "live" && session.email ? session.email.trim().toLowerCase() : "";

  const query = useQuery({
    queryKey: ["user-live-appointments", userId],
    enabled: Boolean(userId),
    staleTime: FAST_USER_REFRESH_INTERVAL_MS,
    refetchInterval: userId
      ? (currentQuery) =>
          shouldUseFastUserRefresh(currentQuery.state.data, userId, userEmail)
            ? FAST_USER_REFRESH_INTERVAL_MS
            : DEFAULT_USER_REFRESH_INTERVAL_MS
      : false,
    refetchIntervalInBackground: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      try {
        const response = await getScopedData({ userId });
        return response.data as LiveScopedResponse;
      } catch (error) {
        if (!userEmail) {
          throw error;
        }

        const appointments = await fetchLookupFallbackAppointments(userEmail);
        return {
          kind: "lookup-fallback",
          appointments,
        } satisfies LookupFallbackPayload;
      }
    },
  });

  const appointments = React.useMemo(() => {
    if (!query.data || !userId) {
      return null;
    }

    if (isLookupFallbackPayload(query.data)) {
      return query.data.appointments;
    }

    return mapLiveAppointmentsToPresentation(query.data, userId);
  }, [query.data, userId]);

  const queueProgressRequests = React.useMemo(
    () => buildQueueProgressRequests(appointments),
    [appointments],
  );

  const queueProgressQuery = useQuery({
    queryKey: ["user-queue-progress", queueProgressRequests],
    enabled: queueProgressRequests.length > 0,
    staleTime: FAST_USER_REFRESH_INTERVAL_MS,
    refetchInterval: queueProgressRequests.length
      ? FAST_USER_REFRESH_INTERVAL_MS
      : false,
    refetchIntervalInBackground: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    queryFn: async () => fetchQueueProgressSummaries(queueProgressRequests),
  });

  const availableServiceCount = React.useMemo(() => {
    if (!query.data || isLookupFallbackPayload(query.data)) {
      return null;
    }

    const runtimeData = query.data as LiveScopedResponse;
    if (!Array.isArray(runtimeData.services)) {
      return null;
    }

    const enabledServiceIds = new Set(
      runtimeData.services
        .map(asRecord)
        .filter((service): service is Record<string, unknown> => Boolean(service))
        .filter(isRuntimeServiceEnabled)
        .map((service) => asString(service.id).trim().toUpperCase())
        .filter(Boolean),
    );

    return enabledServiceIds.size;
  }, [query.data]);

  const queueMetricsByAppointmentId = React.useMemo(() => {
    if (!appointments) {
      return {} as Record<string, UserQueueOverviewMetrics>;
    }

    const queueProgressByGroupKey = buildQueueGroupProgressMap(
      queueProgressQuery.data,
    );

    if (!query.data || isLookupFallbackPayload(query.data)) {
      return buildLookupFallbackQueueMetrics(
        appointments,
        queueProgressByGroupKey,
      );
    }

    return buildQueueMetricsByAppointmentId(
      query.data,
      appointments,
      queueProgressByGroupKey,
    );
  }, [appointments, query.data, queueProgressQuery.data]);

  return {
    session,
    isLiveSession: Boolean(userId),
    appointments,
    queueMetricsByAppointmentId,
    availableServiceCount,
    currentCallingAppointment:
      appointments?.find((appointment) => appointment.status === "calling") ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
}
