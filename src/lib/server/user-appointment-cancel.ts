import { resolveEffectiveUserAppointmentStatus } from "@/features/user/appointment-status-utils";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";
import { ensureExpiredAppointmentsAutoClosed } from "@/lib/server/appointment-auto-close-sync";

type LegacyAppointmentRow = {
  id: string;
  user_id?: string | null;
  queue_number?: string | null;
  status?: string | null;
  checked_in?: boolean | null;
  auto_cancelled?: boolean | null;
  appointment_date?: string | null;
  end_time?: string | null;
};

export class UserAppointmentCancelError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "UserAppointmentCancelError";
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
    throw new UserAppointmentCancelError(
      "Konfigurasi Supabase server untuk pembatalan antrean belum lengkap.",
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
    throw new UserAppointmentCancelError(
      `Gagal membaca data appointment: ${body || response.status}`,
      500,
    );
  }

  return (await response.json()) as T[];
}

async function patchAppointmentRow(
  appointmentId: string,
  payload: Partial<LegacyAppointmentRow>,
) {
  const response = await fetch(
    buildRestUrl("lkpp_appointments", {
      id: `eq.${appointmentId}`,
      select: "id,user_id,queue_number,status,checked_in,auto_cancelled,appointment_date,end_time",
    }),
    {
      method: "PATCH",
      headers: {
        ...buildRestHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  const rows = (await response.json().catch(() => [])) as LegacyAppointmentRow[];
  if (!response.ok || !Array.isArray(rows) || rows.length === 0) {
    throw new UserAppointmentCancelError("Gagal membatalkan antrean pengguna.", 500);
  }

  return rows[0]!;
}

async function getAppointmentForUser(appointmentId: string, userId: string) {
  const select =
    "id,user_id,queue_number,status,checked_in,auto_cancelled,appointment_date,end_time";

  const rowsById = await fetchRestRows<LegacyAppointmentRow>("lkpp_appointments", {
    select,
    id: `eq.${appointmentId}`,
    user_id: `eq.${userId}`,
    limit: "1",
  });

  if (rowsById[0]) {
    return rowsById[0];
  }

  const normalizedQueueNumber = appointmentId.toUpperCase();
  const rowsByQueue = await fetchRestRows<LegacyAppointmentRow>("lkpp_appointments", {
    select,
    queue_number: `eq.${normalizedQueueNumber}`,
    user_id: `eq.${userId}`,
    limit: "1",
  });

  return rowsByQueue[0] ?? null;
}

export async function cancelUserAppointmentFromSession(args: {
  appointmentId: string;
  userId: string;
}) {
  const appointmentId = asString(args.appointmentId);
  const userId = asString(args.userId);

  if (!appointmentId) {
    throw new UserAppointmentCancelError("Appointment ID tidak valid.", 400);
  }

  if (!userId) {
    throw new UserAppointmentCancelError("User ID tidak valid.", 400);
  }

  await ensureExpiredAppointmentsAutoClosed({ force: true });

  const appointment = await getAppointmentForUser(appointmentId, userId);
  if (!appointment) {
    throw new UserAppointmentCancelError("Antrean pengguna tidak ditemukan.", 404);
  }

  const resolvedStatus = resolveEffectiveUserAppointmentStatus({
    status: appointment.status,
    date: asString(appointment.appointment_date),
    endTime: asString(appointment.end_time),
    autoCancelled: Boolean(appointment.auto_cancelled),
  });

  if (!["booked", "confirmed"].includes(resolvedStatus.status)) {
    throw new UserAppointmentCancelError(
      "Antrean ini sudah tidak bisa dibatalkan dari akun pengguna.",
      409,
    );
  }

  const updatedAppointment = await patchAppointmentRow(appointment.id, {
    status: "cancelled",
    auto_cancelled: false,
  });

  return {
    id: asString(updatedAppointment.id) || appointment.id,
    queueNumber:
      formatQueueNumberForDisplay(asString(updatedAppointment.queue_number).toUpperCase()) ||
      formatQueueNumberForDisplay(asString(appointment.queue_number).toUpperCase()),
    status: "cancelled" as const,
    checkedIn: Boolean(updatedAppointment.checked_in),
    autoCancelled: Boolean(updatedAppointment.auto_cancelled),
  };
}
