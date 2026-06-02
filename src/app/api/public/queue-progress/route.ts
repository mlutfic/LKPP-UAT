import { NextRequest, NextResponse } from "next/server";

import { resolveEffectiveUserAppointmentStatus } from "@/features/user/appointment-status-utils";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";
import { ensureExpiredAppointmentsAutoClosed } from "@/lib/server/appointment-auto-close-sync";

type QueueProgressRequest = {
  serviceId?: unknown;
  date?: unknown;
  series?: unknown;
};

type AppointmentProgressRow = {
  appointment_date: string;
  end_time?: string | null;
  queue_number: string;
  status: string;
  checked_in?: boolean | null;
  call_count?: number | null;
  service_id: string;
  staff_note?: string | null;
};

type QueueProgressSummary = {
  serviceId: string;
  date: string;
  series: string;
  currentServingQueueNumber: string | null;
  currentServingSequence: number | null;
  beforeYourTurnAnchorSequence: number;
};

function asString(value: unknown) {
  return String(value || "").trim();
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeQueueDisplayValue(value: unknown) {
  const normalizedValue = asString(value).toUpperCase();
  if (!normalizedValue) {
    return "";
  }

  return formatQueueNumberForDisplay(normalizedValue) || normalizedValue;
}

function extractQueueSequence(value: unknown) {
  const normalizedValue = normalizeQueueDisplayValue(value);
  if (!normalizedValue) {
    return null;
  }

  const sequenceSegment = normalizedValue.split("-").at(-1) || "";
  if (!/^\d+$/.test(sequenceSegment)) {
    return null;
  }

  const sequence = Number.parseInt(sequenceSegment, 10);
  return Number.isFinite(sequence) && sequence > 0 ? sequence : null;
}

function extractQueueSeries(value: unknown, fallbackServiceId = "") {
  const normalizedValue = normalizeQueueDisplayValue(value);
  if (normalizedValue) {
    const parts = normalizedValue.split("-");
    const sequenceSegment = parts.at(-1) || "";
    if (parts.length >= 2 && /^\d+$/.test(sequenceSegment)) {
      return parts.slice(0, -1).join("-");
    }
  }

  return asString(fallbackServiceId).toUpperCase();
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
    throw new Error("Konfigurasi server untuk progres antrean publik belum lengkap.");
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

function normalizeRequest(input: QueueProgressRequest) {
  const serviceId = asString(input.serviceId).toUpperCase();
  const date = asString(input.date);
  const explicitSeries = normalizeQueueDisplayValue(input.series).toUpperCase();
  const series = explicitSeries || extractQueueSeries(input.series, serviceId);

  if (!serviceId || !date || !series) {
    return null;
  }

  return {
    serviceId,
    date,
    series,
  };
}

function buildQueueProgressSummary(
  request: { serviceId: string; date: string; series: string },
  rows: AppointmentProgressRow[],
) {
  const activeServingRows: Array<{
    sequence: number;
    queueNumber: string;
  }> = [];
  const completedSequences: number[] = [];

  for (const row of rows) {
    const rowSeries = extractQueueSeries(row.queue_number, row.service_id);
    if (rowSeries !== request.series) {
      continue;
    }

    const sequence = extractQueueSequence(row.queue_number);
    if (sequence === null) {
      continue;
    }

    const resolvedStatus = resolveEffectiveUserAppointmentStatus({
      status: row.status,
      date: asString(row.appointment_date),
      endTime: asString(row.end_time),
      note: row.staff_note,
    }).status;
    const checkedIn = Boolean(row.checked_in);
    const callCount = asNumber(row.call_count, 0);
    const normalizedStatus =
      ["calling", "in-service", "completed", "unprocessed", "cancelled", "no-show"].includes(
        resolvedStatus,
      )
        ? resolvedStatus
        : checkedIn && callCount > 0
          ? "calling"
          : resolvedStatus;

    if (normalizedStatus === "calling" || normalizedStatus === "in-service") {
      activeServingRows.push({
        sequence,
        queueNumber: normalizeQueueDisplayValue(row.queue_number),
      });
      continue;
    }

    if (normalizedStatus === "completed") {
      completedSequences.push(sequence);
    }
  }

  const currentServingRow =
    activeServingRows.length > 0
      ? [...activeServingRows].sort((left, right) => right.sequence - left.sequence)[0] ?? null
      : null;
  const currentServingSequence = currentServingRow?.sequence ?? null;
  const lastCompletedSequence =
    completedSequences.length > 0 ? Math.max(...completedSequences) : null;

  return {
    serviceId: request.serviceId,
    date: request.date,
    series: request.series,
    currentServingQueueNumber: currentServingRow?.queueNumber ?? null,
    currentServingSequence,
    beforeYourTurnAnchorSequence:
      currentServingSequence ??
      (lastCompletedSequence !== null ? lastCompletedSequence + 1 : 1),
  } satisfies QueueProgressSummary;
}

export async function POST(request: NextRequest) {
  try {
    await ensureExpiredAppointmentsAutoClosed();

    const payload = (await request.json().catch(() => ({}))) as {
      requests?: QueueProgressRequest[];
    };
    const normalizedRequests = Array.isArray(payload.requests)
      ? payload.requests
          .map(normalizeRequest)
          .filter(
            (
              entry,
            ): entry is { serviceId: string; date: string; series: string } => Boolean(entry),
          )
      : [];

    if (!normalizedRequests.length) {
      return NextResponse.json(
        { ok: false, error: "Daftar progres antrean belum valid." },
        { status: 400 },
      );
    }

    const uniqueRequests = Array.from(
      new Map(
        normalizedRequests.map((entry) => [
          `${entry.serviceId}::${entry.date}::${entry.series}`,
          entry,
        ]),
      ).values(),
    );

    const summaries = await Promise.all(
      uniqueRequests.map(async (entry) => {
        const rows = await fetchRestRows<AppointmentProgressRow>(
          "v_lkpp_appointments_enriched",
          {
            select:
              "appointment_date,end_time,queue_number,status,checked_in,call_count,service_id,staff_note",
            appointment_date: `eq.${entry.date}`,
            queue_number: `like.${entry.series}-%`,
            limit: "200",
          },
        );

        return buildQueueProgressSummary(entry, rows);
      }),
    );

    return NextResponse.json({
      ok: true,
      progress: summaries,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal membaca progres antrean publik.",
      },
      { status: 500 },
    );
  }
}
