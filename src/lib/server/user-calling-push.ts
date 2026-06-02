import { getBookingServiceById } from "@/content/service-booking-content";
import { resolveEffectiveUserAppointmentStatus } from "@/features/user/appointment-status-utils";
import { buildCallingNotificationTag } from "@/lib/calling-notification";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";
import { ensureExpiredAppointmentsAutoClosed } from "@/lib/server/appointment-auto-close-sync";

type AppointmentLookupRow = {
  id: string;
  user_id?: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  queue_number: string;
  status: string;
  checked_in: boolean;
  call_count: number;
  counter_id?: number | null;
  user_email?: string | null;
  service_id: string;
  service_name?: string | null;
  unit_short_name?: string | null;
  staff_note?: string | null;
};

type AppointmentDispatchRow = {
  id: string;
  user_id?: string | null;
  status?: string | null;
  checked_in?: boolean | null;
  appointment_date?: string | null;
  end_time?: string | null;
  auto_cancelled?: boolean | null;
};

export type CurrentCallingNotificationSnapshot = {
  id: string;
  queueNumber: string;
  serviceTitle: string;
  unitLabel: string;
  callCount: number;
  counterId?: number;
  url: string;
  tag: string;
  title: string;
  body: string;
};

type WaitForCallingNotificationOptions = {
  attempts?: number;
  delayMs?: number;
};

type StoredCallingNotificationState = {
  kind: "user-calling-notification";
  userId: string;
  appointment: CurrentCallingNotificationSnapshot;
  updatedAt: string;
};

type KvRow = {
  key?: string | null;
  value?: unknown;
};

const USER_CALLING_NOTIFICATION_KEY_PREFIX = "push:calling:user:";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isCallingStatus(row: {
  status?: string | null;
  appointment_date?: string | null;
  end_time?: string | null;
  staff_note?: string | null;
  auto_cancelled?: boolean | null;
}) {
  return (
    resolveEffectiveUserAppointmentStatus({
      status: row.status,
      date: asString(row.appointment_date),
      endTime: asString(row.end_time),
      note: asString(row.staff_note),
      autoCancelled: Boolean(row.auto_cancelled),
    }).status === "calling"
  );
}

function getSupabaseServerConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    throw new Error("Konfigurasi server notifikasi panggilan belum lengkap.");
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

function buildCallingNotificationKey(userId: string) {
  return `${USER_CALLING_NOTIFICATION_KEY_PREFIX}${userId}`;
}

