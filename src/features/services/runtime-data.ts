import type {
  RuntimeAdminSettings,
  RuntimeAppointment,
  RuntimeService,
  RuntimeUnorConfig,
} from "@/features/services/legacy-slot-runtime";

export type BookingRuntimeData = {
  services: RuntimeService[];
  appointments: RuntimeAppointment[];
  settings: RuntimeAdminSettings;
  unorConfigs: RuntimeUnorConfig[];
};

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
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

function asNumberArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === "number" && Number.isFinite(entry)) {
        return entry;
      }

      if (typeof entry === "string" && entry.trim()) {
        const parsed = Number(entry);
        return Number.isFinite(parsed) ? parsed : null;
      }

      return null;
    })
    .filter((entry): entry is number => entry !== null);
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function readRuntimeTimeValue(
  settingsRecord: Record<string, unknown>,
  nestedRecord: Record<string, unknown> | null,
  keys: {
    camel: string;
    snake: string;
  },
  fallback = "",
) {
  return asString(
    nestedRecord?.start ??
      nestedRecord?.start_time ??
      settingsRecord[keys.camel] ??
      settingsRecord[keys.snake],
    fallback,
  );
}

function readRuntimeTimeValueEnd(
  settingsRecord: Record<string, unknown>,
  nestedRecord: Record<string, unknown> | null,
  keys: {
    camel: string;
    snake: string;
  },
  fallback = "",
) {
  return asString(
    nestedRecord?.end ??
      nestedRecord?.end_time ??
      settingsRecord[keys.camel] ??
      settingsRecord[keys.snake],
    fallback,
  );
}

export function normalizeBookingRuntimeData(payload: unknown): BookingRuntimeData | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  const services = Array.isArray(root.services)
    ? root.services
        .map((entry) => {
          const service = asRecord(entry);
          if (!service) {
            return null;
          }

          const id = asString(service.id).trim().toUpperCase();
          const unorId = asString(
            service.unorId ?? service.unor_id ?? service.unitId ?? service.unit_id,
          )
            .trim()
            .toUpperCase();
          if (!id || !unorId) {
            return null;
          }

          return {
            id,
            prefix: asString(service.prefix ?? service.service_prefix, id),
            enabled:
              typeof service.enabled === "boolean"
                ? service.enabled
                : typeof service.is_active === "boolean"
                  ? service.is_active
                  : typeof service.active === "boolean"
                    ? service.active
                    : true,
            slotDurationMinutes: asNumber(
              service.slotDurationMinutes ??
                service.slot_duration_minutes ??
                service.durationMinutes ??
                service.duration_minutes,
              30,
            ),
            dailyQuota: asNumber(
              service.dailyQuota ?? service.daily_quota ?? service.quota_per_day,
              10,
            ),
            unorId,
          } satisfies RuntimeService;
        })
        .filter(isNonNull)
    : [];

  const appointments = Array.isArray(root.appointments)
    ? root.appointments
        .map((entry) => {
          const appointment = asRecord(entry);
          if (!appointment) {
            return null;
          }

          const appointmentId = asString(appointment.id).trim();
          const serviceId = asString(appointment.serviceId ?? appointment.service_id)
            .trim()
            .toUpperCase();
          const date = asString(appointment.date ?? appointment.appointment_date).trim();
          const startTime = asString(appointment.startTime ?? appointment.start_time).trim();
          const queueNumber =
            asString(appointment.queueNumber ?? appointment.queue_number)
              .trim()
              .toUpperCase() ||
            appointmentId.toUpperCase() ||
            `${serviceId}-${date}-${startTime}`.toUpperCase();

          if (!serviceId || !date || !startTime) {
            return null;
          }

          return {
            id: appointmentId || undefined,
            serviceId,
            date,
            startTime,
            endTime:
              asString(appointment.endTime ?? appointment.end_time).trim() || undefined,
            queueNumber,
            status: asString(appointment.status, "booked"),
          } satisfies RuntimeAppointment;
        })
        .filter(isNonNull)
    : [];

  const settingsRecord = asRecord(root.settings);
  const operatingHoursRecord = asRecord(
    settingsRecord?.operatingHours ?? settingsRecord?.operating_hours,
  );
  const breakHoursRecord = asRecord(
    settingsRecord?.breakHours ?? settingsRecord?.break_hours,
  );
  const operatingDaysValue = settingsRecord?.operatingDays ?? settingsRecord?.operating_days;
  const breakStartValue = readRuntimeTimeValue(
    settingsRecord ?? {},
    breakHoursRecord,
    {
      camel: "breakStart",
      snake: "break_start",
    },
  ).trim();
  const breakEndValue = readRuntimeTimeValueEnd(
    settingsRecord ?? {},
    breakHoursRecord,
    {
      camel: "breakEnd",
      snake: "break_end",
    },
  ).trim();
  const settings: RuntimeAdminSettings = {
    operatingHours: {
      start:
        readRuntimeTimeValue(
          settingsRecord ?? {},
          operatingHoursRecord,
          {
            camel: "operatingStart",
            snake: "operating_start",
          },
          "08:00",
        ) || "08:00",
      end:
        readRuntimeTimeValueEnd(
          settingsRecord ?? {},
          operatingHoursRecord,
          {
            camel: "operatingEnd",
            snake: "operating_end",
          },
          "16:00",
        ) || "16:00",
    },
    breakHours:
      breakStartValue || breakEndValue
        ? {
            start: breakStartValue,
            end: breakEndValue,
          }
        : null,
    operatingDays: asNumberArray(operatingDaysValue).length
      ? asNumberArray(operatingDaysValue)
      : [1, 2, 3, 4, 5],
    maxAdvanceBookingDays: asNumber(
      settingsRecord?.maxAdvanceBookingDays ??
        settingsRecord?.max_advance_booking_days,
      30,
    ),
    holidays: asStringArray(settingsRecord?.holidays),
  };

  const unorConfigs = Array.isArray(root.unorConfigs)
    ? root.unorConfigs
        .map((entry) => {
          const config = asRecord(entry);
          if (!config) {
            return null;
          }

          const unorId = asString(config.unorId ?? config.unor_id).trim().toUpperCase();
          if (!unorId) {
            return null;
          }

          return {
            unorId,
            serviceIds: asStringArray(config.serviceIds ?? config.service_ids).map((item) =>
              item.trim().toUpperCase(),
            ),
            dailyQuota: asNumber(config.dailyQuota ?? config.daily_quota, 999),
            holidays: asStringArray(config.holidays),
          } satisfies RuntimeUnorConfig;
        })
        .filter(isNonNull)
    : [];

  return {
    services,
    appointments,
    settings,
    unorConfigs,
  };
}
