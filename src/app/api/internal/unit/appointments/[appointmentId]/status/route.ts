import { NextResponse } from "next/server";

import {
  UnitAppointmentDeferError,
  updateUnitAppointmentStatusFromSession,
} from "@/lib/server/unit-appointment-defer";
import { readUnitOperationalSession } from "@/lib/server/unit-operational-session";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ appointmentId: string }> },
) {
  try {
    const session = await readUnitOperationalSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Akses aksi unit ditolak." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      status?: unknown;
      note?: unknown;
    };
    const { appointmentId } = await context.params;
    const status = String(body.status || "").trim().toLowerCase();

    if (status !== "in-service" && status !== "completed") {
      return NextResponse.json(
        { ok: false, error: "Status unit yang diminta tidak didukung." },
        { status: 400 },
      );
    }

    const result = await updateUnitAppointmentStatusFromSession({
      appointmentId,
      unitId: session.unitId,
      counterNumber: session.activeCounterNumber,
      status,
      note: String(body.note || "").trim(),
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof UnitAppointmentDeferError) {
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
            : "Gagal memperbarui status antrean unit.",
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
