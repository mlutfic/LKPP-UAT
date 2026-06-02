import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import {
  AdminHelpFaqError,
  createAdminHelpFaq,
  deleteAdminHelpFaq,
  listAdminHelpFaqs,
  listPublicHelpFaqs,
  updateAdminHelpFaq,
} from "@/lib/server/admin-help-faq";

async function readHumasAdminSession() {
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

function toErrorResponse(error: unknown, fallbackMessage: string) {
  const status = error instanceof AdminHelpFaqError ? error.status : 500;
  return NextResponse.json(
    {
      ok: false,
      error: error instanceof Error ? error.message : fallbackMessage,
    },
    { status },
  );
}

export async function getAdminHelpFaqListResponse(request: Request) {
  try {
    const session = await readHumasAdminSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Akses FAQ admin ditolak." },
        { status: 403 },
      );
    }

    const result = await listAdminHelpFaqs(session.staffId, request);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "Gagal membaca FAQ admin.");
  }
}

export async function getPublicHelpFaqListResponse(request: Request) {
  try {
    const result = await listPublicHelpFaqs(request);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "Gagal membaca FAQ publik.");
  }
}

export async function createAdminHelpFaqResponse(request: Request) {
  try {
    const session = await readHumasAdminSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Akses perubahan FAQ ditolak." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await createAdminHelpFaq({
      staffId: session.staffId,
      request,
      payload: body,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "Gagal menambah FAQ.");
  }
}

export async function updateAdminHelpFaqResponse(
  request: Request,
  faqId: string,
) {
  try {
    const session = await readHumasAdminSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Akses perubahan FAQ ditolak." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await updateAdminHelpFaq({
      staffId: session.staffId,
      faqId,
      request,
      payload: body,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "Gagal memperbarui FAQ.");
  }
}

export async function deleteAdminHelpFaqResponse(
  request: Request,
  faqId: string,
) {
  try {
    const session = await readHumasAdminSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Akses hapus FAQ ditolak." },
        { status: 403 },
      );
    }

    const result = await deleteAdminHelpFaq({
      staffId: session.staffId,
      faqId,
      request,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "Gagal menghapus FAQ.");
  }
}
