import { NextResponse } from "next/server";

import {
  confirmUserEmailChange,
  UserEmailChangeError,
} from "@/lib/server/user-email-change";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const emailChangeToken = String(body.emailChangeToken || "").trim();

    if (!emailChangeToken) {
      return NextResponse.json(
        { ok: false, error: "Tautan verifikasi perubahan email tidak lengkap." },
        { status: 400 },
      );
    }

    const result = await confirmUserEmailChange(emailChangeToken);

    return NextResponse.json({
      ok: true,
      user: result.user,
      email: result.email,
    });
  } catch (error) {
    if (error instanceof UserEmailChangeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { ok: false, error: "Gagal mengonfirmasi perubahan email." },
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
