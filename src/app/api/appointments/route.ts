import { NextResponse } from "next/server";

import {
  createUserAppointmentWithGuard,
  UserAppointmentCreateError,
} from "@/lib/server/user-appointment-create";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payload = await createUserAppointmentWithGuard(request, body);

    return NextResponse.json({
      ok: true,
      appointment: payload.appointment ?? null,
    });
  } catch (error) {
    if (error instanceof UserAppointmentCreateError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat antrean pengguna.",
      },
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
