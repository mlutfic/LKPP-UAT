import { apiRequest } from "@/lib/api/client";

export function getAnnouncements(actor?: { staffId?: string | null }) {
  return apiRequest<{ announcements?: unknown[] }>("/announcements", { actor });
}

export function createAnnouncement(
  payload: Record<string, unknown>,
  actor?: { staffId?: string | null },
) {
  return apiRequest<{ announcement: unknown }>("/announcements", {
    method: "POST",
    body: payload,
    actor,
  });
}

export function updateAnnouncement(
  id: string,
  payload: Record<string, unknown>,
  actor?: { staffId?: string | null },
) {
  return apiRequest<{ announcement: unknown }>(`/announcements/${id}`, {
    method: "PUT",
    body: payload,
    actor,
  });
}

export function deleteAnnouncement(
  id: string,
  actor?: { staffId?: string | null },
) {
  return apiRequest(`/announcements/${id}`, {
    method: "DELETE",
    actor,
  });
}
