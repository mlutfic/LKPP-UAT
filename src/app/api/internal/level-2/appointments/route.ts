import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import { ensureExpiredAppointmentsAutoClosed } from "@/lib/server/appointment-auto-close-sync";

export const runtime = "nodejs";

type LegacyAppointmentRow = {
  id?: string | null;
  user_id?: string | null;
  queue_number?: string | null;
  status?: string | null;
  checked_in?: boolean | null;
  call_count?: number | null;
  service_id?: string | null;
  service_name?: string | null;
  unit_id?: string | null;
  unit_short_name?: string | null;
  staff_note?: string | null;
  counter_id?: number | string | null;
  appointment_date?: string | null;
  start_time?: string | null;
  updated_at?: string | null;
};

type LegacyUserRow = {
  id?: string | null;
  name?: string | null;
  nik?: string | null;
};

type LegacyServiceRow = {
  id?: string | null;
  name?: string | null;
  unor_id?: string | null;
  unit_id?: string | null;
  service_level?: number | string | null;
};

type LegacyUnitRow = {
  id?: string | null;
  name?: string | null;
  short_name?: string | null;
};

type LegacyServiceLevelMap = Map<string, 1 | 2>;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: string | null | undefined) {
  return asString(value).toLowerCase();
}

function getSupabaseServerConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    throw new Error("Konfigurasi level 2 belum lengkap.");
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

  const rows = (await response.json().catch(() => [])) as T[];
  if (!response.ok) {
    const message =
      typeof rows === "object" && rows && !Array.isArray(rows)
        ? JSON.stringify(rows)
        : String(response.status);
    throw new Error(`Gagal membaca inbox level 2: ${message}`);
  }

  return Array.isArray(rows) ? rows : [];
}

function buildInFilter(values: string[]) {
  return `in.(${values.map((value) => `"${value.replaceAll("\"", "\\\"")}"`).join(",")})`;
}

function normalizeServiceLevel(value: unknown) {
  return value === 2 || value === "2" ? 2 : 1;
}

function extractOperationalSummaryLine(note: string | null | undefined) {
  const lines = (note || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    lines.find((line) =>
      /^(eskalasi dari|asal eskalasi)\b/i.test(line),
    ) ?? ""
  );
}

function isEscalatedAppointment(row: LegacyAppointmentRow) {
  return Boolean(extractOperationalSummaryLine(row.staff_note));
}

function buildLevel2ServiceIdSet(services: LegacyServiceRow[]) {
  return new Set(
    services
      .filter((service) => normalizeServiceLevel(service.service_level) === 2)
      .map((service) => asString(service.id).toUpperCase())
      .filter(Boolean),
  );
}

function buildServiceLevelMap(services: LegacyServiceRow[]): LegacyServiceLevelMap {
  return new Map(
    services
      .map((service) => [
        asString(service.id).toUpperCase(),
        normalizeServiceLevel(service.service_level) as 1 | 2,
      ] as const)
      .filter(([serviceId]) => Boolean(serviceId)),
  );
}

function isLevel2InboxAppointment(
  row: LegacyAppointmentRow,
  level2ServiceIds: Set<string>,
) {
  const status = normalizeStatus(row.status);
  if (status === "cancelled" || status === "no-show") {
    return false;
  }

  const serviceId = asString(row.service_id).toUpperCase();
  return level2ServiceIds.has(serviceId) || isEscalatedAppointment(row);
}

function isLevel2UnitScopedAppointment(
  row: LegacyAppointmentRow,
  unitId: string,
) {
  const normalizedUnitId = asString(unitId).toUpperCase();
  if (!normalizedUnitId) {
    return false;
  }

  const rowUnitId = asString(row.unit_id).toUpperCase();
  if (rowUnitId) {
    return rowUnitId === normalizedUnitId;
  }

  return asString(row.service_id).toUpperCase().startsWith(`${normalizedUnitId}-`);
}

