import {
  getBookingServiceById,
  inferBookingServiceLevel,
} from "@/content/service-booking-content";

type EligibleServiceArgs = {
  role: string;
  staffUnitId?: string | null;
  serviceId: string;
  serviceUnitId?: string | null;
  serviceLevel?: unknown;
};

function normalizeRole(value: string) {
  return value.trim().toLowerCase();
}

function normalizeUnitId(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

function normalizeServiceId(value: string) {
  return value.trim().toUpperCase();
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

export function isUnitScopedLegacyStaffRole(role: string) {
  const normalizedRole = normalizeRole(role);
  return (
    normalizedRole === "akun_unit" ||
    normalizedRole === "petugas_level2" ||
    normalizedRole === "supervisor_unit"
  );
}

export function isEligibleStaffServiceAssignment({
  role,
  staffUnitId,
  serviceId,
  serviceUnitId,
  serviceLevel,
}: EligibleServiceArgs) {
  const normalizedRole = normalizeRole(role);
  const normalizedStaffUnitId = normalizeUnitId(staffUnitId);
  const normalizedServiceId = normalizeServiceId(serviceId);
  const fallbackService = getBookingServiceById(normalizedServiceId);
  const normalizedServiceUnitId = normalizeUnitId(
    serviceUnitId || fallbackService?.unitId,
  );
  const resolvedServiceLevel = inferBookingServiceLevel(
    normalizedServiceId,
    normalizeServiceLevel(serviceLevel, fallbackService?.serviceLevel ?? 1),
  );

  if (!normalizedServiceId) {
    return false;
  }

  if (!isUnitScopedLegacyStaffRole(normalizedRole)) {
    return true;
  }

  if (!normalizedStaffUnitId || normalizedServiceUnitId !== normalizedStaffUnitId) {
    return false;
  }

  if (normalizedRole === "akun_unit") {
    return resolvedServiceLevel === 1;
  }

  if (normalizedRole === "petugas_level2") {
    return normalizedServiceUnitId === normalizedStaffUnitId;
  }

  return true;
}
