import { apiRequest } from "@/lib/api/client";

export function exportData(payload: Record<string, unknown>) {
  return apiRequest<{ csv: string; count: number; rows?: unknown[] }>("/export", {
    method: "POST",
    body: payload,
  });
}
