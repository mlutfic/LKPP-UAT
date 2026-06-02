import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import {
  listUnitCounters,
  replaceUnitCounters,
} from "@/lib/server/unit-counter-storage";

function hasHumasAdminLiveSession(session: ReturnType<typeof parseMockSessionCookieValue>) {
  const normalizedRole = String(session?.role || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

  return Boolean(
    session?.variant === "staff" &&
      session?.authMode === "live" &&
      session?.staffId &&
      normalizedRole === "humas-admin",
  );
}

async function readSession() {
  const cookieStore = await cookies();
  return parseMockSessionCookieValue(
    cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value,
  );
}

export async function GET() {
  try {
    const session = await readSession();
    if (!hasHumasAdminLiveSession(session)) {
      return NextResponse.json(
        { ok: false, error: "Akses daftar loket unit ditolak." },
        { status: 403 },
      );
    }

    const items = await listUnitCounters();
    return NextResponse.json({
      ok: true,
      items,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Gagal membaca daftar loket unit.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await readSession();
    if (!hasHumasAdminLiveSession(session)) {
      return NextResponse.json(
        { ok: false, error: "Akses perubahan loket unit ditolak." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      unitId?: unknown;
      counters?: unknown;
    };
    const unitId = String(body.unitId || "").trim().toUpperCase();
    const counters = Array.isArray(body.counters) ? body.counters : [];

    if (!unitId) {
      return NextResponse.json(
        { ok: false, error: "ID unit wajib diisi." },
        { status: 400 },
      );
    }

    const items = await replaceUnitCounters(
      unitId,
      counters.map((entry) => ({
        counterNumber:
          entry && typeof entry === "object" && "counterNumber" in entry
            ? Number((entry as { counterNumber?: unknown }).counterNumber ?? 0)
            : 0,
        label:
          entry && typeof entry === "object" && "label" in entry
            ? String((entry as { label?: unknown }).label || "")
            : "",
        active:
          !entry ||
          typeof entry !== "object" ||
          !("active" in entry) ||
          (entry as { active?: unknown }).active !== false,
      })),
    );

    return NextResponse.json({
      ok: true,
      unitId,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Gagal menyimpan loket unit.",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Metode tidak diizinkan. Gunakan GET atau PUT." },
    { status: 405, headers: { Allow: "GET, PUT" } },
  );
}
