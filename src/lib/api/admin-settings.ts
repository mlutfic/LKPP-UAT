import { apiRequest } from "@/lib/api/client";

export function getSettings(
  cache: RequestCache = "no-store",
  options?: { timeoutMs?: number },
) {
  return apiRequest<{ settings?: unknown }>("/settings", {
    cache,
    timeoutMs: options?.timeoutMs,
  });
}

export function updateAdminSettings(
  payload: Record<string, unknown>,
  actor?: { staffId?: string | null },
) {
  return apiRequest<{ settings?: unknown; holidayBulkCancellation?: unknown }>("/settings", {
    method: "PUT",
    body: payload,
    actor,
  });
}

export function fetchSystemCapacity() {
  return apiRequest<{ report: unknown }>("/admin/capacity");
}

export function cleanupProfilePhotos(force = false) {
  return apiRequest("/admin/profile-photos/cleanup", {
    method: "POST",
    body: { force },
  });
}
