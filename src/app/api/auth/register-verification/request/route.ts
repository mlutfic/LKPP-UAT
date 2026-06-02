import { NextResponse } from "next/server";

import { requestRegisterVerification } from "@/lib/server/public-user-auth-email";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = {
    name: String(body.name || ""),
    phone: String(body.phone || ""),
    email: String(body.email || ""),
    password: String(body.password || body.pin || ""),
  };

  try {
    const result = await requestRegisterVerification(payload);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengirim email konfirmasi.";

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
