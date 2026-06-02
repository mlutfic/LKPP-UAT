import { NextResponse } from "next/server";

import { getPublicEnv, getServerEnv } from "@/lib/env";
import { mapLegacyStaffRoleToInternalRole } from "@/lib/internal-role-policy";
import { verifyTurnstileToken } from "@/lib/server/turnstile";
import {
  getStaffResetAccessState,
  issueStaffResetSessionToken,
} from "@/lib/server/staff-reset-access";
import { listStaffAssignedCounters } from "@/lib/server/unit-counter-storage";

function normalizeLogin(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizePassword(value: unknown) {
  return String(value ?? "").trim();
}

function resolveRemoteIp(request: Request) {
  const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || undefined;
}

async function mapStaff(row: Record<string, unknown>, mustChangePin = false) {
  const unitId = String(row.unit_id ?? row.unor_id ?? row.unorId ?? "")
    .trim()
    .toUpperCase();
  const role = String(row.role ?? "resepsionis").trim();
  const internalRole = mapLegacyStaffRoleToInternalRole(role, {
    unitId,
    fallbackRole: "resepsionis",
  });
  let assignedCounters: Awaited<ReturnType<typeof listStaffAssignedCounters>> = [];
  if (internalRole === "unit-organisasi" && row.id) {
    try {
      assignedCounters = await listStaffAssignedCounters(String(row.id));
    } catch {
      assignedCounters = [];
    }
  }
  const preferredCounter =
    assignedCounters.find((entry) => entry.active) ?? assignedCounters[0] ?? null;

  return {
    id: row.id,
    name: row.name ?? "",
    loginName: row.login_name ?? "",
    photoUrl: row.photo_url ?? "",
    pin: row.pin_code ?? "",
    role,
    active: row.is_active !== false,
    assignedServices: [],
    unorId: unitId,
    unitId,
    assignedCounters,
    activeCounterId: preferredCounter?.id ?? undefined,
    activeCounterNumber: preferredCounter?.counterNumber ?? undefined,
    activeCounterLabel: preferredCounter?.label ?? undefined,
    onBreak: false,
    mustChangePin,
    schedule: [],
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const login = normalizeLogin(body.login ?? body.name);
  const password = normalizePassword(body.password ?? body.pin);
  const turnstileToken = String(body.turnstileToken || "").trim();
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();
  const isTurnstileConfigured = Boolean(
    publicEnv.turnstileSiteKey && serverEnv.turnstileSecretKey,
  );

  if (!login || !password) {
    return NextResponse.json(
      { ok: false, error: "Login dan password wajib diisi" },
      { status: 400 },
    );
  }

  if (isTurnstileConfigured) {
    const turnstileVerification = await verifyTurnstileToken(
      turnstileToken,
      resolveRemoteIp(request),
    );
    if (!turnstileVerification.ok) {
      return NextResponse.json(
        { ok: false, error: turnstileVerification.error },
        {
          status: /konfigurasi/i.test(turnstileVerification.error) ? 500 : 403,
        },
      );
    }
  }

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "Konfigurasi login belum lengkap." },
      { status: 500 },
    );
  }

  const byLoginNameUrl = new URL(`${publicEnv.supabaseUrl}/rest/v1/lkpp_staff`);
  byLoginNameUrl.searchParams.set("select", "*");
  byLoginNameUrl.searchParams.set("login_name", `eq.${login}`);
  byLoginNameUrl.searchParams.set("limit", "2");

  let staffResponse = await fetch(byLoginNameUrl, {
    method: "GET",
    headers: {
      apikey: serverEnv.serviceRoleKey,
      Authorization: `Bearer ${serverEnv.serviceRoleKey}`,
      Accept: "application/json",
    },
  });

  let staffRows = (await staffResponse.json().catch(() => [])) as Record<string, unknown>[];

  if (!staffResponse.ok) {
    return NextResponse.json(
      { ok: false, error: "Gagal memuat data akun petugas." },
      { status: 500 },
    );
  }

  if (!staffRows.length) {
    const byNameUrl = new URL(`${publicEnv.supabaseUrl}/rest/v1/lkpp_staff`);
    byNameUrl.searchParams.set("select", "*");
    byNameUrl.searchParams.set("name", `ilike.${login}`);
    byNameUrl.searchParams.set("limit", "2");

    staffResponse = await fetch(byNameUrl, {
      method: "GET",
      headers: {
        apikey: serverEnv.serviceRoleKey,
        Authorization: `Bearer ${serverEnv.serviceRoleKey}`,
        Accept: "application/json",
      },
    });

    staffRows = (await staffResponse.json().catch(() => [])) as Record<string, unknown>[];

    if (!staffResponse.ok) {
      return NextResponse.json(
        { ok: false, error: "Gagal memuat data akun petugas." },
        { status: 500 },
      );
    }
  }

  if (staffRows.length > 1) {
    return NextResponse.json(
      { ok: false, error: "Terdapat duplikasi akun petugas. Hubungi admin LKPP." },
      { status: 409 },
    );
  }

  const staff = staffRows[0] || null;
  if (!staff) {
    return NextResponse.json(
      { ok: false, error: "Kredensial tidak valid" },
      { status: 401 },
    );
  }

  if (staff.is_active === false) {
    return NextResponse.json(
      { ok: false, error: "Login ini sedang dinonaktifkan oleh Humas Admin" },
      { status: 403 },
    );
  }

  if (String(staff.pin_code ?? "").trim() !== password) {
    return NextResponse.json(
      { ok: false, error: "Kredensial tidak valid" },
      { status: 401 },
    );
  }

  const mustChangePin = await getStaffResetAccessState(String(staff.id ?? ""));

  if (mustChangePin) {
    const mappedStaff = await mapStaff(staff, true);
    return NextResponse.json({
      ok: true,
      staff: mappedStaff,
      requiresPasswordReset: true,
      resetToken: issueStaffResetSessionToken({
        staffId: String(mappedStaff.id ?? ""),
        loginName: String(mappedStaff.loginName ?? ""),
      }),
    });
  }

  return NextResponse.json({
    ok: true,
    staff: await mapStaff(staff),
  });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Metode tidak diizinkan. Gunakan POST untuk login petugas." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
