import { NextResponse } from "next/server";

import { completeRegister } from "@/lib/server/public-user-auth-email";
import { issueUserProfileSessionToken } from "@/lib/server/user-profile-session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const result = await completeRegister({
      name: String(body.name || ""),
      phone: String(body.phone || ""),
      email: String(body.email || ""),
      password: String(body.password || body.pin || ""),
      verificationToken: String(body.verificationToken || ""),
      asalInstansi: String(body.asalInstansi || ""),
      namaInstansi: String(body.namaInstansi || ""),
      nik: String(body.nik || ""),
      provinsi: String(body.provinsi || ""),
      kabupatenKota: String(body.kabupatenKota || ""),
    });

    const user =
      result.user && typeof result.user === "object"
        ? (result.user as Record<string, unknown>)
        : null;

    return NextResponse.json({
      ok: true,
      ...result,
      profileToken:
        user && typeof user.id === "string"
          ? issueUserProfileSessionToken(user.id)
          : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menyelesaikan pendaftaran.";
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
