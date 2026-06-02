import { NextResponse } from "next/server";

import {
  cancelUserAppointmentFromSession,
  UserAppointmentCancelError,
} from "@/lib/server/user-appointment-cancel";

export async function POST(
  request: Request,
  context: { params: Promise<{ appointmentId: string }> },
) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const { appointmentId } = await context.params;

    const appointment = await cancelUserAppointmentFromSession({
      appointmentId,
      userId: String(body.userId || "").trim(),
    });

    return NextResponse.json({
      ok: true,
      appointment,
    });
  } catch (error) {
    if (error instanceof UserAppointmentCancelError) {
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
            : "Gagal membatalkan antrean pengguna.",
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
