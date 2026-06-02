import { NextRequest, NextResponse } from "next/server";

import { userAppointmentStatusMeta, type UserAppointmentStatus } from "@/content/user-appointments-content";
import { resolveEffectiveUserAppointmentStatus } from "@/features/user/appointment-status-utils";
import { APPOINTMENT_UNPROCESSED_NOTE } from "@/lib/appointment-auto-close";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import {
  buildQueueNumberLookupPattern,
  formatQueueNumberForDisplay,
  matchesQueueNumberReference,
} from "@/lib/queue-number";
import { ensureExpiredAppointmentsAutoClosed } from "@/lib/server/appointment-auto-close-sync";

type AppointmentLookupRow = {
  id: string;
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
  service_name: string;
  unit_id?: string | null;
  unit_short_name?: string | null;
  staff_note?: string | null;
};

type UnitRow = {
  id: string;
  name?: string | null;
  short_name?: string | null;
};

type PublicQueueLookupResult = {
  id: string;
  queueNumber: string;
  status: UserAppointmentStatus;
  statusLabel: string;
  statusBadge:
    | "aktif"
    | "menunggu"
    | "selesai"
    | "dipanggil"
    | "diproses"
    | "warning"
    | "danger"
    | "dijadwalkan"
    | "dibatalkan"
    | "tidak-hadir";
  summaryNote: string;
  checkedIn: boolean;
  callCount: number;
  counterId?: number;
  serviceId: string;
  serviceTitle: string;
  unitLabel: string;
  date: string;
  dateLabel: string;
  timeRange: string;
};

