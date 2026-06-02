import {
  getBookingServiceById,
  inferBookingServiceLevel,
} from "@/content/service-booking-content";
import { ensureExpiredAppointmentsAutoClosed } from "@/lib/server/appointment-auto-close-sync";
import { getPublicEnv, getServerEnv } from "@/lib/env";

type LegacyAppointmentRow = {
  id: string;
  queue_number?: string | null;
  status?: string | null;
  checked_in?: boolean | null;
  call_count?: number | null;
  service_id?: string | null;
  staff_note?: string | null;
  counter_id?: number | string | null;
};

type UnitAppointmentPayload = {
  id: string;
  queueNumber: string;
  status: string;
  checkedIn: boolean;
  callCount: number;
  note: string;
  counterId?: number;
  serviceId?: string;
};

const APPOINTMENT_SELECT =
  "id,queue_number,status,checked_in,call_count,service_id,staff_note,counter_id";
const DEFERRED_UNIT_NOTE_PATTERN = /^lewati sementara:/i;
const DEFERRED_RECALL_NOTE_PATTERN = /memanggil ulang antrean ini ke meja layanan/i;
const ESCALATION_SUMMARY_PATTERN = /^eskalasi dari\b/i;
const INTERNAL_UNIT_SUMMARY_PATTERN = /^oper internal di\b/i;
const OPERATIONAL_SUMMARY_PATTERN =
  /^(eskalasi dari|pindah layanan ke|oper internal di)\b/i;

export class UnitAppointmentDeferError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "UnitAppointmentDeferError";
    this.status = status;
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function asCounterNumber(value: unknown) {
  const normalized = asNumber(value, 0);
  return normalized > 0 ? Math.trunc(normalized) : null;
}

function getSupabaseServerConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    throw new UnitAppointmentDeferError(
      "Konfigurasi Supabase server untuk aksi unit belum lengkap.",
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
    throw new UnitAppointmentDeferError(
      `Gagal membaca data appointment unit: ${body || response.status}`,
      500,
    );
  }

  return (await response.json()) as T[];
}

