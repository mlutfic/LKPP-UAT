import { apiRequest } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

type AdminUnorConfigsResponse = ApiEnvelope<{ configs?: unknown[] }>;
type AdminUnorUpdateResponse = ApiEnvelope<{
  config?: unknown;
  units?: unknown[];
  holidayBulkCancellation?: unknown;
}>;
type AdminUnorDeleteResponse = ApiEnvelope<{
  configs?: unknown[];
  units?: unknown[];
  unitDeleted?: boolean;
}>;

export function getUnorConfigs(
  actor?: { staffId?: string | null },
): Promise<AdminUnorConfigsResponse> {
  return apiRequest<{ configs?: unknown[] }>("/unor-configs", { actor });
}

export function updateUnorConfig(
  unorId: string,
  payload: Record<string, unknown>,
  actor?: { staffId?: string | null },
): Promise<AdminUnorUpdateResponse> {
  return apiRequest<{
    config?: unknown;
    units?: unknown[];
    holidayBulkCancellation?: unknown;
  }>(`/unor-configs/${unorId}`, {
    method: "PUT",
    body: payload,
    actor,
  });
}

export function deleteUnorConfig(
  unorId: string,
  actor?: { staffId?: string | null },
): Promise<AdminUnorDeleteResponse> {
  return apiRequest<{
    configs?: unknown[];
    units?: unknown[];
    unitDeleted?: boolean;
  }>(`/unor-configs/${unorId}`, {
    method: "DELETE",
    actor,
  });
}
