import { apiRequest } from "@/lib/api/client";

async function localAdminRequest<T = unknown>(
  path: string,
  method: "PUT" | "POST",
  body: Record<string, unknown>,
) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  } & T;

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Permintaan admin lokal gagal.");
  }

  return payload;
}

export function createStaff(
  payload: Record<string, unknown>,
  actor?: { staffId?: string | null },
) {
  return apiRequest<{ staff: unknown }>("/staff", {
    method: "POST",
    body: payload,
    actor,
  });
}

export function updateStaff(
  id: string,
  payload: Record<string, unknown>,
  actor?: { staffId?: string | null },
) {
  return apiRequest<{ staff: unknown }>(`/staff/${id}`, {
    method: "PUT",
    body: payload,
    actor,
  });
}

export function deleteStaff(id: string, actor?: { staffId?: string | null }) {
  return apiRequest(`/staff/${id}`, {
    method: "DELETE",
    actor,
  });
}

export function requestAdminUserPasswordReset(
  id: string,
  actor?: { staffId?: string | null },
) {
  return apiRequest(`/admin/users/${id}/password-reset`, {
    method: "POST",
    actor,
  });
}

export function syncStaffAssignments(payload: {
  staffId?: string | null;
  loginName?: string;
  serviceIds: string[];
}) {
  return localAdminRequest<{
    staffId?: string;
    loginName?: string;
    serviceIds?: string[];
    assignedServiceCount?: number;
  }>("/api/admin/staff-assignments", "PUT", payload);
}

export function syncStaffCounterAssignments(payload: {
  staffId?: string | null;
  loginName?: string;
  counterIds: string[];
}) {
  return localAdminRequest<{
    staffId?: string;
    loginName?: string;
    counterIds?: string[];
    assignedCounterCount?: number;
  }>("/api/admin/staff-counter-assignments", "PUT", payload);
}

export function syncStaffResetAccess(payload: {
  staffId?: string | null;
  loginName?: string;
  requestPasswordReset: boolean;
}) {
  return localAdminRequest<{
    staffId?: string;
    loginName?: string;
    mustChangePassword?: boolean;
  }>("/api/admin/staff-reset-access", "PUT", payload);
}

export function syncStaffPassword(payload: {
  staffId?: string | null;
  loginName?: string;
  newPassword: string;
}) {
  return localAdminRequest<{
    staffId?: string;
    loginName?: string;
    mustChangePassword?: boolean;
  }>("/api/admin/staff-password", "PUT", payload);
}
