import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  type MockSession,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import {
  listAdminServiceLevels,
  updateAdminServiceLevel,
} from "@/lib/server/admin-service-levels";

async function readSession(): Promise<MockSession | null> {
  const cookieStore = await cookies();
  return parseMockSessionCookieValue(
    cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value,
  );
}

async function hasLiveStaffSession() {
  const session = await readSession();
  return Boolean(
    session?.variant === "staff" &&
      session?.authMode === "live" &&
      session?.staffId,
  );
}

async function isHumasAdminSession() {
  const session = await readSession();
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

export async function GET() {
  try {
    if (!(await hasLiveStaffSession())) {
      return NextResponse.json(
        { ok: false, error: "Akses level layanan ditolak." },
        { status: 403 },
      );
    }

    const serviceLevels = await listAdminServiceLevels();
    return NextResponse.json({ ok: true, serviceLevels });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal membaca level layanan.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await isHumasAdminSession())) {
      return NextResponse.json(
        { ok: false, error: "Akses perubahan level layanan ditolak." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const serviceId = String(body.serviceId || "").trim().toUpperCase();
    const serviceLevel = body.serviceLevel === 2 ? 2 : 1;

    if (!serviceId) {
      return NextResponse.json(
        { ok: false, error: "ID layanan wajib diisi." },
        { status: 400 },
      );
    }

    const result = await updateAdminServiceLevel(serviceId, serviceLevel);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan level layanan.",
      },
      { status: 500 },
    );
  }
}
