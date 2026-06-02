import { NextResponse } from "next/server";

import {
  deferUnitAppointmentFromSession,
  UnitAppointmentDeferError,
} from "@/lib/server/unit-appointment-defer";
import { readUnitOperationalSession } from "@/lib/server/unit-operational-session";
import {
  clearLatestCallingNotificationForUser,
  readCallingAppointmentUserId,
} from "@/lib/server/user-calling-push";

async function readUnitStaffSession() {
  const session = await readUnitOperationalSession();
  if (!session) {
    return null;
  }

  return {
    staffId: session.staffId,
    unitId: session.unitId,
    activeCounterNumber: session.activeCounterNumber,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ appointmentId: string }> },
) {
  try {
    const session = await readUnitStaffSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Akses aksi unit ditolak." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      note?: unknown;
    };
    const { appointmentId } = await context.params;

    const result = await deferUnitAppointmentFromSession({
      appointmentId,
      unitId: session.unitId,
      counterNumber: session.activeCounterNumber,
      note: String(body.note || "").trim(),
    });

    if (result.appointment?.id) {
      try {
        const deferredUserId = await readCallingAppointmentUserId(result.appointment.id);
        if (deferredUserId) {
          await clearLatestCallingNotificationForUser(
            deferredUserId,
            result.appointment.id,
          );
        }
      } catch {
        // Clearing stale snapshot is additive.
      }
    }

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
            : "Gagal melewati antrean unit sementara.",
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
