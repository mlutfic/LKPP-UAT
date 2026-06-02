import { NextResponse } from "next/server";

import { confirmUserPasswordReset } from "@/lib/server/public-user-auth-email";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const result = await confirmUserPasswordReset({
      verificationToken: String(body.verificationToken || ""),
      challengeToken: String(body.challengeToken || ""),
      emailOtp: String(body.emailOtp || ""),
      newPassword: String(body.newPassword || body.newPin || ""),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menyimpan password baru.";
    const status =
      typeof error === "object" &&
      error &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? Number((error as { status: number }).status)
        : 500;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Metode tidak diizinkan. Gunakan POST." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