async function patchAppointmentRows(
  filters: Record<string, string>,
  payload: Partial<LegacyAppointmentRow>,
) {
  const response = await fetch(
    buildRestUrl("lkpp_appointments", {
      ...filters,
      select: APPOINTMENT_SELECT,
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
  if (!response.ok) {
    const message =
      typeof rows === "object" && rows && !Array.isArray(rows)
        ? JSON.stringify(rows)
        : "";
    throw new UnitAppointmentDeferError(
      `Gagal menyimpan perubahan antrean unit: ${message || response.status}`,
      500,
    );
  }

  return Array.isArray(rows) ? rows : [];
}

async function getAppointmentByIdOrQueueNumber(appointmentId: string) {
  const rowsById = await fetchRestRows<LegacyAppointmentRow>("lkpp_appointments", {
    select: APPOINTMENT_SELECT,
    id: `eq.${appointmentId}`,
    limit: "1",
  });

  if (rowsById[0]) {
    return rowsById[0];
  }

  const normalizedQueueNumber = appointmentId.toUpperCase();
  const rowsByQueue = await fetchRestRows<LegacyAppointmentRow>("lkpp_appointments", {
    select: APPOINTMENT_SELECT,
    queue_number: `eq.${normalizedQueueNumber}`,
    limit: "1",
  });

  return rowsByQueue[0] ?? null;
}

function extractAppointmentUnitId(row: LegacyAppointmentRow) {
  const serviceId = asString(row.service_id).toUpperCase();
  if (serviceId.includes("-")) {
    return serviceId.split("-")[0] || "";
  }

  const queueNumber = asString(row.queue_number).toUpperCase();
  if (queueNumber.includes("-")) {
    return queueNumber.split("-")[0] || "";
  }

  return "";
}

function normalizeAppointmentStatus(value: string | null | undefined) {
  return asString(value).toLowerCase();
}

function isDeferredUnitNote(value: string | null | undefined) {
  return DEFERRED_UNIT_NOTE_PATTERN.test((value || "").trim());
}

function isDeferredRecallCallingNote(value: string | null | undefined) {
  return DEFERRED_RECALL_NOTE_PATTERN.test((value || "").trim());
}

function extractOperationalSummaryLine(note: string | null | undefined) {
  const lines = (note || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.find((line) => OPERATIONAL_SUMMARY_PATTERN.test(line)) ?? "";
}

function hasOperationalSummaryLine(note: string | null | undefined) {
  return Boolean(extractOperationalSummaryLine(note));
}

function isEscalatedOperationalSummary(note: string | null | undefined) {
  return ESCALATION_SUMMARY_PATTERN.test(extractOperationalSummaryLine(note));
}

function isInternalOperationalSummary(note: string | null | undefined) {
  return INTERNAL_UNIT_SUMMARY_PATTERN.test(extractOperationalSummaryLine(note));
}

function getAppointmentServiceLevel(row: LegacyAppointmentRow): 1 | 2 {
  const serviceId = asString(row.service_id).toUpperCase();
  const service = serviceId ? getBookingServiceById(serviceId) : null;
  return inferBookingServiceLevel(serviceId, service?.serviceLevel ?? 1);
}

function assertUnitOperationalOwnership(
  appointment: LegacyAppointmentRow,
  escalationMessage = "Antrean yang sudah dieskalasi hanya bisa dilayani dari akun petugas level 2.",
) {
  if (isEscalatedOperationalSummary(appointment.staff_note)) {
    throw new UnitAppointmentDeferError(escalationMessage, 409);
  }

  if (getAppointmentServiceLevel(appointment) === 2) {
    throw new UnitAppointmentDeferError(
      "Layanan level 2 hanya bisa dilayani dari akun petugas level 2.",
      409,
    );
  }
}

function isUnitOperationalCounterLockRow(appointment: LegacyAppointmentRow) {
  if (
    isEscalatedOperationalSummary(appointment.staff_note) ||
    isInternalOperationalSummary(appointment.staff_note)
  ) {
    return false;
  }

  return getAppointmentServiceLevel(appointment) !== 2;
}

function mergeOperationalNote(
  currentNote: string | null | undefined,
  nextDetail: string | null | undefined,
) {
  const summary = extractOperationalSummaryLine(currentNote);
  const detail = asString(nextDetail);

  if (!summary) {
    return detail || asString(currentNote);
  }

  if (!detail) {
    return asString(currentNote) || summary;
  }

  if (detail === summary) {
    return summary;
  }

  const normalizedDetail = detail
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  if (!normalizedDetail) {
    return summary;
  }

  if (normalizedDetail.startsWith(summary)) {
    return normalizedDetail;
  }

  return `${summary}\n${normalizedDetail}`;
}

function buildUnitCallingNote(isRecall = false) {
  return isRecall
    ? "Unit sudah memanggil ulang antrean ini ke meja layanan."
    : "Unit sudah memanggil antrean ini ke meja layanan.";
}

function buildInServiceNote(currentNote: string | null | undefined, nextNote?: string) {
  return mergeOperationalNote(
    currentNote,
    asString(nextNote) || "Layanan sedang berlangsung di meja unit.",
  );
}

function buildCompletedNote(currentNote: string | null | undefined, nextNote?: string) {
  return mergeOperationalNote(
    currentNote,
    asString(nextNote) || "Layanan ditutup oleh petugas unit.",
  );
}

function resolveServiceLabel(serviceId: string) {
  const normalizedServiceId = asString(serviceId).toUpperCase();
  if (!normalizedServiceId) {
    return "layanan tujuan";
  }

  const service = getBookingServiceById(normalizedServiceId);
  return (
    service?.officialName.trim() ||
    service?.title.trim() ||
    normalizedServiceId
  );
}

function buildServiceReassignmentNote(args: {
  sourceServiceId?: string | null;
  targetServiceId: string;
  reason?: string;
  mode?: "reassign" | "escalation" | "internal";
  originCounterNumber?: number;
}) {
  const sourceLabel = resolveServiceLabel(asString(args.sourceServiceId));
  const targetLabel = resolveServiceLabel(args.targetServiceId);
  const reason = asString(args.reason);
  const originCounterLine =
    typeof args.originCounterNumber === "number" && Number.isFinite(args.originCounterNumber)
      ? `\nAsal loket: Loket ${Math.trunc(args.originCounterNumber)}`
      : "";

  if (args.mode === "internal") {
    return reason
      ? `Oper internal di ${targetLabel}. Alasan: ${reason}`
      : `Oper internal di ${targetLabel}.`;
  }

  if (args.mode === "escalation") {
    return reason
      ? `Eskalasi dari ${sourceLabel} ke ${targetLabel}. Alasan: ${reason}${originCounterLine}`
      : `Eskalasi dari ${sourceLabel} ke ${targetLabel}.${originCounterLine}`;
  }

  return reason
    ? `Pindah layanan ke ${targetLabel}. Catatan: ${reason}`
    : `Pindah layanan ke ${targetLabel}.`;
}

function toUnitAppointmentPayload(
  row: LegacyAppointmentRow,
  fallback: {
    queueNumber?: string;
    status?: string;
    checkedIn?: boolean;
    callCount?: number;
    note?: string;
    serviceId?: string;
    counterId?: number | null;
  } = {},
) {
  const counterId = asCounterNumber(row.counter_id ?? fallback.counterId);
  return {
    id: asString(row.id),
    queueNumber:
      asString(row.queue_number).toUpperCase() ||
      asString(fallback.queueNumber).toUpperCase(),
    status: normalizeAppointmentStatus(row.status) || normalizeAppointmentStatus(fallback.status),
    checkedIn: Boolean(row.checked_in ?? fallback.checkedIn),
    callCount: asNumber(row.call_count, fallback.callCount ?? 0),
    note: asString(row.staff_note) || asString(fallback.note),
    counterId: counterId ?? undefined,
    serviceId: asString(row.service_id).toUpperCase() || asString(fallback.serviceId).toUpperCase() || undefined,
  } satisfies UnitAppointmentPayload;
}

function ensureUnitCounterNumber(counterNumber: number | undefined) {
  const normalizedCounterNumber = asCounterNumber(counterNumber);
  if (!normalizedCounterNumber) {
    throw new UnitAppointmentDeferError(
      "Loket aktif belum dipilih untuk akun unit ini.",
      409,
    );
  }

  return normalizedCounterNumber;
}

function assertAppointmentUnitScope(
  appointment: LegacyAppointmentRow,
  unitId: string,
  message = "Antrean ini tidak berada dalam cakupan unit akun Anda.",
) {
  if (extractAppointmentUnitId(appointment) !== unitId) {
    throw new UnitAppointmentDeferError(message, 403);
  }
}

function assertCounterOwnership(
  appointment: LegacyAppointmentRow,
  counterNumber: number,
  actionLabel = "Antrean ini",
) {
  const currentCounterNumber = asCounterNumber(appointment.counter_id);
  if (currentCounterNumber && currentCounterNumber !== counterNumber) {
    throw new UnitAppointmentDeferError(
      `${actionLabel} sedang diproses di loket ${currentCounterNumber}.`,
      409,
    );
  }
}

async function listCounterActiveAppointments(
  unitId: string,
  counterNumber: number,
  excludeAppointmentId?: string,
) {
  const rows = await fetchRestRows<LegacyAppointmentRow>("lkpp_appointments", {
    select: APPOINTMENT_SELECT,
    counter_id: `eq.${counterNumber}`,
    status: "in.(calling,in-service)",
    order: "queue_number.asc",
  });

  return rows.filter((row) => {
    if (extractAppointmentUnitId(row) !== unitId) {
      return false;
    }

    if (excludeAppointmentId && asString(row.id) === excludeAppointmentId) {
      return false;
    }

    return isUnitOperationalCounterLockRow(row);
  });
}

async function assertCounterAvailable(
  unitId: string,
  counterNumber: number,
  excludeAppointmentId?: string,
) {
  const activeAppointments = await listCounterActiveAppointments(
    unitId,
    counterNumber,
    excludeAppointmentId,
  );

  if (activeAppointments.length > 0) {
    const currentQueueNumber =
      asString(activeAppointments[0]?.queue_number).toUpperCase() || "antrean aktif";
    throw new UnitAppointmentDeferError(
      `Loket ${counterNumber} masih menangani ${currentQueueNumber}. Selesaikan atau tindak lanjuti antrean aktif loket ini terlebih dahulu.`,
      409,
    );
  }
}

function isReadyStatus(status: string) {
  return status === "booked" || status === "confirmed";
}

function isActiveStatus(status: string) {
  return status === "calling" || status === "in-service";
}

async function syncExpiredAppointmentsBeforeUnitAction() {
  await ensureExpiredAppointmentsAutoClosed({ force: true });
}

export async function deferUnitAppointmentFromSession(args: {
  appointmentId: string;
  unitId: string;
  note: string;
  counterNumber?: number;
}) {
  const appointmentId = asString(args.appointmentId);
  const unitId = asString(args.unitId).toUpperCase();
  const note = asString(args.note);
  const counterNumber = ensureUnitCounterNumber(args.counterNumber);

  if (!appointmentId) {
    throw new UnitAppointmentDeferError("Appointment ID tidak valid.", 400);
  }

  if (!unitId) {
    throw new UnitAppointmentDeferError("Unit aktif akun ini belum terbaca.", 400);
  }

  if (!note) {
    throw new UnitAppointmentDeferError("Catatan skip sementara wajib diisi.", 400);
  }

  await syncExpiredAppointmentsBeforeUnitAction();

  const currentAppointment = await getAppointmentByIdOrQueueNumber(appointmentId);
  if (!currentAppointment) {
    throw new UnitAppointmentDeferError("Antrean unit tidak ditemukan.", 404);
  }

  assertAppointmentUnitScope(currentAppointment, unitId);
  assertUnitOperationalOwnership(currentAppointment);

  const currentStatus = normalizeAppointmentStatus(currentAppointment.status);
  if (currentStatus !== "calling") {
    throw new UnitAppointmentDeferError(
      "Antrean ini tidak sedang berada di fase dipanggil unit.",
      409,
    );
  }

  assertCounterOwnership(currentAppointment, counterNumber, "Antrean ini");

  if (asNumber(currentAppointment.call_count, 0) < 3) {
    throw new UnitAppointmentDeferError(
      "Lewati sementara baru boleh setelah 3 kali panggilan.",
      409,
    );
  }

  const updatedCurrentRows = await patchAppointmentRows(
    {
      id: `eq.${currentAppointment.id}`,
      status: "eq.calling",
      or: `(counter_id.is.null,counter_id.eq.${counterNumber})`,
    },
    {
      status: "confirmed",
      checked_in: true,
      staff_note: note,
      counter_id: null,
    },
  );

  const updatedCurrent = updatedCurrentRows[0];
  if (!updatedCurrent) {
    throw new UnitAppointmentDeferError(
      "Status antrean aktif berubah saat diproses. Muat ulang data antrean lalu coba lagi.",
      409,
    );
  }

  return {
    appointment: toUnitAppointmentPayload(updatedCurrent, {
      queueNumber: asString(currentAppointment.queue_number).toUpperCase(),
      status: "confirmed",
      checkedIn: true,
      callCount: asNumber(currentAppointment.call_count, 0),
      note,
      counterId: null,
      serviceId: asString(currentAppointment.service_id).toUpperCase(),
    }),
  };
}

export async function recallDeferredUnitAppointmentFromSession(args: {
  appointmentId: string;
  unitId: string;
  counterNumber?: number;
}) {
  const appointmentId = asString(args.appointmentId);
  const unitId = asString(args.unitId).toUpperCase();
  const counterNumber = ensureUnitCounterNumber(args.counterNumber);

  if (!appointmentId) {
    throw new UnitAppointmentDeferError("Appointment ID tidak valid.", 400);
  }

  if (!unitId) {
    throw new UnitAppointmentDeferError("Unit aktif akun ini belum terbaca.", 400);
  }

  await syncExpiredAppointmentsBeforeUnitAction();

  const currentAppointment = await getAppointmentByIdOrQueueNumber(appointmentId);
  if (!currentAppointment) {
    throw new UnitAppointmentDeferError("Antrean unit tidak ditemukan.", 404);
  }

  assertAppointmentUnitScope(currentAppointment, unitId);
  assertUnitOperationalOwnership(currentAppointment);

  const currentStatus = normalizeAppointmentStatus(currentAppointment.status);
  if (!isReadyStatus(currentStatus) || !currentAppointment.checked_in) {
    throw new UnitAppointmentDeferError(
      "Antrean ini belum berada di posisi siap panggil ulang.",
      409,
    );
  }

  if (!isDeferredUnitNote(currentAppointment.staff_note)) {
    throw new UnitAppointmentDeferError(
      "Antrean ini bukan antrean yang sedang menunggu panggil ulang.",
      409,
    );
  }

  await assertCounterAvailable(unitId, counterNumber, currentAppointment.id);

  const currentCallCount = Math.max(asNumber(currentAppointment.call_count, 0), 0);
  const nextCallCount = currentCallCount + 1;
  const nextNote = buildUnitCallingNote(true);
  const updatedRows = await patchAppointmentRows(
    {
      id: `eq.${currentAppointment.id}`,
      checked_in: "is.true",
      status: "in.(booked,confirmed)",
    },
    {
      status: "calling",
      checked_in: true,
      call_count: nextCallCount,
      staff_note: nextNote,
      counter_id: counterNumber,
    },
  );

  const updatedAppointment = updatedRows[0];
  if (!updatedAppointment) {
    throw new UnitAppointmentDeferError(
      "Antrean ini sudah berubah saat hendak dipanggil ulang. Muat ulang data antrean lalu coba lagi.",
      409,
    );
  }

  return {
    appointment: toUnitAppointmentPayload(updatedAppointment, {
      queueNumber: asString(currentAppointment.queue_number).toUpperCase(),
      status: "calling",
      checkedIn: true,
      callCount: nextCallCount,
      note: nextNote,
      counterId: counterNumber,
      serviceId: asString(currentAppointment.service_id).toUpperCase(),
    }),
  };
}

export async function callUnitAppointmentFromSession(args: {
  appointmentId: string;
  unitId: string;
  counterNumber?: number;
}) {
  const appointmentId = asString(args.appointmentId);
  const unitId = asString(args.unitId).toUpperCase();
  const counterNumber = ensureUnitCounterNumber(args.counterNumber);

  if (!appointmentId) {
    throw new UnitAppointmentDeferError("Appointment ID tidak valid.", 400);
  }

  if (!unitId) {
    throw new UnitAppointmentDeferError("Unit aktif akun ini belum terbaca.", 400);
  }

  await syncExpiredAppointmentsBeforeUnitAction();

  const currentAppointment = await getAppointmentByIdOrQueueNumber(appointmentId);
  if (!currentAppointment) {
    throw new UnitAppointmentDeferError("Antrean unit tidak ditemukan.", 404);
  }

  assertAppointmentUnitScope(currentAppointment, unitId);
  assertUnitOperationalOwnership(currentAppointment);

  const currentStatus = normalizeAppointmentStatus(currentAppointment.status);
  const currentCallCount = Math.max(asNumber(currentAppointment.call_count, 0), 0);
  const isDeferredRecall = isDeferredUnitNote(currentAppointment.staff_note);

  let nextCallCount = currentCallCount;
  let nextNote = hasOperationalSummaryLine(currentAppointment.staff_note)
    ? mergeOperationalNote(
        currentAppointment.staff_note,
        buildUnitCallingNote(isDeferredRecall),
      )
    : buildUnitCallingNote(isDeferredRecall);
  let updatedRows: LegacyAppointmentRow[] = [];

  if (isReadyStatus(currentStatus)) {
    if (!currentAppointment.checked_in) {
      throw new UnitAppointmentDeferError(
        "Antrean ini belum check-in dan belum bisa dipanggil unit.",
        409,
      );
    }

    if (!isInternalOperationalSummary(currentAppointment.staff_note)) {
      await assertCounterAvailable(unitId, counterNumber, currentAppointment.id);
    }
    nextCallCount = currentCallCount > 0 ? currentCallCount + 1 : 1;

    updatedRows = await patchAppointmentRows(
      {
        id: `eq.${currentAppointment.id}`,
        checked_in: "is.true",
        status: "in.(booked,confirmed)",
      },
      {
        status: "calling",
        checked_in: true,
        call_count: nextCallCount,
        staff_note: nextNote,
        counter_id: counterNumber,
      },
    );
  } else if (currentStatus === "calling") {
    const normalizedCurrentCallCount = Math.max(currentCallCount, 1);
    const isDeferredRecall = isDeferredRecallCallingNote(currentAppointment.staff_note);
    const currentCounterNumber = asCounterNumber(currentAppointment.counter_id);

    if (currentCounterNumber && currentCounterNumber !== counterNumber) {
      await assertCounterAvailable(unitId, counterNumber, currentAppointment.id);
    }

    if (normalizedCurrentCallCount >= 3 && !isDeferredRecall) {
      throw new UnitAppointmentDeferError(
        "Batas panggilan antrean sudah mencapai 3 kali.",
        409,
      );
    }

    nextCallCount = normalizedCurrentCallCount + 1;
    nextNote = hasOperationalSummaryLine(currentAppointment.staff_note)
      ? mergeOperationalNote(
          currentAppointment.staff_note,
          buildUnitCallingNote(isDeferredRecall),
        )
      : buildUnitCallingNote(isDeferredRecall);

    updatedRows = await patchAppointmentRows(
      {
        id: `eq.${currentAppointment.id}`,
        status: "eq.calling",
      },
      {
        status: "calling",
        checked_in: true,
        call_count: nextCallCount,
        staff_note: nextNote,
        counter_id: counterNumber,
      },
    );
  } else {
    throw new UnitAppointmentDeferError(
      "Antrean ini belum berada di fase yang bisa dipanggil unit.",
      409,
    );
  }

  const updatedAppointment = updatedRows[0];
  if (!updatedAppointment) {
    throw new UnitAppointmentDeferError(
      "Antrean ini sudah berubah saat hendak dipanggil. Muat ulang data antrean lalu coba lagi.",
      409,
    );
  }

  return {
    appointment: toUnitAppointmentPayload(updatedAppointment, {
      queueNumber: asString(currentAppointment.queue_number).toUpperCase(),
      status: "calling",
      checkedIn: true,
      callCount: nextCallCount,
      note: nextNote,
      counterId: counterNumber,
      serviceId: asString(currentAppointment.service_id).toUpperCase(),
    }),
  };
}

export async function updateUnitAppointmentStatusFromSession(args: {
  appointmentId: string;
  unitId: string;
  counterNumber?: number;
  status: "in-service" | "completed";
  note?: string;
}) {
  const appointmentId = asString(args.appointmentId);
  const unitId = asString(args.unitId).toUpperCase();
  const counterNumber = ensureUnitCounterNumber(args.counterNumber);
  const nextStatus = normalizeAppointmentStatus(args.status) as "in-service" | "completed";
  const nextNote = asString(args.note);

  if (!appointmentId) {
    throw new UnitAppointmentDeferError("Appointment ID tidak valid.", 400);
  }

  if (!unitId) {
    throw new UnitAppointmentDeferError("Unit aktif akun ini belum terbaca.", 400);
  }

  if (!["in-service", "completed"].includes(nextStatus)) {
    throw new UnitAppointmentDeferError("Status unit yang diminta tidak didukung.", 400);
  }

  await syncExpiredAppointmentsBeforeUnitAction();

  const currentAppointment = await getAppointmentByIdOrQueueNumber(appointmentId);
  if (!currentAppointment) {
    throw new UnitAppointmentDeferError("Antrean unit tidak ditemukan.", 404);
  }

  assertAppointmentUnitScope(currentAppointment, unitId);
  assertUnitOperationalOwnership(currentAppointment);

  const currentStatus = normalizeAppointmentStatus(currentAppointment.status);
  let updatedRows: LegacyAppointmentRow[] = [];
  let mergedNote = nextNote;
  let targetCounterId: number | null = counterNumber;

  if (nextStatus === "in-service") {
    if (currentStatus === "calling") {
      assertCounterOwnership(currentAppointment, counterNumber, "Antrean ini");
      mergedNote = buildInServiceNote(currentAppointment.staff_note, nextNote);
      updatedRows = await patchAppointmentRows(
        {
          id: `eq.${currentAppointment.id}`,
          status: "eq.calling",
          or: `(counter_id.is.null,counter_id.eq.${counterNumber})`,
        },
        {
          status: "in-service",
          checked_in: true,
          staff_note: mergedNote,
          counter_id: counterNumber,
        },
      );
    } else if (isReadyStatus(currentStatus) && currentAppointment.checked_in && hasOperationalSummaryLine(currentAppointment.staff_note)) {
      await assertCounterAvailable(unitId, counterNumber, currentAppointment.id);
      mergedNote = buildInServiceNote(currentAppointment.staff_note, nextNote);
      updatedRows = await patchAppointmentRows(
        {
          id: `eq.${currentAppointment.id}`,
          checked_in: "is.true",
          status: "in.(booked,confirmed)",
        },
        {
          status: "in-service",
          checked_in: true,
          staff_note: mergedNote,
          counter_id: counterNumber,
        },
      );
    } else {
      throw new UnitAppointmentDeferError(
        "Antrean ini belum berada di fase yang bisa mulai dilayani dari loket aktif.",
        409,
      );
    }
  } else {
    if (!isActiveStatus(currentStatus)) {
      throw new UnitAppointmentDeferError(
        "Antrean ini belum berada di fase yang bisa diselesaikan oleh unit.",
        409,
      );
    }

    assertCounterOwnership(currentAppointment, counterNumber, "Antrean ini");
    mergedNote = buildCompletedNote(currentAppointment.staff_note, nextNote);
    updatedRows = await patchAppointmentRows(
      {
        id: `eq.${currentAppointment.id}`,
        status: "in.(calling,in-service)",
        or: `(counter_id.is.null,counter_id.eq.${counterNumber})`,
      },
      {
        status: "completed",
        checked_in: true,
        staff_note: mergedNote,
        counter_id: counterNumber,
      },
    );
  }

  const updatedAppointment = updatedRows[0];
  if (!updatedAppointment) {
    throw new UnitAppointmentDeferError(
      "Status antrean berubah saat diproses. Muat ulang data antrean lalu coba lagi.",
      409,
    );
  }

  if (nextStatus === "completed") {
    targetCounterId = asCounterNumber(updatedAppointment.counter_id ?? counterNumber);
  }

  return {
    appointment: toUnitAppointmentPayload(updatedAppointment, {
      queueNumber: asString(currentAppointment.queue_number).toUpperCase(),
      status: nextStatus,
      checkedIn: true,
      callCount: asNumber(currentAppointment.call_count, 0),
      note: mergedNote,
      counterId: targetCounterId,
      serviceId: asString(currentAppointment.service_id).toUpperCase(),
    }),
  };
}

export async function addUnitStaffNoteFromSession(args: {
  appointmentId: string;
  unitId: string;
  counterNumber?: number;
  note: string;
}) {
  const appointmentId = asString(args.appointmentId);
  const unitId = asString(args.unitId).toUpperCase();
  const counterNumber = ensureUnitCounterNumber(args.counterNumber);
  const nextNote = asString(args.note);

  if (!appointmentId) {
    throw new UnitAppointmentDeferError("Appointment ID tidak valid.", 400);
  }

  if (!unitId) {
    throw new UnitAppointmentDeferError("Unit aktif akun ini belum terbaca.", 400);
  }

  if (!nextNote) {
    throw new UnitAppointmentDeferError("Catatan unit wajib diisi.", 400);
  }

  await syncExpiredAppointmentsBeforeUnitAction();

  const currentAppointment = await getAppointmentByIdOrQueueNumber(appointmentId);
  if (!currentAppointment) {
    throw new UnitAppointmentDeferError("Antrean unit tidak ditemukan.", 404);
  }

  assertAppointmentUnitScope(currentAppointment, unitId);
  assertUnitOperationalOwnership(currentAppointment);

  const currentStatus = normalizeAppointmentStatus(currentAppointment.status);
  if (isActiveStatus(currentStatus)) {
    assertCounterOwnership(currentAppointment, counterNumber, "Antrean ini");
  }

  const mergedNote = mergeOperationalNote(currentAppointment.staff_note, nextNote);
  const filters: Record<string, string> = {
    id: `eq.${currentAppointment.id}`,
  };

  if (isActiveStatus(currentStatus)) {
    filters.or = `(counter_id.is.null,counter_id.eq.${counterNumber})`;
  }

  const updatedRows = await patchAppointmentRows(filters, {
    staff_note: mergedNote,
  });
  const updatedAppointment = updatedRows[0];

  if (!updatedAppointment) {
    throw new UnitAppointmentDeferError(
      "Catatan antrean berubah saat diproses. Muat ulang data antrean lalu coba lagi.",
      409,
    );
  }

  return {
    appointment: toUnitAppointmentPayload(updatedAppointment, {
      queueNumber: asString(currentAppointment.queue_number).toUpperCase(),
      status: currentStatus,
      checkedIn: Boolean(currentAppointment.checked_in),
      callCount: asNumber(currentAppointment.call_count, 0),
      note: mergedNote,
      counterId: asCounterNumber(currentAppointment.counter_id),
      serviceId: asString(currentAppointment.service_id).toUpperCase(),
    }),
  };
}

export async function reassignUnitAppointmentServiceFromSession(args: {
  appointmentId: string;
  unitId: string;
  counterNumber?: number;
  serviceId: string;
  reason?: string;
  mode?: "reassign" | "escalation";
}) {
  const appointmentId = asString(args.appointmentId);
  const unitId = asString(args.unitId).toUpperCase();
  const counterNumber = ensureUnitCounterNumber(args.counterNumber);
  const serviceId = asString(args.serviceId).toUpperCase();
  const reason = asString(args.reason);
  const mode = args.mode === "escalation" ? "escalation" : "reassign";

  if (!appointmentId) {
    throw new UnitAppointmentDeferError("Appointment ID tidak valid.", 400);
  }

  if (!unitId) {
    throw new UnitAppointmentDeferError("Unit aktif akun ini belum terbaca.", 400);
  }

  if (!serviceId) {
    throw new UnitAppointmentDeferError("Layanan tujuan tidak valid.", 400);
  }

  await syncExpiredAppointmentsBeforeUnitAction();

  const currentAppointment = await getAppointmentByIdOrQueueNumber(appointmentId);
  if (!currentAppointment) {
    throw new UnitAppointmentDeferError("Antrean unit tidak ditemukan.", 404);
  }

  assertAppointmentUnitScope(currentAppointment, unitId);
  assertUnitOperationalOwnership(
    currentAppointment,
    "Antrean yang sudah dieskalasi hanya bisa diubah dari akun petugas level 2.",
  );

  const currentServiceId = asString(currentAppointment.service_id).toUpperCase();
  if (mode !== "escalation" && serviceId === currentServiceId) {
    throw new UnitAppointmentDeferError(
      "Layanan tujuan harus berbeda dari layanan aktif.",
      409,
    );
  }

  const nextOperationalServiceId = serviceId;

  const currentStatus = normalizeAppointmentStatus(currentAppointment.status);
  if (isActiveStatus(currentStatus)) {
    assertCounterOwnership(currentAppointment, counterNumber, "Antrean ini");
  } else if (!isReadyStatus(currentStatus) || !currentAppointment.checked_in) {
    throw new UnitAppointmentDeferError(
      "Antrean ini belum berada di fase yang bisa dipindahkan layanannya.",
      409,
    );
  }

  const reassignmentNote = buildServiceReassignmentNote({
    sourceServiceId: currentServiceId,
    targetServiceId: serviceId,
    reason,
    mode,
    originCounterNumber: mode === "escalation" ? counterNumber : undefined,
  });
  const filters: Record<string, string> = {
    id: `eq.${currentAppointment.id}`,
    checked_in: "is.true",
  };

  if (isActiveStatus(currentStatus)) {
    filters.status = "in.(calling,in-service)";
    filters.or = `(counter_id.is.null,counter_id.eq.${counterNumber})`;
  } else {
    filters.status = "in.(booked,confirmed)";
  }

  const updatedRows = await patchAppointmentRows(filters, {
    service_id: nextOperationalServiceId,
    status: "confirmed",
    checked_in: true,
    staff_note: reassignmentNote,
    counter_id: null,
  });
  const updatedAppointment = updatedRows[0];

  if (!updatedAppointment) {
    throw new UnitAppointmentDeferError(
      "Layanan antrean berubah saat diproses. Muat ulang data antrean lalu coba lagi.",
      409,
    );
  }

  return {
    appointment: toUnitAppointmentPayload(updatedAppointment, {
      queueNumber: asString(currentAppointment.queue_number).toUpperCase(),
      status: "confirmed",
      checkedIn: true,
      callCount: asNumber(currentAppointment.call_count, 0),
      note: reassignmentNote,
      counterId: null,
      serviceId: nextOperationalServiceId,
    }),
  };
}
