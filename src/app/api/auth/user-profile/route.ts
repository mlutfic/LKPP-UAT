import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { MOCK_AUTH_COOKIE_NAME, parseMockSessionCookieValue } from "@/lib/auth-session";
import {
  readUserProfileFromSession,
  updateUserProfileFromSession,
  UserProfileUpdateError,
} from "@/lib/server/user-profile";
import { verifyUserProfileSessionToken } from "@/lib/server/user-profile-session";

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
    if (
      !session.userProfileToken ||
      !verifyUserProfileSessionToken(session.userProfileToken, session.userId)
    ) {
      return NextResponse.json(
        { ok: false, error: "Sesi profil sudah kedaluwarsa. Masuk ulang lalu coba lagi." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await updateUserProfileFromSession({
      userId: session.userId,
      name: typeof body.name === "string" ? body.name : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      asalInstansi: typeof body.asalInstansi === "string" ? body.asalInstansi : undefined,
      namaInstansi: typeof body.namaInstansi === "string" ? body.namaInstansi : undefined,
      nik: typeof body.nik === "string" ? body.nik : undefined,
      provinsi: typeof body.provinsi === "string" ? body.provinsi : undefined,
      kabupatenKota:
        typeof body.kabupatenKota === "string" ? body.kabupatenKota : undefined,
    });

    return NextResponse.json({
      ok: true,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof UserProfileUpdateError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { ok: false, error: "Gagal memperbarui profil pengguna." },
      { status: 500 },
    );
  }
}

export async function GET() {
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
    if (
      !session.userProfileToken ||
      !verifyUserProfileSessionToken(session.userProfileToken, session.userId)
    ) {
      return NextResponse.json(
        { ok: false, error: "Sesi profil sudah kedaluwarsa. Masuk ulang lalu coba lagi." },
        { status: 401 },
      );
    }

    const result = await readUserProfileFromSession(session.userId);

    return NextResponse.json({
      ok: true,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof UserProfileUpdateError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { ok: false, error: "Gagal memuat profil pengguna." },
      { status: 500 },
    );
  }
}
