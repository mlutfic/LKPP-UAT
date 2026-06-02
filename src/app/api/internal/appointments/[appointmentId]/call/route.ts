import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  isInternalRole,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import { getPublicEnv } from "@/lib/env";
import { getBaselineStaffPermissions } from "@/lib/internal-role-policy";
import { getLegacyStaffDirectory } from "@/lib/server/local-auth-bridge";
import {
  callUnitAppointmentFromSession,
  UnitAppointmentDeferError,
} from "@/lib/server/unit-appointment-defer";
import { readUnitOperationalSession } from "@/lib/server/unit-operational-session";
import {
  buildCallingNotificationSnapshotFromAppointment,
  readCallingAppointmentUserId,
  writeLatestCallingNotificationForUser,
} from "@/lib/server/user-calling-push";
import { sendSilentPushToUser } from "@/lib/server/web-push";
import { ensureExpiredAppointmentsAutoClosed } from "@/lib/server/appointment-auto-close-sync";

export const runtime = "nodejs";

class CallingAppointmentRouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CallingAppointmentRouteError";
    this.status = status;
  }
}

function resolveRequestOrigin(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  const referer = request.headers.get("referer")?.trim();

  if (origin) {
    return origin.replace(/\/$/, "");
  }

  if (referer) {
    try {
      return new URL(referer).origin.replace(/\/$/, "");
    } catch {
      // Ignore malformed referer.
    }
  }

  return getPublicEnv().appUrl.replace(/\/$/, "");
}

async function readStaffSession() {
  const session = await readUnitOperationalSession();
  if (session) {
    if (!getBaselineStaffPermissions("unit-organisasi").canCallQueue) {
      return null;
    }

    return {
      staffId: session.staffId,
      role: "unit-organisasi" as const,
      unitId: session.unitId,
      activeCounterNumber: session.activeCounterNumber,
    };
  }

  const cookieStore = await cookies();
  const parsedSession = parseMockSessionCookieValue(
    cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value ?? null,
  );

  if (
    parsedSession?.variant !== "staff" ||
    parsedSession.authMode !== "live" ||
    !parsedSession.staffId ||
    !parsedSession.role ||
    !isInternalRole(parsedSession.role)
  ) {
    return null;
  }

  if (!getBaselineStaffPermissions(parsedSession.role).canCallQueue) {
    return null;
  }

  let unitId = "";
  if (parsedSession.role === "unit-organisasi") {
    const directory = await getLegacyStaffDirectory();
    unitId =
      directory.find((item) => item.id === parsedSession.staffId)?.unitId
        ?.trim()
        .toUpperCase() || "";
  }

  return {
    staffId: parsedSession.staffId,
    role: parsedSession.role,
    unitId,
    activeCounterNumber: undefined,
  };
}

async function forwardCallingStatusUpdate(
  request: Request,
  appointmentId: string,
  staffId: string,
) {
  const publicEnv = getPublicEnv();

  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    throw new CallingAppointmentRouteError(
      "Konfigurasi backend pemanggilan antrean belum lengkap.",
      500,
    );
  }

  const backendBaseUrl = `${publicEnv.supabaseUrl}/functions/v1/${publicEnv.supabaseFunctionName}`;
  const response = await fetch(
    `${backendBaseUrl}/appointments/${encodeURIComponent(appointmentId)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${publicEnv.supabaseAnonKey}`,
        "Content-Type": "application/json",
        "X-App-Url": resolveRequestOrigin(request),
        "X-Client-Origin": resolveRequestOrigin(request),
        "X-Staff-Id": staffId,
      },
      body: JSON.stringify({
        action: "status",
        status: "calling",
      }),
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    appointment?: unknown;
  };

  if (!response.ok || payload.ok === false) {
    throw new CallingAppointmentRouteError(
      payload.error || "Gagal memanggil antrean.",
      response.status || 500,
    );
  }

  return payload;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ appointmentId: string }> },
) {
  try {
    await ensureExpiredAppointmentsAutoClosed({ force: true });

    const session = await readStaffSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Akses aksi panggil antrean ditolak." },
        { status: 403 },
      );
    }

    const { appointmentId } = await context.params;
    const normalizedAppointmentId = String(appointmentId || "").trim();
    const payload =
      session.role === "unit-organisasi"
        ? await callUnitAppointmentFromSession({
            appointmentId: normalizedAppointmentId,
            unitId: session.unitId,
            counterNumber: session.activeCounterNumber,
          })
        : await forwardCallingStatusUpdate(
            request,
            normalizedAppointmentId,
            session.staffId,
          );

    try {
      const calledAppointment = payload.appointment as
        | {
            id?: string;
            queueNumber?: string;
            serviceId?: string;
            callCount?: number;
            counterId?: number;
          }
        | null
        | undefined;
      const calledAppointmentId =
        typeof calledAppointment?.id === "string" && calledAppointment.id.trim()
          ? calledAppointment.id.trim()
          : normalizedAppointmentId;
      const userId = await readCallingAppointmentUserId(calledAppointmentId);
      if (userId) {
        const snapshot = buildCallingNotificationSnapshotFromAppointment({
          id: calledAppointmentId,
          queueNumber: calledAppointment?.queueNumber,
          serviceId: calledAppointment?.serviceId,
          callCount: calledAppointment?.callCount,
          counterId: calledAppointment?.counterId,
        });
        if (snapshot) {
          await writeLatestCallingNotificationForUser(userId, snapshot);
        }
        await sendSilentPushToUser(userId, snapshot ?? undefined);
      }
    } catch {
      // Push is additive; never fail the queue call if notification delivery breaks.
    }

    return NextResponse.json({
      ok: true,
      appointment: payload.appointment ?? null,
    });
  } catch (error) {
    if (error instanceof UnitAppointmentDeferError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof CallingAppointmentRouteError) {
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
            : "Gagal memanggil antrean.",
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
