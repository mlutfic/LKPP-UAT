import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { MOCK_AUTH_COOKIE_NAME, parseMockSessionCookieValue } from "@/lib/auth-session";
import {
  UserEmailChangeError,
  requestUserEmailChangeVerification,
} from "@/lib/server/user-email-change";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = parseMockSessionCookieValue(
      cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value ?? null,
    );

    if (!session || session.variant !== "user" || session.authMode !== "live" || !session.userId) {
      return NextResponse.json(
        { ok: false, error: "Sesi pengguna tidak aktif. Masuk ulang lalu coba lagi." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = String(body.userId || "").trim();
    const newEmail = String(body.newEmail || "").trim();
    const currentPassword = String(body.currentPassword || "").trim();

    if (!userId || userId !== session.userId) {
      return NextResponse.json(
        { ok: false, error: "Identitas pengguna tidak cocok dengan sesi aktif." },
        { status: 403 },
      );
    }

    const result = await requestUserEmailChangeVerification({
      userId,
      newEmail,
      currentPassword,
    });

    return NextResponse.json({
      ok: true,
      destination: result.destination,
      expiresInSec: result.expiresInSec,
    });
  } catch (error) {
    if (error instanceof UserEmailChangeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { ok: false, error: "Gagal mengirim verifikasi perubahan email." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Metode tidak diizinkan. Gunakan POST." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
