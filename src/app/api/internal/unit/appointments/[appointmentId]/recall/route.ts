import { NextResponse } from "next/server";

import {
  recallDeferredUnitAppointmentFromSession,
  UnitAppointmentDeferError,
} from "@/lib/server/unit-appointment-defer";
import { readUnitOperationalSession } from "@/lib/server/unit-operational-session";
import {
  buildCallingNotificationSnapshotFromAppointment,
  readCallingAppointmentUserId,
  writeLatestCallingNotificationForUser,
} from "@/lib/server/user-calling-push";
import { sendSilentPushToUser } from "@/lib/server/web-push";

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
  _request: Request,
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

    const { appointmentId } = await context.params;

    const result = await recallDeferredUnitAppointmentFromSession({
      appointmentId,
      unitId: session.unitId,
      counterNumber: session.activeCounterNumber,
    });

    if (result.appointment?.id) {
      try {
        const userId = await readCallingAppointmentUserId(result.appointment.id);
        if (userId) {
          const snapshot = buildCallingNotificationSnapshotFromAppointment({
            id: result.appointment.id,
            queueNumber: result.appointment.queueNumber,
            serviceId: result.appointment.serviceId,
            callCount: result.appointment.callCount,
            counterId: result.appointment.counterId,
          });
          if (snapshot) {
            await writeLatestCallingNotificationForUser(userId, snapshot);
          }
          await sendSilentPushToUser(userId, snapshot ?? undefined);
        }
      } catch {
        // Push is additive; recall must still succeed.
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
            : "Gagal memanggil ulang antrean unit.",
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