function normalizeLookup(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isEmailLookup(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isQueueLookup(value: string) {
  return /^[A-Z0-9]{2,}(?:-[A-Z0-9]{1,}){1,}$/i.test(value);
}

function getJakartaTodayDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function buildRestUrl(path: string, params?: Record<string, string>) {
  const publicEnv = getPublicEnv();
  if (!publicEnv.supabaseUrl) {
    throw new Error("Supabase URL belum dikonfigurasi.");
  }

  const url = new URL(`${publicEnv.supabaseUrl}/rest/v1/${path}`);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

async function fetchRestRows<T>(path: string, params?: Record<string, string>) {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    throw new Error("Konfigurasi server untuk lookup antrean publik belum lengkap.");
  }

  const response = await fetch(buildRestUrl(path, params), {
    method: "GET",
    headers: {
      apikey: serverEnv.serviceRoleKey,
      Authorization: `Bearer ${serverEnv.serviceRoleKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return (await response.json()) as T[];
}

function formatDateLabel(dateKey: string) {
  if (!dateKey) {
    return "Tanggal belum tersedia";
  }

  const date = new Date(`${dateKey}T08:00:00+07:00`);
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const statusPriority: Record<UserAppointmentStatus, number> = {
  calling: 0,
  "in-service": 1,
  escalated: 2,
  confirmed: 3,
  booked: 4,
  completed: 5,
  unprocessed: 6,
  "no-show": 7,
  cancelled: 8,
};

function compareRows(left: AppointmentLookupRow, right: AppointmentLookupRow) {
  const leftStatus = resolveEffectiveUserAppointmentStatus({
    status: left.status,
    date: left.appointment_date,
    endTime: left.end_time,
    note: left.staff_note,
  }).status;
  const rightStatus = resolveEffectiveUserAppointmentStatus({
    status: right.status,
    date: right.appointment_date,
    endTime: right.end_time,
    note: right.staff_note,
  }).status;
  const statusDelta = statusPriority[leftStatus] - statusPriority[rightStatus];
  if (statusDelta !== 0) return statusDelta;

  const leftDateTime = `${left.appointment_date}T${left.start_time}`;
  const rightDateTime = `${right.appointment_date}T${right.start_time}`;
  return rightDateTime.localeCompare(leftDateTime);
}

function mapLookupResult(row: AppointmentLookupRow, unitsById: Map<string, string>) {
  const resolvedStatus = resolveEffectiveUserAppointmentStatus({
    status: row.status,
    date: row.appointment_date,
    endTime: row.end_time,
    note: row.staff_note,
  });
  const status = resolvedStatus.status;
  const statusMeta = userAppointmentStatusMeta[status];
  const unitId = String(row.unit_id || "").trim();
  const unitLabel =
    unitsById.get(unitId) ||
    String(row.unit_short_name || "").trim() ||
    "Unit layanan LKPP";

  return {
    id: String(row.id || row.queue_number || "").trim(),
    queueNumber: formatQueueNumberForDisplay(row.queue_number),
    status,
    statusLabel: statusMeta.label,
    statusBadge: statusMeta.badgeStatus,
    summaryNote:
      status === "unprocessed"
        ? APPOINTMENT_UNPROCESSED_NOTE
        : status === "cancelled" && resolvedStatus.autoCancelled
        ? "Antrean melewati jadwal layanan dan dibatalkan otomatis oleh sistem."
        : statusMeta.note,
    checkedIn: Boolean(row.checked_in),
    callCount: Number.isFinite(row.call_count) ? row.call_count : 0,
    counterId:
      typeof row.counter_id === "number" && Number.isFinite(row.counter_id)
        ? row.counter_id
        : undefined,
    serviceId: String(row.service_id || "").trim().toUpperCase(),
    serviceTitle: String(row.service_name || "").trim() || "Layanan LKPP",
    unitLabel,
    date: String(row.appointment_date || "").trim(),
    dateLabel: formatDateLabel(String(row.appointment_date || "").trim()),
    timeRange: `${String(row.start_time || "").trim().slice(0, 5)} - ${String(row.end_time || "")
      .trim()
      .slice(0, 5)} WIB`,
  } satisfies PublicQueueLookupResult;
}

export async function POST(request: NextRequest) {
  try {
    await ensureExpiredAppointmentsAutoClosed();

    const payload = (await request.json().catch(() => ({}))) as {
      lookup?: unknown;
      todayOnly?: unknown;
    };
    const lookup = normalizeLookup(payload.lookup);

    if (!lookup) {
      return NextResponse.json(
        { ok: false, error: "Masukkan email terdaftar atau nomor antrean." },
        { status: 400 },
      );
    }

    const lookupType = isEmailLookup(lookup)
      ? "email"
      : isQueueLookup(lookup)
        ? "queue-number"
        : null;

    if (!lookupType) {
      return NextResponse.json(
        {
          ok: false,
          error: "Gunakan email terdaftar atau format nomor antrean seperti D22-01-001.",
        },
        { status: 400 },
      );
    }

    const shouldLimitToToday = lookupType === "email" && Boolean(payload.todayOnly);
    const baseParams = {
      select:
        "id,appointment_date,start_time,end_time,queue_number,status,checked_in,call_count,counter_id,user_email,service_id,service_name,unit_id,unit_short_name,staff_note",
      ...(shouldLimitToToday
        ? { appointment_date: `eq.${getJakartaTodayDateKey()}` }
        : {}),
      order: "appointment_date.desc,start_time.desc",
    } satisfies Record<string, string>;

    let rows: AppointmentLookupRow[] = [];

    if (lookupType === "email") {
      rows = await fetchRestRows<AppointmentLookupRow>("v_lkpp_appointments_enriched", {
        ...baseParams,
        user_email: `eq.${normalizeEmail(lookup)}`,
        limit: "6",
      });
    } else {
      rows = await fetchRestRows<AppointmentLookupRow>("v_lkpp_appointments_enriched", {
        ...baseParams,
        queue_number: `eq.${lookup.toUpperCase()}`,
        limit: "3",
      });

      if (!rows.length) {
        const lookupPattern = buildQueueNumberLookupPattern(lookup);
        if (lookupPattern) {
          const candidates = await fetchRestRows<AppointmentLookupRow>(
            "v_lkpp_appointments_enriched",
            {
              ...baseParams,
              queue_number: `like.${lookupPattern}`,
              limit: "20",
            },
          );

          rows = candidates.filter((row) =>
            matchesQueueNumberReference(row.queue_number, lookup),
          );
        }
      }
    }

    const normalizedRows = rows.sort(compareRows);
    const unitIds = Array.from(
      new Set(
        normalizedRows
          .map((row) => String(row.unit_id || "").trim())
          .filter(Boolean),
      ),
    );

    const units =
      unitIds.length > 0
        ? await fetchRestRows<UnitRow>("lkpp_units", {
            select: "id,name,short_name",
            id: `in.(${unitIds.join(",")})`,
          })
        : [];

    const unitsById = new Map(
      units.map((row) => [
        String(row.id || "").trim(),
        String(row.name || row.short_name || "").trim(),
      ]),
    );

    return NextResponse.json({
      ok: true,
      lookupType,
      lookup,
      matches: normalizedRows.map((row) => mapLookupResult(row, unitsById)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal membaca status antrean publik.",
      },
      { status: 500 },
    );
  }
}
