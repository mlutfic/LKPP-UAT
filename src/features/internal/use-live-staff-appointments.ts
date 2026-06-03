"use client";

import * as React from "react";
import { useQuery, type QueryClient } from "@tanstack/react-query";

import {
  getBookingServiceById,
  getBookingUnitEntryById,
  inferBookingServiceLevel,
} from "@/content/service-booking-content";
import { useAuthSessionQuery } from "@/features/auth/hooks/use-auth-session-query";
import { getInternalAppointmentStatusLabel } from "@/features/internal/internal-appointment-status";
import { getAdminServiceLevels } from "@/lib/api/admin-service-levels";
import {
  APPOINTMENT_UNPROCESSED_NOTE,
  appendAppointmentAutoCloseNote,
} from "@/lib/appointment-auto-close";
import { getScopedData } from "@/lib/api/services";
import { readMockSession } from "@/lib/mock-auth";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";

const STAFF_LIVE_REFRESH_INTERVAL_MS = 3_000;
const UNIT_STAFF_LIVE_REFRESH_INTERVAL_MS = 1_000;

type UseLiveStaffAppointmentsOptions = {
  refreshIntervalMs?: number | false;
};

type LiveScopedResponse = {
  users?: unknown[];
  units?: unknown[];
  services?: unknown[];
  appointments?: unknown[];
  staff?: unknown[];
  settings?: unknown;
  unorConfigs?: unknown[];
  serviceLevels?: unknown[];
};

function asObjectRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function mergeUniqueRows(
  primary: unknown[] | undefined,
  secondary: unknown[] | undefined,
  keyCandidates: string[],
) {
  const result: unknown[] = [];
  const indexByKey = new Map<string, number>();

  for (const source of [primary ?? [], secondary ?? []]) {
    for (const entry of source) {
      const record = asObjectRecord(entry);
      const key =
        keyCandidates
          .map((candidate) => asString(record?.[candidate]).trim())
          .find(Boolean) ?? "";

      if (key && indexByKey.has(key)) {
        const currentIndex = indexByKey.get(key) ?? -1;
        const currentValue = currentIndex >= 0 ? result[currentIndex] : undefined;
        const currentRecord = asObjectRecord(currentValue);

        result[currentIndex] =
          currentRecord && record
            ? {
                ...currentRecord,
                ...record,
              }
            : entry;
        continue;
      }

      const nextIndex = result.push(entry) - 1;
      if (key) {
        indexByKey.set(key, nextIndex);
      }
    }
  }

  return result;
}

function mergeLiveScopedResponses(
  base: LiveScopedResponse,
  supplement?: LiveScopedResponse | null,
) {
  if (!supplement) {
    return base;
  }

  return {
    ...base,
    appointments: mergeUniqueRows(base.appointments, supplement.appointments, [
      "id",
      "queue_number",
      "queueNumber",
    ]),
    users: mergeUniqueRows(base.users, supplement.users, ["id"]),
    services: mergeUniqueRows(base.services, supplement.services, ["id"]),
    units: mergeUniqueRows(base.units, supplement.units, ["id"]),
    staff: mergeUniqueRows(base.staff, supplement.staff, ["id"]),
    unorConfigs: mergeUniqueRows(base.unorConfigs, supplement.unorConfigs, ["id"]),
  } satisfies LiveScopedResponse;
}

