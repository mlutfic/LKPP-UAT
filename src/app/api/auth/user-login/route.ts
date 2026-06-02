import { NextResponse } from "next/server";

import { getPublicEnv, getServerEnv } from "@/lib/env";
import { verifyTurnstileToken } from "@/lib/server/turnstile";
import { issueUserProfileSessionToken } from "@/lib/server/user-profile-session";

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizePassword(value: unknown) {
  return String(value ?? "").trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function resolveRemoteIp(request: Request) {
  const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || undefined;
}

function mapUser(row: Record<string, unknown>) {
  const emailVerified = Boolean(row.email_verified);
  const phoneVerified = Boolean(row.phone_verified);
  return {
    id: row.id,
    name: row.name ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    asalInstansi: row.asal_instansi ?? "",
    namaInstansi: row.nama_instansi ?? "",
    nik: row.nik ?? "",
    provinsi: row.provinsi ?? "",
    kabupatenKota: row.kabupaten_kota ?? "",
    photoUrl: row.photo_url ?? "",
    authUserId: row.auth_user_id ?? null,
    emailVerified,
    phoneVerified,
    verificationStatus: emailVerified ? "verified" : "unverified",
    pin: row.pin_code ?? "",
    createdAt: row.created_at ?? "",
  };
}

async function verifySupabaseAuthPassword(
  email: string,
  password: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  let payload: Record<string, unknown> | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      error: String(
        payload?.msg ||
          payload?.error_description ||
          payload?.error ||
          "Auth login failed",
      ),
      code: String(payload?.code || payload?.error_code || payload?.error || ""),
    };
  }

  return {
    ok: true,
    user: payload?.user || null,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = normalizeEmail(body.email);
  const password = normalizePassword(body.password);
  const turnstileToken = String(body.turnstileToken || "").trim();
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();
  const isTurnstileConfigured = Boolean(
    publicEnv.turnstileSiteKey && serverEnv.turnstileSecretKey,
  );

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email dan password wajib diisi" },
      { status: 400 },
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "Format email tidak valid" },
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

  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey || !serverEnv.serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "Konfigurasi login belum lengkap." },
      { status: 500 },
    );
  }

  const usersUrl = new URL(`${publicEnv.supabaseUrl}/rest/v1/lkpp_users`);
  usersUrl.searchParams.set("select", "*");
  usersUrl.searchParams.set("email", `eq.${email}`);
  usersUrl.searchParams.set("limit", "2");

  const usersResponse = await fetch(usersUrl, {
    method: "GET",
    headers: {
      apikey: serverEnv.serviceRoleKey,
      Authorization: `Bearer ${serverEnv.serviceRoleKey}`,
      Accept: "application/json",
    },
  });

  if (!usersResponse.ok) {
    return NextResponse.json(
      { ok: false, error: "Gagal memuat data akun." },
      { status: 500 },
    );
  }

  const users = (await usersResponse.json().catch(() => [])) as Record<string, unknown>[];
  if (users.length > 1) {
    return NextResponse.json(
      { ok: false, error: "Terdapat duplikasi email pada data pengguna. Hubungi admin LKPP." },
      { status: 409 },
    );
  }

  const user = users[0] || null;
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Kredensial tidak valid" },
      { status: 401 },
    );
  }

  const pinCode = String(user.pin_code ?? "").trim();
  let passwordMatched = pinCode === password;

  if (!passwordMatched) {
    const authPasswordCheck = await verifySupabaseAuthPassword(
      email,
      password,
      publicEnv.supabaseUrl,
      publicEnv.supabaseAnonKey,
    );

    if (authPasswordCheck.ok) {
      passwordMatched = true;
    } else if (
      authPasswordCheck.code === "email_not_confirmed" ||
      /email[^a-z0-9]*not[^a-z0-9]*confirmed/i.test(String(authPasswordCheck.error || ""))
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Email akun belum dikonfirmasi. Buka email Anda lalu klik tautan konfirmasi terlebih dahulu.",
        },
        { status: 403 },
      );
    }
  }

  if (!passwordMatched) {
    return NextResponse.json(
      { ok: false, error: "Kredensial tidak valid" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: mapUser(user),
    profileToken: issueUserProfileSessionToken(String(user.id || "")),
  });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Metode tidak diizinkan. Gunakan POST untuk login pengguna." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
