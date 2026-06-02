import { apiRequest } from "@/lib/api/client";

export type PublicAnnouncementRecord = {
  id: string;
  title: string;
  message: string;
  type?: string;
  active?: boolean;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
};

export function getPublicAnnouncements(cache: RequestCache = "no-store") {
  return apiRequest<{ announcements?: PublicAnnouncementRecord[] }>("/announcements/public", {
    cache,
  });
}
