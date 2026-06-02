import { NextResponse } from "next/server";

import { getPublicEnv } from "@/lib/env";
import { requestUserPasswordReset } from "@/lib/server/public-user-auth-email";

async function requestUserPasswordResetViaLegacyBackend(email: string) {
  const publicEnv = getPublicEnv();
  if (
    !publicEnv.supabaseUrl ||
    !publicEnv.supabaseAnonKey ||
    !publicEnv.supabaseFunctionName
  ) {
    throw new Error("Konfigurasi backend reset password belum lengkap.");
  }

  const backendBaseUrl = `${publicEnv.supabaseUrl}/functions/v1/${publicEnv.supabaseFunctionName}`;
  const response = await fetch(`${backendBaseUrl}/auth/user-password-reset/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicEnv.supabaseAnonKey}`,
      apikey: publicEnv.supabaseAnonKey,
      "X-App-Url": publicEnv.appUrl,
      "X-Client-Origin": publicEnv.appUrl,
    },
    body: JSON.stringify({ email }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  } & Record<string, unknown>;

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Gagal mengirim email reset password.");
  }

  return payload;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(body.email || "").trim();

  try {
    const result = await requestUserPasswordReset(email);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengirim email reset password.";

    if (message.includes("Konfigurasi email verifikasi belum lengkap.") && email) {
      try {
        const fallbackResult = await requestUserPasswordResetViaLegacyBackend(email);
        return NextResponse.json({ ok: true, ...fallbackResult, provider: "legacy-backend" });
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error
            ? fallbackError.message
            : "Gagal mengirim email reset password.";

        return NextResponse.json({ ok: false, error: fallbackMessage }, { status: 500 });
      }
    }

    const status =
      typeof error === "object" &&
      error &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? Number((error as { status: number }).status)
        : 500;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Metode tidak diizinkan. Gunakan POST." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
