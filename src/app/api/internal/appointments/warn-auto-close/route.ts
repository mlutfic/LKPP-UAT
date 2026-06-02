import { NextResponse } from "next/server";

import { ensureAppointmentAutoCloseWarningsSent } from "@/lib/server/appointment-auto-close-warning";

export const runtime = "nodejs";

async function handleWarning(force = false) {
  try {
    const summary = await ensureAppointmentAutoCloseWarningsSent({ force });
    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Warning auto-close konsultasi gagal dijalankan.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return handleWarning(true);
}

export async function POST() {
  return handleWarning();
}
