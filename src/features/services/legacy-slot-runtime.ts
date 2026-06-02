export type RuntimeService = {
  id: string;
  prefix?: string;
  enabled: boolean;
  slotDurationMinutes: number;
  dailyQuota: number;
  unorId: string;
};

export type RuntimeAppointment = {
  id?: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime?: string;
  queueNumber: string;
  status: string;
};

export type RuntimeAdminSettings = {
  operatingHours: { start: string; end: string };
  breakHours?: { start: string; end: string } | null;
  operatingDays: number[];
  maxAdvanceBookingDays: number;
  holidays?: string[];
};

export type RuntimeUnorConfig = {
  unorId: string;
  serviceIds?: string[];
  dailyQuota: number;
  holidays: string[];
};

export type RuntimeSlot = {
  date: string;
  startTime: string;
  endTime: string;
  serviceId: string;
};

export type RuntimeDateAvailabilityState = "available" | "holiday" | "full" | "closed";

export type RuntimeDateAvailability = {
  slots: number;
  state: RuntimeDateAvailabilityState;
};

type RuntimeSlotAvailabilityContext = {
  service: RuntimeService;
  jakartaNow: ReturnType<typeof getJakartaNowParts>;
  operatingStart: number;
  operatingEnd: number;
  breakRange: { start: number; end: number } | null;
  remainingQuota: number;
  remainingServiceQuota: number;
  bookedTimes: Set<string>;
};

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function getBreakHoursRange(settings: RuntimeAdminSettings) {
  const start = String(settings.breakHours?.start || "").trim();
  const end = String(settings.breakHours?.end || "").trim();

  if (!start || !end) {
    return null;
  }

  return {
    start: timeToMinutes(start),
    end: timeToMinutes(end),
  };
}

function slotOverlapsBreak(
  slotStart: number,
  slotEnd: number,
  settingsOrRange: RuntimeAdminSettings | { start: number; end: number } | null,
) {
  const breakRange =
    settingsOrRange && "operatingHours" in settingsOrRange
      ? getBreakHoursRange(settingsOrRange)
      : settingsOrRange;
  if (!breakRange) {
    return false;
  }

  return slotStart < breakRange.end && slotEnd > breakRange.start;
}

function getDayOfWeek(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).getDay();
}

function getJakartaNowParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "00";

  return {
    date: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    minutes: Number(getPart("hour")) * 60 + Number(getPart("minute")),
  };
}

