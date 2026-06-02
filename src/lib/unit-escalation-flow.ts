import {
  getBookingServiceById,
} from "@/content/service-booking-content";

function normalizeServiceId(value: string) {
  return value.trim().toUpperCase();
}

export function resolveServiceUnitId(serviceId: string) {
  const normalizedServiceId = normalizeServiceId(serviceId);
  if (!normalizedServiceId) {
    return "";
  }

  const fallbackService = getBookingServiceById(normalizedServiceId);
  if (fallbackService?.unitId) {
    return fallbackService.unitId;
  }

  if (normalizedServiceId.includes("-")) {
    return normalizedServiceId.split("-")[0] || "";
  }

  return "";
}
