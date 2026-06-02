import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import {
  generateCallingTtsAudio,
  getCallingTtsConfig,
} from "@/lib/server/calling-tts";

const MAX_CALLING_TEXT_LENGTH = 600;

async function readLiveUserSession() {
  const cookieStore = await cookies();
  const session = parseMockSessionCookieValue(
    cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value ?? null,
  );

  if (
    !session ||
    session.variant !== "user" ||
    session.authMode !== "live" ||
    !session.userId
  ) {
    return null;
  }

  return session;
}

export async function GET() {
  const session = await readLiveUserSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const config = getCallingTtsConfig();

  return NextResponse.json({
    ok: true,
    enabled: config.enabled,
    provider: config.provider || null,
  });
}

export async function POST(request: Request) {
  const session = await readLiveUserSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { text?: unknown }
    | null;
  const text = String(body?.text ?? "").trim();

  if (!text) {
    return NextResponse.json(
      { ok: false, error: "Teks panggilan wajib diisi." },
      { status: 400 },
    );
  }

  if (text.length > MAX_CALLING_TEXT_LENGTH) {
    return NextResponse.json(
      { ok: false, error: "Teks panggilan terlalu panjang." },
      { status: 400 },
    );
  }

  try {
    const audio = await generateCallingTtsAudio(text);

    return new Response(new Uint8Array(audio.audio), {
      status: 200,
      headers: {
        "Content-Type": audio.contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal membuat suara panggilan.";
    const status =
      typeof error === "object" &&
      error &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? Number((error as { status: number }).status)
        : 500;

    return NextResponse.json(
      { ok: false, error: message },
      { status },
    );
  }
}
