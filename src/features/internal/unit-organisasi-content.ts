"use client";

import {
  bookingServices,
  bookingUnitEntries,
  getBookingServiceLevelLabel,
  getBookingUnitEntryById,
} from "@/content/service-booking-content";
import type { LiveStaffAppointment } from "@/features/internal/use-live-staff-appointments";
import type { MockSession } from "@/lib/auth-session";

export function inferUnitIdFromContext(
  session: MockSession | null,
  appointments: LiveStaffAppointment[] | null | undefined,
  options?: {
    overrideUnitId?: string | null;
  },
) {
  const overrideUnitId = options?.overrideUnitId?.trim().toUpperCase();
  if (overrideUnitId) {
    return overrideUnitId;
  }

  const fromSession = session?.unitId?.trim().toUpperCase();
  if (fromSession) {
    return fromSession;
  }

  const fromAppointments = appointments?.find((item) => item.unitId)?.unitId;
  if (fromAppointments) {
    return fromAppointments;
  }

  const email = session?.email?.toUpperCase() ?? "";
  const matched = bookingUnitEntries.find((unit) => email.includes(unit.id));
  return matched?.id ?? "";
}

export function getUnitWorkspaceIdentity(
  session: MockSession | null,
  appointments: LiveStaffAppointment[] | null | undefined,
  options?: {
    overrideUnitId?: string | null;
  },
) {
  const unitId = inferUnitIdFromContext(session, appointments, options);
  const unitEntry = getBookingUnitEntryById(unitId);
  const unitServices = bookingServices.filter((service) => service.unitId === unitId);
  const assignedCounters =
    (session?.assignedCounters ?? [])
      .filter((counter) => counter.unitId === unitId)
      .sort((left, right) => left.counterNumber - right.counterNumber);
  const activeCounter =
    assignedCounters.find((counter) => counter.id === session?.activeCounterId) ||
    assignedCounters.find((counter) =>
      typeof session?.activeCounterNumber === "number" &&
      Number.isFinite(session.activeCounterNumber) &&
      counter.counterNumber === Math.trunc(session.activeCounterNumber),
    ) ||
    assignedCounters.find((counter) => counter.active) ||
    assignedCounters[0] ||
    null;

  return {
    unitId,
    unitEntry,
    unitServices,
    level1Services: unitServices.filter((service) => service.serviceLevel === 1),
    level2Services: unitServices.filter((service) => service.serviceLevel === 2),
    assignedCounters,
    activeCounter,
    activeCounterId: activeCounter?.id ?? undefined,
    activeCounterNumber: activeCounter?.counterNumber,
    activeCounterLabel: activeCounter?.label,
    profileName: session?.displayName || "Petugas Unit Organisasi",
    profileEmail: session?.email || "unit@lkpp.go.id",
  };
}

export function formatUnitServiceLevelSummary(unitId: string) {
  const unitServices = bookingServices.filter((service) => service.unitId === unitId);
  const counts = unitServices.reduce<Record<1 | 2, number>>(
    (acc, service) => {
      acc[service.serviceLevel] += 1;
      return acc;
    },
    { 1: 0, 2: 0 },
  );

  return [1, 2]
    .filter((level): level is 1 | 2 => counts[level as 1 | 2] > 0)
    .map((level) => `${getBookingServiceLevelLabel(level)}: ${counts[level]}`)
    .join(" · ");
}