function isDateValid(dateKey: string, maxAdvanceBookingDays: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(`${dateKey}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  if (date < today) {
    return false;
  }

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxAdvanceBookingDays);
  return date <= maxDate;
}

function isUnorHoliday(unorConfig: RuntimeUnorConfig | undefined, dateKey: string) {
  return Boolean(unorConfig?.holidays?.includes(dateKey));
}

function getUnorRemainingQuota(
  unorConfig: RuntimeUnorConfig | undefined,
  unitId: string,
  services: RuntimeService[],
  dateKey: string,
  appointments: RuntimeAppointment[],
) {
  if (!unorConfig) {
    return 999;
  }

  const unitServiceIds = new Set(
    services
      .filter((service) => `${service.unorId}`.trim() === `${unitId}`.trim())
      .map((service) => service.id),
  );
  const activeStatuses = new Set(["booked", "confirmed", "calling", "in-service"]);
  const activeCount = appointments.filter(
    (appointment) =>
      unitServiceIds.has(appointment.serviceId) &&
      appointment.date === dateKey &&
      activeStatuses.has(appointment.status),
  ).length;

  return Math.max(0, unorConfig.dailyQuota - activeCount);
}

function getServiceRemainingQuota(
  service: RuntimeService,
  dateKey: string,
  appointments: RuntimeAppointment[],
) {
  const activeStatuses = new Set(["booked", "confirmed", "calling", "in-service"]);
  const activeCount = appointments.filter(
    (appointment) =>
      appointment.serviceId === service.id &&
      appointment.date === dateKey &&
      activeStatuses.has(appointment.status),
  ).length;

  return Math.max(0, service.dailyQuota - activeCount);
}

function hasRemainingBookableWindow(
  dateKey: string,
  service: RuntimeService,
  settings: RuntimeAdminSettings,
) {
  const operatingStart = timeToMinutes(settings.operatingHours.start);
  const operatingEnd = timeToMinutes(settings.operatingHours.end);
  const jakartaNow = getJakartaNowParts();

  let slotStart = operatingStart;
  while (slotStart + service.slotDurationMinutes <= operatingEnd) {
    const slotEnd = slotStart + service.slotDurationMinutes;
    if (
      !slotOverlapsBreak(slotStart, slotEnd, settings) &&
      (dateKey !== jakartaNow.date || slotStart > jakartaNow.minutes)
    ) {
      return true;
    }

    slotStart += service.slotDurationMinutes;
  }

  return false;
}

function getSlotAvailabilityContext(
  serviceId: string,
  dateKey: string,
  services: RuntimeService[],
  appointments: RuntimeAppointment[],
  settings: RuntimeAdminSettings,
  unorConfigs: RuntimeUnorConfig[] = [],
): RuntimeSlotAvailabilityContext | null {
  const service = services.find((entry) => entry.id === serviceId);
  if (!service || !service.enabled) {
    return null;
  }

  const dayOfWeek = getDayOfWeek(dateKey);
  if (!settings.operatingDays.includes(dayOfWeek)) {
    return null;
  }

  if (!isDateValid(dateKey, settings.maxAdvanceBookingDays)) {
    return null;
  }

  if ((settings.holidays || []).includes(dateKey)) {
    return null;
  }

  const unorConfig = unorConfigs.find((entry) => entry.unorId === service.unorId);
  if (isUnorHoliday(unorConfig, dateKey)) {
    return null;
  }

  const remainingQuota = getUnorRemainingQuota(
    unorConfig,
    service.unorId,
    services,
    dateKey,
    appointments,
  );
  if (remainingQuota <= 0) {
    return null;
  }

  const remainingServiceQuota = getServiceRemainingQuota(
    service,
    dateKey,
    appointments,
  );
  if (remainingServiceQuota <= 0) {
    return null;
  }

  return {
    service,
    jakartaNow: getJakartaNowParts(),
    operatingStart: timeToMinutes(settings.operatingHours.start),
    operatingEnd: timeToMinutes(settings.operatingHours.end),
    breakRange: getBreakHoursRange(settings),
    remainingQuota,
    remainingServiceQuota,
    bookedTimes: new Set(
      appointments
        .filter(
          (appointment) =>
            appointment.serviceId === serviceId &&
            appointment.date === dateKey &&
            !["cancelled", "no-show"].includes(appointment.status),
        )
        .map((appointment) => appointment.startTime),
    ),
  };
}

function listAvailableSlotsFromContext(
  serviceId: string,
  dateKey: string,
  context: RuntimeSlotAvailabilityContext,
) {
  const slots: RuntimeSlot[] = [];
  let slotStart = context.operatingStart;

  while (slotStart + context.service.slotDurationMinutes <= context.operatingEnd) {
    const slotEnd = slotStart + context.service.slotDurationMinutes;
    const startTime = minutesToTime(slotStart);
    const isPastSameDaySlot =
      dateKey === context.jakartaNow.date && slotStart <= context.jakartaNow.minutes;

    if (
      !context.bookedTimes.has(startTime) &&
      !isPastSameDaySlot &&
      !slotOverlapsBreak(slotStart, slotEnd, context.breakRange)
    ) {
      slots.push({
        date: dateKey,
        startTime,
        endTime: minutesToTime(slotEnd),
        serviceId,
      });
    }

    slotStart += context.service.slotDurationMinutes;
  }

  return slots.slice(0, Math.min(slots.length, context.remainingQuota, context.remainingServiceQuota));
}

export function getAvailableSlotsRuntime(
  serviceId: string,
  dateKey: string,
  services: RuntimeService[],
  appointments: RuntimeAppointment[],
  settings: RuntimeAdminSettings,
  unorConfigs: RuntimeUnorConfig[] = [],
) {
  const context = getSlotAvailabilityContext(
    serviceId,
    dateKey,
    services,
    appointments,
    settings,
    unorConfigs,
  );

  if (!context) {
    return [] as RuntimeSlot[];
  }

  return listAvailableSlotsFromContext(serviceId, dateKey, context);
}

export function getNextAvailableSlotRuntime(
  serviceId: string,
  dateKey: string,
  services: RuntimeService[],
  appointments: RuntimeAppointment[],
  settings: RuntimeAdminSettings,
  unorConfigs: RuntimeUnorConfig[] = [],
) {
  return (
    getAvailableSlotsRuntime(
      serviceId,
      dateKey,
      services,
      appointments,
      settings,
      unorConfigs,
    )[0] ?? null
  );
}

export function countAvailableSlotsRuntime(
  serviceId: string,
  dateKey: string,
  services: RuntimeService[],
  appointments: RuntimeAppointment[],
  settings: RuntimeAdminSettings,
  unorConfigs: RuntimeUnorConfig[] = [],
) {
  return getAvailableSlotsRuntime(
    serviceId,
    dateKey,
    services,
    appointments,
    settings,
    unorConfigs,
  ).length;
}

export function getDateAvailabilityRuntime(
  serviceId: string,
  dateKey: string,
  services: RuntimeService[],
  appointments: RuntimeAppointment[],
  settings: RuntimeAdminSettings,
  unorConfigs: RuntimeUnorConfig[] = [],
): RuntimeDateAvailability {
  const service = services.find((entry) => entry.id === serviceId);
  if (!service || !service.enabled) {
    return { slots: 0, state: "closed" };
  }

  const dayOfWeek = getDayOfWeek(dateKey);
  if (!settings.operatingDays.includes(dayOfWeek)) {
    return { slots: 0, state: "holiday" };
  }

  if (!isDateValid(dateKey, settings.maxAdvanceBookingDays)) {
    return { slots: 0, state: "closed" };
  }

  if ((settings.holidays || []).includes(dateKey)) {
    return { slots: 0, state: "holiday" };
  }

  const unorConfig = unorConfigs.find((entry) => entry.unorId === service.unorId);
  if (isUnorHoliday(unorConfig, dateKey)) {
    return { slots: 0, state: "holiday" };
  }

  if (!hasRemainingBookableWindow(dateKey, service, settings)) {
    return { slots: 0, state: "closed" };
  }

  const slots = countAvailableSlotsRuntime(
    serviceId,
    dateKey,
    services,
    appointments,
    settings,
    unorConfigs,
  );

  if (slots > 0) {
    return { slots, state: "available" };
  }

  return { slots: 0, state: "full" };
}
