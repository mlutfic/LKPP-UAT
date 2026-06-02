import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import {
  AdminProfileError,
  readAdminProfileSettings,
  updateAdminProfileSettings,
} from "@/lib/server/admin-profile";

async function readStaffSession() {
  const cookieStore = await cookies();
  const session = parseMockSessionCookieValue(
    cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value,
  );

  const normalizedRole = String(session?.role || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

  if (!session?.staffId || normalizedRole !== "humas-admin") {
    return null;
  }

  return {
    staffId: session.staffId,
    role: normalizedRole,
  };
}

export async function GET() {
  try {
    const session = await readStaffSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Akses profil admin ditolak." },
        { status: 403 },
      );
    }

    const result = await readAdminProfileSettings(session.staffId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status = error instanceof AdminProfileError ? error.status : 500;
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal membaca profil admin.",
      },
      { status },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await readStaffSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Akses perubahan profil admin ditolak." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      profile?: unknown;
    };
    const result = await updateAdminProfileSettings({
      staffId: session.staffId,
      profile: body.profile,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status = error instanceof AdminProfileError ? error.status : 500;
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan profil admin.",
      },
      { status },
    );
  }
}