async function readLevel2Session() {
  const cookieStore = await cookies();
  const session = parseMockSessionCookieValue(
    cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value,
  );

  const normalizedRole = String(session?.role || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

  if (session?.variant !== "staff" || !session.staffId || normalizedRole !== "petugas-level-2") {
    return null;
  }

  return {
    staffId: session.staffId,
    role: normalizedRole,
    unitId: asString(session.unitId).toUpperCase(),
  };
}

export async function GET() {
  try {
    await ensureExpiredAppointmentsAutoClosed();

    const session = await readLevel2Session();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Akses inbox level 2 ditolak." },
        { status: 403 },
      );
    }

    if (!session.unitId) {
      return NextResponse.json(
        { ok: false, error: "Unit akun level 2 belum terbaca." },
        { status: 409 },
      );
    }

    const [allAppointments, rawServices, rawUnits] = await Promise.all([
      fetchRestRows<LegacyAppointmentRow>("v_lkpp_appointments_enriched", {
        select:
          "id,user_id,queue_number,status,checked_in,call_count,service_id,service_name,unit_id,unit_short_name,staff_note,counter_id,appointment_date,start_time,updated_at",
        order: "appointment_date.desc,start_time.desc",
        limit: "500",
      }),
      fetchRestRows<LegacyServiceRow>("lkpp_services", {
        select: "*",
        limit: "500",
        order: "id.asc",
      }),
      fetchRestRows<LegacyUnitRow>("lkpp_units", {
        select: "id,name,short_name",
        limit: "200",
        order: "name.asc",
      }),
    ]);
    const level2ServiceIds = buildLevel2ServiceIdSet(rawServices);
    const serviceLevelById = buildServiceLevelMap(rawServices);
    const appointments = allAppointments.filter(
      (row) =>
        isLevel2InboxAppointment(row, level2ServiceIds) &&
        isLevel2UnitScopedAppointment(row, session.unitId),
    );
    const userIds = Array.from(
      new Set(
        appointments
          .map((row) => asString(row.user_id))
          .filter(Boolean),
      ),
    );
    const users = userIds.length
      ? await fetchRestRows<LegacyUserRow>("lkpp_users", {
          select: "id,name,nik",
          id: buildInFilter(userIds),
        })
      : [];

    const services = rawServices.filter(
      (row) => asString(row.unor_id || row.unit_id).toUpperCase() === session.unitId,
    );
    const units = rawUnits.filter(
      (row) => asString(row.id).toUpperCase() === session.unitId,
    );

    return NextResponse.json({
      ok: true,
      data: {
        appointments: appointments.map((row) => ({
          id: asString(row.id),
          created_at:
            row.appointment_date && row.start_time
              ? `${asString(row.appointment_date)}T${asString(row.start_time)}`
              : undefined,
          user_id: asString(row.user_id) || undefined,
          queue_number: asString(row.queue_number).toUpperCase() || undefined,
          status: asString(row.status) || undefined,
          checked_in: row.checked_in === true,
          call_count: row.call_count ?? 0,
          service_id: asString(row.service_id).toUpperCase() || undefined,
          service_name: asString(row.service_name) || undefined,
          unit_id: asString(row.unit_id).toUpperCase() || undefined,
          unit_short_name: asString(row.unit_short_name) || undefined,
          staff_note: asString(row.staff_note) || undefined,
          service_level:
            serviceLevelById.get(asString(row.service_id).toUpperCase()) ?? 1,
          counter_id: row.counter_id ?? undefined,
          appointment_date: asString(row.appointment_date) || undefined,
          start_time: asString(row.start_time) || undefined,
          updated_at: asString(row.updated_at) || undefined,
        })),
        users: users.map((row) => ({
          id: asString(row.id),
          name: asString(row.name),
          nik: asString(row.nik),
        })),
        services: services.map((row) => ({
          id: asString(row.id).toUpperCase(),
          name: asString(row.name),
          unor_id: asString(row.unor_id || row.unit_id).toUpperCase(),
          service_level: row.service_level ?? 1,
        })),
        units: units.map((row) => ({
          id: asString(row.id).toUpperCase(),
          name: asString(row.name || row.short_name),
          short_name: asString(row.short_name),
        })),
      },
      actor: session,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat inbox level 2.",
      },
      { status: 500 },
    );
  }
}
