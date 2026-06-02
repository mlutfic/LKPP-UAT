import { NextResponse } from "next/server";

import { ensureExpiredAppointmentsAutoClosed } from "@/lib/server/appointment-auto-close-sync";

export const runtime = "nodejs";

async function handleSync(force = false) {
  try {
    const summary = await ensureExpiredAppointmentsAutoClosed({ force });
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
            : "Sinkron tiket hangus otomatis gagal dijalankan.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return handleSync(true);
}

export async function POST() {
  return handleSync();
}
