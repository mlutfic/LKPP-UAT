import { getPublicEnv, getServerEnv } from "@/lib/env";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";
import { ensureExpiredAppointmentsAutoClosed } from "@/lib/server/appointment-auto-close-sync";

type CreateAppointmentPayload = {
  userId?: unknown;
  serviceId?: unknown;
  date?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  queueNumber?: unknown;
  complaint?: unknown;
  jumlahTamu?: unknown;
  isWalkIn?: unknown;
  applicantCategory?: unknown;
  institutionName?: unknown;
  serviceTopic?: unknown;
  asalInstansi?: unknown;
};

type LegacyAppointmentRow = {
  id?: string | null;
  user_id?: string | null;
  queue_number?: string | null;
  status?: string | null;
  appointment_date?: string | null;
  start_time?: string | null;
};

const ACTIVE_APPOINTMENT_STATUSES = ["booked", "confirmed", "calling", "in-service"] as const;

export class UserAppointmentCreateError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "UserAppointmentCreateError";
    this.status = status;
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getSupabaseServerConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    throw new UserAppointmentCreateError(
      "Konfigurasi Supabase server untuk validasi booking belum lengkap.",
      500,
    );
  }

  return {
    supabaseUrl: publicEnv.supabaseUrl,
    serviceRoleKey: serverEnv.serviceRoleKey,
  };
}

function buildRestUrl(path: string, params?: Record<string, string>) {
  const { supabaseUrl } = getSupabaseServerConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

function buildRestHeaders() {
  const { serviceRoleKey } = getSupabaseServerConfig();

  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
  };
}

async function fetchRestRows<T>(path: string, params?: Record<string, string>) {
  const response = await fetch(buildRestUrl(path, params), {
    method: "GET",
    headers: buildRestHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new UserAppointmentCreateError(
      `Gagal membaca data appointment: ${body || response.status}`,
      500,
    );
  }

  return (await response.json()) as T[];
}

function resolveRequestOrigin(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  const referer = request.headers.get("referer")?.trim();

  if (origin) {
    return origin.replace(/\/$/, "");
  }

  if (referer) {
    try {
      return new URL(referer).origin.replace(/\/$/, "");
    } catch {
      // Ignore malformed referer.
    }
  }

  return getPublicEnv().appUrl.replace(/\/$/, "");
}

async function getActiveAppointmentForUser(userId: string) {
  const select =
    "id,user_id,queue_number,status,appointment_date,start_time";
  const rows = await fetchRestRows<LegacyAppointmentRow>("lkpp_appointments", {
    select,
    user_id: `eq.${userId}`,
    status: `in.(${ACTIVE_APPOINTMENT_STATUSES.join(",")})`,
    order: "appointment_date.asc,start_time.asc",
    limit: "1",
  });

  return rows[0] ?? null;
}

function buildActiveAppointmentErrorMessage(appointment: LegacyAppointmentRow) {
  const queueNumberRaw = asString(appointment.queue_number).toUpperCase();
  const queueNumber = formatQueueNumberForDisplay(queueNumberRaw) || queueNumberRaw;

  if (queueNumber) {
    return `Anda masih memiliki antrean aktif ${queueNumber}. Selesaikan atau batalkan antrean tersebut sebelum mengambil antrean baru.`;
  }

  return "Anda masih memiliki antrean aktif. Selesaikan atau batalkan antrean tersebut sebelum mengambil antrean baru.";
}

async function forwardCreateAppointment(
  request: Request,
  payload: CreateAppointmentPayload,
  actorUserId?: string,
) {
  const publicEnv = getPublicEnv();

  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    throw new UserAppointmentCreateError(
      "Konfigurasi backend booking antrean belum lengkap.",
      500,
    );
  }

  const backendBaseUrl = `${publicEnv.supabaseUrl}/functions/v1/${publicEnv.supabaseFunctionName}`;
  const origin = resolveRequestOrigin(request);
  const response = await fetch(`${backendBaseUrl}/appointments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${publicEnv.supabaseAnonKey}`,
      "Content-Type": "application/json",
      "X-App-Url": origin,
      "X-Client-Origin": origin,
      ...(actorUserId ? { "X-User-Id": actorUserId } : {}),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const result = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    appointment?: unknown;
  };

  if (!response.ok || result.ok === false) {
    throw new UserAppointmentCreateError(
      result.error || "Gagal membuat antrean pengguna.",
      response.status || 500,
    );
  }

  return result;
}

export async function createUserAppointmentWithGuard(
  request: Request,
  payload: CreateAppointmentPayload,
) {
  const userId = asString(payload.userId);
  const actorUserId = asString(request.headers.get("X-User-Id"));

  if (!userId) {
    throw new UserAppointmentCreateError("User ID tidak valid.", 400);
  }

  if (actorUserId && actorUserId !== userId) {
    throw new UserAppointmentCreateError(
      "User mismatch untuk pembuatan appointment.",
      403,
    );
  }

  await ensureExpiredAppointmentsAutoClosed({ force: true });

  const activeAppointment = await getActiveAppointmentForUser(userId);
  if (activeAppointment) {
    throw new UserAppointmentCreateError(
      buildActiveAppointmentErrorMessage(activeAppointment),
      409,
    );
  }

  return forwardCreateAppointment(request, payload, actorUserId || userId);
}
