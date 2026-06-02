import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import {
  removeUserPushSubscription,
  upsertUserPushSubscription,
  type WebPushSubscriptionInput,
} from "@/lib/server/web-push";

export const runtime = "nodejs";

async function readUserSession() {
  const cookieStore = await cookies();
  const session = parseMockSessionCookieValue(
    cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value ?? null,
  );

  if (
    session?.variant !== "user" ||
    session.authMode !== "live" ||
    !session.userId
  ) {
    return null;
  }

  return {
    userId: session.userId,
  };
}

export async function POST(request: Request) {
  try {
    const session = await readUserSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Sesi user tidak aktif." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      subscription?: WebPushSubscriptionInput;
      userAgent?: unknown;
    };

    const result = await upsertUserPushSubscription({
      userId: session.userId,
      subscription: body.subscription ?? {},
      userAgent: typeof body.userAgent === "string" ? body.userAgent : undefined,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan subscription notifikasi.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await readUserSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Sesi user tidak aktif." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      endpoint?: unknown;
      subscription?: WebPushSubscriptionInput;
    };

    const endpoint =
      (body.subscription && typeof body.subscription === "object"
        ? body.subscription.endpoint
        : undefined) ?? body.endpoint;

    const result = await removeUserPushSubscription({
      userId: session.userId,
      endpoint,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menghapus subscription notifikasi.",
      },
      { status: 400 },
    );
  }
}
