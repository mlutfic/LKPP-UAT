import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import { resolveLegacyStaffId } from "@/lib/server/staff-reset-access";
import {
  listUnitCounters,
  replaceStaffCounterAssignments,
} from "@/lib/server/unit-counter-storage";
import { getPublicEnv, getServerEnv } from "@/lib/env";

type StaffLookupRow = {
  id?: string | null;
  role?: string | null;
  unit_id?: string | null;
  unor_id?: string | null;
};

function normalizeLoginName(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStaffId(value: unknown) {
  return String(value || "").trim();
}

function normalizeRole(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCounterIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => String(entry || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  ).sort();
}

function getSupabaseAdminConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    throw new Error("Konfigurasi Supabase server belum lengkap.");
  }

  return {
    supabaseUrl: publicEnv.supabaseUrl,
    serviceRoleKey: serverEnv.serviceRoleKey,
  };
}

function buildRestHeaders() {
  const { serviceRoleKey } = getSupabaseAdminConfig();
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
  };
}

async function fetchStaffById(staffId: string) {
  const normalizedStaffId = normalizeStaffId(staffId);
  if (!normalizedStaffId) {
    return null;
  }

  const { supabaseUrl } = getSupabaseAdminConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/lkpp_staff`);
  url.searchParams.set("select", "*");
  url.searchParams.set("id", `eq.${normalizedStaffId}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    method: "GET",
    headers: buildRestHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gagal membaca akun staff untuk validasi loket: ${text || response.status}`);
  }

  const rows = (await response.json()) as StaffLookupRow[];
  return rows[0] ?? null;
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = parseMockSessionCookieValue(
      cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value,
    );

    const normalizedRole = String(session?.role || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");

    if (!session?.staffId || normalizedRole !== "humas-admin") {
      return NextResponse.json(
        { ok: false, error: "Akses sinkron loket petugas ditolak." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const loginName = normalizeLoginName(body.loginName);
    const counterIds = normalizeCounterIds(body.counterIds);
    const staffId = await resolveLegacyStaffId(
      normalizeStaffId(body.staffId),
      loginName,
    );

    if (!staffId) {
      return NextResponse.json(
        { ok: false, error: "Akun staff belum ditemukan untuk sinkron loket." },
        { status: 404 },
      );
    }

    const staff = await fetchStaffById(staffId);
    if (!staff) {
      return NextResponse.json(
        { ok: false, error: "Akun staff belum ditemukan untuk validasi loket." },
        { status: 404 },
      );
    }

    const normalizedStaffRole = normalizeRole(staff.role);
    if (normalizedStaffRole !== "akun_unit" && counterIds.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Hanya akun unit organisasi yang boleh memiliki assignment loket." },
        { status: 400 },
      );
    }

    if (counterIds.length > 0) {
      const normalizedUnitId = String(staff.unit_id || staff.unor_id || "").trim().toUpperCase();
      const counters = await listUnitCounters();
      const counterMap = new Map(counters.map((counter) => [counter.id, counter]));
      const invalidCounterIds = counterIds.filter((counterId) => {
        const counter = counterMap.get(counterId);
        return !counter || counter.unitId !== normalizedUnitId;
      });

      if (invalidCounterIds.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: `Assignment loket tidak sesuai unit akun ini: ${invalidCounterIds.join(", ")}`,
          },
          { status: 400 },
        );
      }
    }

    const result = await replaceStaffCounterAssignments(staffId, counterIds);

    return NextResponse.json({
      ok: true,
      staffId: result.staffId,
      loginName,
      counterIds: result.counterIds,
      assignedCounterCount: result.counterIds.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyinkronkan loket akun staff.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Metode tidak diizinkan. Gunakan PUT untuk sinkron loket staff." },
    { status: 405, headers: { Allow: "PUT" } },
  );
}