async function fetchRestRows<T>(path: string, params?: Record<string, string>) {
  const response = await fetch(buildRestUrl(path, params), {
    method: "GET",
    headers: buildRestHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Gagal membaca data panggilan (${response.status}).`);
  }

  return (await response.json()) as T[];
}

async function upsertKvRow(key: string, value: unknown) {
  const response = await fetch(
    buildRestUrl("kv_store_f08d97a1", { on_conflict: "key" }),
    {
      method: "POST",
      headers: {
        ...buildRestHeaders(),
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ key, value }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Gagal menyimpan snapshot panggilan.");
  }
}

async function deleteKvRow(key: string) {
  const response = await fetch(
    buildRestUrl("kv_store_f08d97a1", { key: `eq.${key}` }),
    {
      method: "DELETE",
      headers: {
        ...buildRestHeaders(),
        Prefer: "return=minimal",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Gagal menghapus snapshot panggilan.");
  }
}

async function getKvRow(key: string) {
  const rows = await fetchRestRows<KvRow>("kv_store_f08d97a1", {
    select: "key,value",
    key: `eq.${key}`,
    limit: "1",
  });

  return rows[0] ?? null;
}

function normalizeStoredCallingNotificationState(
  userId: string,
  input: unknown,
) {
  const record =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : null;
  const appointment = normalizePushAppointment(record?.appointment);

  if (!record || !appointment) {
    return null;
  }

  return {
    kind: "user-calling-notification",
    userId,
    appointment,
    updatedAt: asString(record.updatedAt) || new Date(0).toISOString(),
  } satisfies StoredCallingNotificationState;
}

function buildCallingSnapshot(row: AppointmentLookupRow) {
  const serviceId = asString(row.service_id).toUpperCase();
  const service = getBookingServiceById(serviceId);
  const serviceTitle =
    service?.title ||
    asString(row.service_name) ||
    serviceId ||
    "Layanan LKPP";
  const unitLabel =
    service?.unitLabel ||
    asString(row.unit_short_name) ||
    "Unit layanan LKPP";
  const queueNumber = formatQueueNumberForDisplay(asString(row.queue_number).toUpperCase());
  const counterId =
    typeof row.counter_id === "number" && Number.isFinite(row.counter_id)
      ? row.counter_id
      : undefined;
  const callCount =
    typeof row.call_count === "number" && Number.isFinite(row.call_count)
      ? row.call_count
      : 0;
  const destination =
    typeof counterId === "number" && counterId > 0
      ? `Silakan menuju loket ${counterId}.`
      : `Silakan menuju ${unitLabel}.`;

  return {
    id: asString(row.id),
    queueNumber,
    serviceTitle,
    unitLabel,
    callCount,
    counterId,
    url: `/jadwal-saya/${asString(row.id)}`,
    tag: buildCallingNotificationTag({
      appointmentId: asString(row.id),
      callCount,
      counterId,
    }),
    title: `Antrian ${queueNumber} sedang dipanggil`,
    body: `${serviceTitle} • ${destination}`,
  } satisfies CurrentCallingNotificationSnapshot;
}

function normalizePushAppointment(input: unknown) {
  const record =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : null;
  if (!record) {
    return null;
  }

  const id = asString(record.id);
  const queueNumber = asString(record.queueNumber);
  const serviceTitle = asString(record.serviceTitle);
  const unitLabel = asString(record.unitLabel);
  const url = asString(record.url);
  const tag = asString(record.tag);
  const title = asString(record.title);
  const body = asString(record.body);
  const callCount =
    typeof record.callCount === "number" && Number.isFinite(record.callCount)
      ? record.callCount
      : 0;
  const counterId =
    typeof record.counterId === "number" && Number.isFinite(record.counterId)
      ? record.counterId
      : undefined;

  if (!id || !queueNumber || !serviceTitle || !unitLabel || !url || !tag || !title || !body) {
    return null;
  }

  return {
    id,
    queueNumber,
    serviceTitle,
    unitLabel,
    callCount,
    counterId,
    url,
    tag,
    title,
    body,
  } satisfies CurrentCallingNotificationSnapshot;
}

export function buildCallingNotificationSnapshotFromAppointment(args: {
  id: string;
  queueNumber?: string;
  serviceId?: string;
  serviceTitle?: string;
  unitLabel?: string;
  callCount?: number;
  counterId?: number | null;
}) {
  const appointmentId = asString(args.id);
  const serviceId = asString(args.serviceId).toUpperCase();
  const service = getBookingServiceById(serviceId);
  const serviceTitle =
    asString(args.serviceTitle) ||
    service?.title ||
    serviceId ||
    "Layanan LKPP";
  const unitLabel =
    asString(args.unitLabel) ||
    service?.unitLabel ||
    "Unit layanan LKPP";
  const queueNumber =
    formatQueueNumberForDisplay(asString(args.queueNumber).toUpperCase()) ||
    appointmentId;
  const callCount =
    typeof args.callCount === "number" && Number.isFinite(args.callCount)
      ? args.callCount
      : 0;
  const counterId =
    typeof args.counterId === "number" && Number.isFinite(args.counterId)
      ? args.counterId
      : undefined;
  const destination =
    typeof counterId === "number" && counterId > 0
      ? `Silakan menuju loket ${counterId}.`
      : `Silakan menuju ${unitLabel}.`;

  if (!appointmentId || !serviceTitle || !unitLabel || !queueNumber) {
    return null;
  }

  return {
    id: appointmentId,
    queueNumber,
    serviceTitle,
    unitLabel,
    callCount,
    counterId,
    url: `/jadwal-saya/${appointmentId}`,
    tag: buildCallingNotificationTag({
      appointmentId,
      callCount,
      counterId,
    }),
    title: `Antrian ${queueNumber} sedang dipanggil`,
    body: `${serviceTitle} • ${destination}`,
  } satisfies CurrentCallingNotificationSnapshot;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function readCurrentCallingNotificationByUserEmail(email: string) {
  const normalizedEmail = asString(email).toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  await ensureExpiredAppointmentsAutoClosed();

  const rows = await fetchRestRows<AppointmentLookupRow>("v_lkpp_appointments_enriched", {
    select:
      "id,appointment_date,start_time,end_time,queue_number,status,checked_in,call_count,counter_id,user_email,service_id,service_name,unit_short_name,staff_note",
    user_email: `eq.${normalizedEmail}`,
    order: "appointment_date.desc,start_time.desc",
    limit: "6",
  });

  const callingRow = rows.find((row) =>
    isCallingStatus({
      status: row.status,
      appointment_date: row.appointment_date,
      end_time: row.end_time,
      staff_note: row.staff_note,
    }),
  );

  return callingRow ? buildCallingSnapshot(callingRow) : null;
}

export async function readCurrentCallingNotificationByUserId(userId: string) {
  const normalizedUserId = asString(userId);
  if (!normalizedUserId) {
    return null;
  }

  await ensureExpiredAppointmentsAutoClosed();

  const rows = await fetchRestRows<AppointmentLookupRow>("v_lkpp_appointments_enriched", {
    select:
      "id,appointment_date,start_time,end_time,queue_number,status,checked_in,call_count,counter_id,user_id,service_id,service_name,unit_short_name,staff_note",
    user_id: `eq.${normalizedUserId}`,
    order: "appointment_date.desc,start_time.desc",
    limit: "6",
  });

  const callingRow = rows.find((row) =>
    isCallingStatus({
      status: row.status,
      appointment_date: row.appointment_date,
      end_time: row.end_time,
      staff_note: row.staff_note,
    }),
  );

  return callingRow ? buildCallingSnapshot(callingRow) : null;
}

export async function readCurrentCallingNotificationByAppointmentId(
  appointmentId: string,
) {
  const normalizedAppointmentId = asString(appointmentId);
  if (!normalizedAppointmentId) {
    return null;
  }

  await ensureExpiredAppointmentsAutoClosed();

  const rows = await fetchRestRows<AppointmentLookupRow>("v_lkpp_appointments_enriched", {
    select:
      "id,appointment_date,start_time,end_time,queue_number,status,checked_in,call_count,counter_id,user_email,service_id,service_name,unit_short_name,staff_note",
    id: `eq.${normalizedAppointmentId}`,
    limit: "1",
  });

  const appointment = rows[0] ?? null;
  if (
    !appointment ||
    !isCallingStatus({
      status: appointment.status,
      appointment_date: appointment.appointment_date,
      end_time: appointment.end_time,
      staff_note: appointment.staff_note,
    })
  ) {
    return null;
  }

  return buildCallingSnapshot(appointment);
}

export async function waitForCurrentCallingNotificationByAppointmentId(
  appointmentId: string,
  options?: WaitForCallingNotificationOptions,
) {
  const attempts = Math.max(Math.trunc(options?.attempts ?? 5), 1);
  const delayMs = Math.max(Math.trunc(options?.delayMs ?? 450), 0);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const appointment = await readCurrentCallingNotificationByAppointmentId(
        appointmentId,
      );
      if (appointment) {
        return appointment;
      }
    } catch {
      // Retry below; push should not fail just because the view is a little late.
    }

    if (attempt < attempts - 1 && delayMs > 0) {
      await delay(delayMs * (attempt + 1));
    }
  }

  return null;
}

export async function writeLatestCallingNotificationForUser(
  userId: string,
  appointment: CurrentCallingNotificationSnapshot,
) {
  const normalizedUserId = asString(userId);
  const normalizedAppointment = normalizePushAppointment(appointment);
  if (!normalizedUserId || !normalizedAppointment) {
    return;
  }

  await upsertKvRow(buildCallingNotificationKey(normalizedUserId), {
    kind: "user-calling-notification",
    userId: normalizedUserId,
    appointment: normalizedAppointment,
    updatedAt: new Date().toISOString(),
  });
}

export async function clearLatestCallingNotificationForUser(
  userId: string,
  appointmentId?: string,
) {
  const normalizedUserId = asString(userId);
  if (!normalizedUserId) {
    return;
  }

  const key = buildCallingNotificationKey(normalizedUserId);
  if (!appointmentId) {
    await deleteKvRow(key).catch(() => undefined);
    return;
  }

  const current = normalizeStoredCallingNotificationState(
    normalizedUserId,
    (await getKvRow(key))?.value,
  );

  if (!current || current.appointment.id === asString(appointmentId)) {
    await deleteKvRow(key).catch(() => undefined);
  }
}

export async function readLatestCallingNotificationByUserId(userId: string) {
  const normalizedUserId = asString(userId);
  if (!normalizedUserId) {
    return null;
  }

  const stored = normalizeStoredCallingNotificationState(
    normalizedUserId,
    (await getKvRow(buildCallingNotificationKey(normalizedUserId)))?.value,
  );

  if (stored?.appointment?.id) {
    const currentAppointment = await readCurrentCallingNotificationByAppointmentId(
      stored.appointment.id,
    ).catch(() => null);

    if (currentAppointment) {
      return currentAppointment;
    }

    await clearLatestCallingNotificationForUser(
      normalizedUserId,
      stored.appointment.id,
    ).catch(() => undefined);
  }

  return readCurrentCallingNotificationByUserId(normalizedUserId);
}

export async function readCallingAppointmentUserId(appointmentId: string) {
  const normalizedAppointmentId = asString(appointmentId);
  if (!normalizedAppointmentId) {
    return null;
  }

  await ensureExpiredAppointmentsAutoClosed();

  const rows = await fetchRestRows<AppointmentDispatchRow>("lkpp_appointments", {
    select:
      "id,user_id,status,checked_in,appointment_date,end_time,auto_cancelled",
    id: `eq.${normalizedAppointmentId}`,
    limit: "1",
  });
  const appointment = rows[0] ?? null;

  if (!appointment || !isCallingStatus(appointment)) {
    return null;
  }

  return asString(appointment.user_id) || null;
}
