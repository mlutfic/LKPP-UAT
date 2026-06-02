import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import { isEligibleStaffServiceAssignment } from "@/lib/staff-service-assignment-rules";

type StaffLookupRow = {
  id?: string | null;
  login_name?: string | null;
  role?: string | null;
  unit_id?: string | null;
  unor_id?: string | null;
};

type ServiceLookupRow = {
  id?: string | null;
  unit_id?: string | null;
  unor_id?: string | null;
  service_level?: number | string | null;
};

function normalizeLoginName(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStaffId(value: unknown) {
  return String(value || "").trim();
}

function normalizeServiceIds(value: unknown) {
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

async function fetchStaffByLoginName(loginName: string) {
  const normalizedLoginName = normalizeLoginName(loginName);
  if (!normalizedLoginName) {
    return null;
  }

  const { supabaseUrl } = getSupabaseAdminConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/lkpp_staff`);
  url.searchParams.set("select", "*");
  url.searchParams.set("login_name", `eq.${normalizedLoginName}`);
  url.searchParams.set("limit", "2");

  const response = await fetch(url, {
    method: "GET",
    headers: buildRestHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gagal mencari akun staff: ${text || response.status}`);
  }

  const rows = (await response.json()) as StaffLookupRow[];
  return rows[0] ?? null;
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
    throw new Error(`Gagal membaca akun staff: ${text || response.status}`);
  }

  const rows = (await response.json()) as StaffLookupRow[];
  return rows[0] ?? null;
}

async function resolveStaffId(staffId: string, loginName: string) {
  const normalizedStaffId = normalizeStaffId(staffId);
  if (normalizedStaffId) {
    return normalizedStaffId;
  }

  const normalizedLoginName = normalizeLoginName(loginName);
  if (!normalizedLoginName) {
    return "";
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const row = await fetchStaffByLoginName(normalizedLoginName);
    const resolvedStaffId = normalizeStaffId(row?.id);
    if (resolvedStaffId) {
      return resolvedStaffId;
    }

    if (attempt < 3) {
      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });
    }
  }

  return "";
}

async function fetchServicesByIds(serviceIds: string[]) {
  if (!serviceIds.length) {
    return [] as ServiceLookupRow[];
  }

  const { supabaseUrl } = getSupabaseAdminConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/lkpp_services`);
  url.searchParams.set("select", "*");
  url.searchParams.set(
    "id",
    `in.(${serviceIds.map((serviceId) => `"${serviceId.replaceAll("\"", "\\\"")}"`).join(",")})`,
  );
  url.searchParams.set("limit", String(Math.max(serviceIds.length, 1)));

  const response = await fetch(url, {
    method: "GET",
    headers: buildRestHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gagal membaca katalog layanan staff: ${text || response.status}`);
  }

  return (await response.json()) as ServiceLookupRow[];
}

async function validateServiceAssignmentsForStaff(
  staff: StaffLookupRow,
  serviceIds: string[],
) {
  if (!serviceIds.length) {
    return;
  }

  const services = await fetchServicesByIds(serviceIds);
  const serviceMap = new Map(
    services.map((row) => [String(row.id || "").trim().toUpperCase(), row]),
  );
  const invalidServiceIds = serviceIds.filter((serviceId) => {
    const service = serviceMap.get(serviceId);
    if (!service) {
      return true;
    }

    return !isEligibleStaffServiceAssignment({
      role: String(staff.role || ""),
      staffUnitId: String(staff.unit_id || staff.unor_id || ""),
      serviceId,
      serviceUnitId: String(service.unor_id || service.unit_id || ""),
      serviceLevel: service.service_level,
    });
  });

  if (invalidServiceIds.length > 0) {
    throw new Error(
      `Assignment layanan tidak sesuai role/unit akun ini: ${invalidServiceIds.join(", ")}`,
    );
  }
}

async function replaceStaffAssignments(staffId: string, serviceIds: string[]) {
  const { supabaseUrl } = getSupabaseAdminConfig();
  const deleteUrl = new URL(`${supabaseUrl}/rest/v1/lkpp_staff_service_assignments`);
  deleteUrl.searchParams.set("staff_id", `eq.${staffId}`);

  const deleteResponse = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      ...buildRestHeaders(),
      Prefer: "return=minimal",
    },
    cache: "no-store",
  });

  if (!deleteResponse.ok) {
    const text = await deleteResponse.text();
    throw new Error(`Gagal menghapus assignment layanan lama: ${text || deleteResponse.status}`);
  }

  if (!serviceIds.length) {
    return;
  }

  const insertResponse = await fetch(
    `${supabaseUrl}/rest/v1/lkpp_staff_service_assignments`,
    {
      method: "POST",
      headers: {
        ...buildRestHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(
        serviceIds.map((serviceId) => ({
          staff_id: staffId,
          service_id: serviceId,
        })),
      ),
      cache: "no-store",
    },
  );

  if (!insertResponse.ok) {
    const text = await insertResponse.text();
    throw new Error(`Gagal menyimpan assignment layanan baru: ${text || insertResponse.status}`);
  }
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
        { ok: false, error: "Akses sinkron layanan ditolak." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const loginName = normalizeLoginName(body.loginName);
    const serviceIds = normalizeServiceIds(body.serviceIds);
    const staffId = await resolveStaffId(
      normalizeStaffId(body.staffId),
      loginName,
    );

    if (!staffId) {
      return NextResponse.json(
        { ok: false, error: "Akun staff belum ditemukan untuk sinkron layanan." },
        { status: 404 },
      );
    }

    const staff =
      (await fetchStaffById(staffId)) ||
      (loginName ? await fetchStaffByLoginName(loginName) : null);

    if (!staff) {
      return NextResponse.json(
        { ok: false, error: "Akun staff belum ditemukan untuk validasi layanan." },
        { status: 404 },
      );
    }

    await validateServiceAssignmentsForStaff(staff, serviceIds);
    await replaceStaffAssignments(staffId, serviceIds);

    return NextResponse.json({
      ok: true,
      staffId,
      loginName,
      serviceIds,
      assignedServiceCount: serviceIds.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyinkronkan layanan akun staff.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Metode tidak diizinkan. Gunakan PUT untuk sinkron layanan staff." },
    { status: 405, headers: { Allow: "PUT" } },
  );
}
