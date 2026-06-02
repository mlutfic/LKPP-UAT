import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import {
  readCurrentCallingNotificationByUserEmail,
  readLatestCallingNotificationByUserId,
} from "@/lib/server/user-calling-push";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = parseMockSessionCookieValue(
      cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value ?? null,
    );

    if (
      !session ||
      session.variant !== "user" ||
      session.authMode !== "live" ||
      !session.email
    ) {
      return NextResponse.json(
        { ok: false, error: "Sesi user tidak aktif." },
        { status: 401 },
      );
    }

    const appointment =
      (session.userId
        ? await readLatestCallingNotificationByUserId(session.userId)
        : null) ?? (await readCurrentCallingNotificationByUserEmail(session.email));

    return NextResponse.json({
      ok: true,
      appointment,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal membaca notifikasi panggilan terbaru.",
      },
      { status: 500 },
    );
  }
}
