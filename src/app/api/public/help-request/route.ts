import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { verifyTurnstileToken } from "@/lib/server/turnstile";

const helpRequestSchema = z.object({
  name: z.string().trim().min(3, "Nama lengkap minimal 3 karakter."),
  email: z.string().trim().email("Gunakan alamat email yang valid."),
  phone: z.string().trim().min(10, "Nomor WhatsApp belum valid."),
  topic: z.string().trim().min(3, "Pilih topik bantuan terlebih dahulu."),
  message: z.string().trim().min(20, "Isi pesan minimal 20 karakter."),
  turnstileToken: z.string().trim().min(1, "Verifikasi keamanan wajib diselesaikan."),
});

export async function POST(request: NextRequest) {
  try {
    const payload = helpRequestSchema.parse(
      (await request.json().catch(() => ({}))) as Record<string, unknown>,
    );

    const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
    const remoteIp = forwardedFor.split(",")[0]?.trim() || undefined;
    const verification = await verifyTurnstileToken(payload.turnstileToken, remoteIp);
    if (!verification.ok) {
      return NextResponse.json(
        { ok: false, error: verification.error },
        { status: 403 },
      );
    }

    const { supportInboxEmail } = getServerEnv();
    const subject = `[Portal Antrean LKPP] ${payload.topic}`;
    const bodyLines = [
      "Halo tim layanan LKPP,",
      "",
      "Mohon bantuan untuk kendala berikut:",
      payload.message,
      "",
      "Data pengirim:",
      `Nama: ${payload.name}`,
      `Email: ${payload.email}`,
      `WhatsApp: ${payload.phone}`,
      `Topik: ${payload.topic}`,
    ];

    const mailtoUrl = `mailto:${encodeURIComponent(
      supportInboxEmail,
    )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      bodyLines.join("\n"),
    )}`;

    return NextResponse.json({
      ok: true,
      delivery: "mailto",
      mailtoUrl,
      message:
        "Form bantuan sudah tervalidasi. Aplikasi akan membuka email Anda dengan format pesan yang sudah disiapkan.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: error.issues[0]?.message || "Data bantuan belum lengkap." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Permintaan bantuan belum dapat diproses." },
      { status: 500 },
    );
  }
}
