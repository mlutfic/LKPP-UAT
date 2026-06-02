import { apiRequest } from "@/lib/api/client";
import { syncExpiredAppointments } from "@/lib/api/appointment-maintenance";

export type AppointmentBindingRecord = {
  id?: string;
  qrToken?: string;
  userId?: string;
  serviceId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  queueNumber?: string;
  complaint?: string;
  jumlahTamu?: number;
  status?: string;
  checkedIn?: boolean;
  callCount?: number;
  applicantCategory?: string;
  institutionName?: string;
  serviceTopic?: string;
  asalInstansi?: string;
};

export type CreateAppointmentPayload = {
  userId: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  queueNumber?: string;
  complaint: string;
  jumlahTamu?: number;
  isWalkIn?: boolean;
  applicantCategory?: string;
  institutionName?: string;
  serviceTopic?: string;
  asalInstansi?: string;
};

export type CreateAppointmentResponse = {
  appointment?: AppointmentBindingRecord;
};

export async function createAppointment(payload: CreateAppointmentPayload) {
  await syncExpiredAppointments();
  return localApiRequest<CreateAppointmentResponse>(
    "/api/appointments",
    payload,
    {
      "X-User-Id": payload.userId,
    },
  );
}

async function updateAppointmentAction(
  id: string,
  action: string,
  payload: Record<string, unknown> = {},
  actor?: { userId?: string; staffId?: string },
) {
  await syncExpiredAppointments();
  return apiRequest<{ appointment?: unknown }>(`/appointments/${id}`, {
    method: "PUT",
    body: { action, ...payload },
    actor,
  });
}

async function localApiRequest<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  headers?: Record<string, string>,
) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  } & T;

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Permintaan lokal gagal.");
  }

  return payload;
}

export function cancelAppointment(id: string, actor?: { userId?: string; staffId?: string }) {
  if (actor?.userId) {
    return localApiRequest<{ appointment?: unknown }>(
      `/api/appointments/${encodeURIComponent(id)}/cancel`,
      {
        userId: actor.userId,
      },
    );
  }

  return updateAppointmentAction(id, "cancel", {}, actor);
}

export function updateAppointmentStatus(
  id: string,
  status: string,
  actor?: { userId?: string; staffId?: string },
) {
  return updateAppointmentAction(id, "status", { status }, actor);
}

export function deferUnitAppointment(
  id: string,
  payload: {
    note: string;
  },
) {
  return localApiRequest<{
    appointment?: unknown;
  }>(`/api/internal/unit/appointments/${encodeURIComponent(id)}/defer`, payload);
}

export function recallDeferredUnitAppointment(id: string) {
  return localApiRequest<{
    appointment?: unknown;
  }>(`/api/internal/unit/appointments/${encodeURIComponent(id)}/recall`, {});
}

export function callAppointment(id: string) {
  return localApiRequest<{
    appointment?: unknown;
  }>(`/api/internal/appointments/${encodeURIComponent(id)}/call`, {});
}

export function updateUnitAppointmentStatus(
  id: string,
  status: "in-service" | "completed",
  payload: {
    note?: string;
  } = {},
) {
  return localApiRequest<{
    appointment?: unknown;
  }>(`/api/internal/unit/appointments/${encodeURIComponent(id)}/status`, {
    status,
    ...(payload.note ? { note: payload.note } : {}),
  });
}

export function checkinAppointment(id: string, actor?: { userId?: string; staffId?: string }) {
  return updateAppointmentAction(id, "checkin", {}, actor);
}

export function addStaffNote(
  id: string,
  note: string,
  actor?: { userId?: string; staffId?: string },
) {
  return updateAppointmentAction(id, "note", { note }, actor);
}

export function addUnitStaffNote(id: string, note: string) {
  return localApiRequest<{
    appointment?: unknown;
  }>(`/api/internal/unit/appointments/${encodeURIComponent(id)}/note`, {
    note,
  });
}

export function overrideAppointmentPriority(
  id: string,
  reason: string,
  actor?: { userId?: string; staffId?: string },
) {
  return updateAppointmentAction(id, "priority-override", { reason }, actor);
}

export function reassignAppointmentService(
  id: string,
  payload:
    | string
    | {
        serviceId: string;
        reason?: string;
        mode?: "reassign" | "escalation";
      },
  actor?: { userId?: string; staffId?: string },
) {
  const normalizedPayload =
    typeof payload === "string" ? { serviceId: payload } : payload;

  return updateAppointmentAction(
    id,
    "reassign-service",
    {
      serviceId: normalizedPayload.serviceId,
      ...(normalizedPayload.reason ? { reason: normalizedPayload.reason } : {}),
      ...(normalizedPayload.mode ? { mode: normalizedPayload.mode } : {}),
    },
    actor,
  );
}

export function reassignUnitAppointmentService(
  id: string,
  payload:
    | string
    | {
        serviceId: string;
        reason?: string;
        mode?: "reassign" | "escalation";
      },
) {
  const normalizedPayload =
    typeof payload === "string" ? { serviceId: payload } : payload;

  return localApiRequest<{
    appointment?: unknown;
  }>(`/api/internal/unit/appointments/${encodeURIComponent(id)}/reassign`, {
    serviceId: normalizedPayload.serviceId,
    ...(normalizedPayload.reason ? { reason: normalizedPayload.reason } : {}),
    ...(normalizedPayload.mode ? { mode: normalizedPayload.mode } : {}),
  });
}

export function rateAppointment(
  id: string,
  stars: number,
  comment?: string,
  actor?: { userId?: string; staffId?: string },
) {
  return updateAppointmentAction(id, "rating", { stars, comment }, actor);
}

export async function lobbyCheckin(
  appointmentId: string,
  actor?: { userId?: string; staffId?: string },
) {
  await syncExpiredAppointments();
  return apiRequest<{ appointment?: unknown }>("/lobby/checkin", {
    method: "POST",
    body: { appointmentId },
    actor,
  });
}

export async function lobbyWalkin(payload: {
  name: string;
  phone: string;
  serviceId: string;
  complaint?: string;
}, actor?: { userId?: string; staffId?: string }) {
  await syncExpiredAppointments();
  return apiRequest<{ userId: string }>("/lobby/walkin", {
    method: "POST",
    body: payload,
    actor,
  });
}