export type LiveStaffAppointment = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  userId: string;
  userName: string;
  userNik: string;
  queueNumber: string;
  rawQueueNumber: string;
  serviceId: string;
  serviceLevel: 1 | 2;
  unitId: string;
  serviceTitle: string;
  unitLabel: string;
  date: string;
  status: string;
  rawStatus: string;
  autoCancelled: boolean;
  checkedIn: boolean;
  callCount: number;
  startTime?: string;
  priorityReason?: string | null;
  complaint: string;
  note: string;
  staffProcessNote?: string | null;
  isEscalated?: boolean;
  escalationOriginLabel?: string | null;
  escalationReason?: string | null;
  escalationSummary?: string | null;
  counterId?: number;
  originCounterId?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown) {
  return Boolean(value);
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeServiceLevel(value: unknown, fallback: 1 | 2 = 1): 1 | 2 {
  if (value === 2 || value === "2") {
    return 2;
  }

  if (value === 1 || value === "1") {
    return 1;
  }

  return fallback;
}

function extractOriginCounterContext(note: string) {
  const lines = note
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let originCounterId: number | null = null;
  const cleanedLines = lines.filter((line) => {
    const match = line.match(/^Asal loket:\s*Loket\s+(\d+)$/i);
    if (!match) {
      return true;
    }

    const parsed = Number.parseInt(match[1] || "", 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      originCounterId = parsed;
    }

    return false;
  });

  return {
    originCounterId,
    note: cleanedLines.join("\n"),
  };
}

function extractEscalationSummary(note: string) {
  const lines = note
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const summary =
    lines.find((line) =>
      /^eskalasi\b/i.test(line) ||
      /^asal eskalasi\b/i.test(line) ||
      /^pindah layanan\b/i.test(line),
    ) ?? null;

  if (!summary) {
    return null;
  }

  const escalationMatch = summary.match(/^Eskalasi dari (.+?) ke (.+?)(?:\. Alasan: (.+))?$/i);
  if (escalationMatch) {
    return {
      summary,
      originLabel: escalationMatch[1]?.trim() || null,
      targetLabel: escalationMatch[2]?.trim() || null,
      reason: escalationMatch[3]?.trim() || null,
    };
  }

  const reassignMatch = summary.match(/^Pindah layanan ke (.+?)(?:\. Catatan: (.+))?$/i);
  if (reassignMatch) {
    return {
      summary,
      originLabel: null,
      targetLabel: reassignMatch[1]?.trim() || null,
      reason: reassignMatch[2]?.trim() || null,
    };
  }

  const originOnlyMatch = summary.match(/^Asal eskalasi:\s*(.+)$/i);
  if (originOnlyMatch) {
    return {
      summary,
      originLabel: originOnlyMatch[1]?.trim() || null,
      targetLabel: null,
      reason: null,
    };
  }

  return {
    summary,
    originLabel: null,
    targetLabel: null,
    reason: null,
  };
}

function mapLiveAppointmentsToRows(
  data: LiveScopedResponse,
  sessionRole?: string,
) {
  const users = Array.isArray(data.users) ? data.users : [];
  const units = Array.isArray(data.units) ? data.units : [];
  const services = Array.isArray(data.services) ? data.services : [];
  const appointments = Array.isArray(data.appointments) ? data.appointments : [];

  const userNameById = new Map(
    users
      .map(asRecord)
      .filter((user): user is Record<string, unknown> => Boolean(user))
      .map((user) => [asString(user.id).trim(), asString(user.name).trim()]),
  );
  const userNikById = new Map(
    users
      .map(asRecord)
      .filter((user): user is Record<string, unknown> => Boolean(user))
      .map((user) => [asString(user.id).trim(), asString(user.nik).trim()]),
  );

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
  const serviceLevelById = new Map(
    (Array.isArray(data.serviceLevels) ? data.serviceLevels : [])
      .map(asRecord)
      .filter((entry): entry is Record<string, unknown> => Boolean(entry))
      .map((entry) => [
        asString(entry.serviceId || entry.id).trim().toUpperCase(),
        normalizeServiceLevel(entry.serviceLevel ?? entry.service_level, 1),
      ]),
  );

  return appointments
    .map(asRecord)
    .filter((appointment): appointment is Record<string, unknown> => Boolean(appointment))
    .map((appointment) => {
      const serviceId = asString(appointment.serviceId || appointment.service_id)
        .trim()
        .toUpperCase();
      const service = getBookingServiceById(serviceId);
      const runtimeService = runtimeServiceById.get(serviceId);
      const resolvedServiceLevel = normalizeServiceLevel(
        serviceLevelById.get(serviceId) ??
          runtimeService?.serviceLevel ??
          runtimeService?.service_level,
        service?.serviceLevel ?? 1,
      );
      const serviceLevel = inferBookingServiceLevel(
        serviceId,
        resolvedServiceLevel,
      );
      const unitId =
        service?.unitId ||
        asString(appointment.unitId || appointment.unit_id).trim().toUpperCase() ||
        asString(runtimeService?.unorId).trim().toUpperCase() ||
        asString(runtimeService?.unor_id).trim().toUpperCase() ||
        asString(runtimeService?.unitId).trim().toUpperCase();
      const unitEntry = unitId ? getBookingUnitEntryById(unitId) : null;
      const checkedIn = asBoolean(appointment.checkedIn ?? appointment.checked_in);
      const appointmentDate =
        asString(appointment.date || appointment.appointment_date).trim();
      const rawStatus = asString(appointment.status).trim();
      const autoCancelled = asBoolean(
        appointment.autoCancelled ?? appointment.auto_cancelled,
      );
      const rawQueueNumber =
        asString(appointment.queueNumber || appointment.queue_number)
          .trim()
          .toUpperCase() ||
        asString(appointment.id).trim().toUpperCase() ||
        serviceId;
      const queueNumber = formatQueueNumberForDisplay(rawQueueNumber) || rawQueueNumber;
      const userId = asString(appointment.userId || appointment.user_id).trim();
      const complaint = asString(appointment.complaint).trim();
      const rawStaffNote =
        asString(appointment.note).trim() ||
        asString(appointment.staffNote || appointment.staff_note).trim();
      const originCounterContext = extractOriginCounterContext(rawStaffNote);
      const staffNote = originCounterContext.note;
      const priorityOverride = asRecord(
        appointment.priorityOverride ?? appointment.priority_override,
      );
      const priorityReason = asString(priorityOverride?.reason).trim() || null;
      const callCount = asNumber(
        appointment.callCount ?? appointment.call_count,
        0,
      );
      const counterId = asNumber(
        appointment.counterId ?? appointment.counter_id,
        0,
      );
      const startTime =
        asString(appointment.startTime || appointment.start_time).trim() ||
        undefined;
      const escalationSummary = extractEscalationSummary(staffNote);
      const processNote = (
        escalationSummary
          ? staffNote.replace(escalationSummary.summary, "").trim()
          : staffNote
      ).trim();
      const normalizedStatus = getInternalAppointmentStatusLabel({
        status: rawStatus,
        checkedIn,
        autoCancelled,
      });
      const autoClosedUnprocessed = rawStatus === "unprocessed";
      const closureNote =
        autoClosedUnprocessed
          ? APPOINTMENT_UNPROCESSED_NOTE
          : rawStatus.trim().toLowerCase() === "cancelled"
          ? autoCancelled
            ? "Antrean dibatalkan otomatis oleh sistem."
            : "Antrean dibatalkan oleh pengguna."
          : checkedIn
            ? "Tamu sudah check-in."
            : "Menunggu konfirmasi kehadiran.";
      const noteParts = [
        escalationSummary?.summary,
        complaint,
        processNote,
        closureNote,
      ].filter(Boolean);
      const resolvedUnitLabel =
        sessionRole === "supervisor-monitoring" && escalationSummary?.originLabel
          ? escalationSummary.originLabel
          : service?.unitLabel ||
            unitEntry?.label ||
            unitNameById.get(unitId) ||
            "Unit layanan LKPP";

      return {
        id: asString(appointment.id).trim() || queueNumber,
        createdAt:
          asString(appointment.createdAt || appointment.created_at).trim() || undefined,
        updatedAt:
          asString(appointment.updatedAt || appointment.updated_at).trim() || undefined,
        userId,
        userName: userNameById.get(userId) || "Nama tamu belum tersedia",
        userNik: userNikById.get(userId) || "-",
        queueNumber,
        rawQueueNumber,
        serviceId,
        serviceLevel,
        unitId,
        serviceTitle:
        service?.title ||
          asString(appointment.serviceName || appointment.service_name).trim() ||
          asString(runtimeService?.name).trim() ||
          serviceId,
        unitLabel: resolvedUnitLabel,
        date: appointmentDate,
        status: normalizedStatus,
        rawStatus,
        autoCancelled,
        checkedIn,
        callCount,
        startTime,
        priorityReason,
        complaint,
        note: autoClosedUnprocessed
          ? appendAppointmentAutoCloseNote(noteParts.join(" "))
          : noteParts.join(" "),
        staffProcessNote: processNote || null,
        isEscalated: Boolean(escalationSummary),
        escalationOriginLabel: escalationSummary?.originLabel ?? null,
        escalationReason: escalationSummary?.reason ?? null,
        escalationSummary: escalationSummary?.summary ?? null,
        counterId: counterId > 0 ? counterId : undefined,
        originCounterId: originCounterContext.originCounterId ?? undefined,
      } satisfies LiveStaffAppointment;
    })
    .sort((left, right) => left.rawQueueNumber.localeCompare(right.rawQueueNumber));
}

export function seedLiveStaffAppointmentsCache(
  queryClient: QueryClient,
  staffId: string,
  appointmentId: string,
  patch: Record<string, unknown>,
) {
  queryClient.setQueryData<LiveScopedResponse>(["staff-live-appointments", staffId], (current) => {
    const currentAppointments = Array.isArray(current?.appointments) ? current.appointments : [];
    const nextAppointments = currentAppointments.map((entry) => {
      const record = asRecord(entry);
      if (!record || asString(record.id) !== appointmentId) {
        return entry;
      }

      return {
        ...record,
        ...patch,
      };
    });

    return {
      ...(current ?? {}),
      appointments: nextAppointments,
    };
  });
}

export function useLiveStaffAppointments(
  options?: UseLiveStaffAppointmentsOptions,
) {
  const authSessionQuery = useAuthSessionQuery();
  const session = authSessionQuery.data?.session ?? readMockSession();
  const staffId =
    session?.authMode === "live" && session.staffId ? session.staffId.trim() : "";
  const defaultRefreshIntervalMs =
    session?.role === "unit-organisasi"
      ? UNIT_STAFF_LIVE_REFRESH_INTERVAL_MS
      : STAFF_LIVE_REFRESH_INTERVAL_MS;
  const refreshIntervalMs =
    options?.refreshIntervalMs === undefined
      ? defaultRefreshIntervalMs
      : options.refreshIntervalMs;
  const staleTimeMs =
    typeof refreshIntervalMs === "number" ? refreshIntervalMs : 30_000;

  const query = useQuery({
    queryKey: ["staff-live-appointments", staffId],
    enabled: Boolean(staffId),
    placeholderData: (previousData) => previousData,
    staleTime: staleTimeMs,
    refetchInterval: staffId ? refreshIntervalMs : false,
    refetchIntervalInBackground: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (session?.role === "petugas-level-2") {
        const [baseResponse, supplementalResponse, serviceLevelsResponse] = await Promise.all([
          getScopedData({ staffId }),
          fetch("/api/internal/level-2/appointments", {
            method: "GET",
            cache: "no-store",
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          })
            .then(async (result) => {
              const payload = (await result.json().catch(() => ({}))) as {
                ok?: boolean;
                error?: string;
                data?: LiveScopedResponse;
              };

              if (!result.ok || payload.ok === false || !payload.data) {
                return null;
              }

              return payload.data;
            })
            .catch(() => null),
          getAdminServiceLevels().catch(() => ({ serviceLevels: [] })),
        ]);

        const mergedResponse = mergeLiveScopedResponses(
          baseResponse.data as LiveScopedResponse,
          supplementalResponse,
        );

        return {
          ...mergedResponse,
          serviceLevels: serviceLevelsResponse.serviceLevels,
        } satisfies LiveScopedResponse;
      }

      const [response, serviceLevelsResponse] = await Promise.all([
        getScopedData({ staffId }),
        getAdminServiceLevels().catch(() => ({ serviceLevels: [] })),
      ]);

      return {
        ...(response.data as LiveScopedResponse),
        serviceLevels: serviceLevelsResponse.serviceLevels,
      } satisfies LiveScopedResponse;
    },
  });

  const appointments = React.useMemo(
    () => (query.data && staffId ? mapLiveAppointmentsToRows(query.data, session?.role) : null),
    [query.data, session?.role, staffId],
  );

  return {
    session,
    isLiveSession: Boolean(staffId),
    staffId,
    data: query.data ?? null,
    appointments,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
