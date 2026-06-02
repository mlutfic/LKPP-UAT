import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  AdminPublicUsersError,
  deleteAdminPublicUser,
  updateAdminPublicUser,
} from "@/lib/server/admin-public-users";
import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";

type RouteParams = {
  userId: string;
};

async function readAuthorizedSession() {
  const cookieStore = await cookies();
  const session = parseMockSessionCookieValue(
    cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value,
  );

  const normalizedRole = String(session?.role || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

  if (!session?.staffId || normalizedRole !== "humas-admin") {
    throw new AdminPublicUsersError("Akses ditolak.", 403);
  }

  return session;
}

export async function PUT(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  try {
    await readAuthorizedSession();
    const { userId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await updateAdminPublicUser(userId, {
      name: typeof body.name === "string" ? body.name : "",
      email: typeof body.email === "string" ? body.email : "",
      phone: typeof body.phone === "string" ? body.phone : "",
      password: typeof body.password === "string" ? body.password : "",
      asalInstansi: typeof body.asalInstansi === "string" ? body.asalInstansi : "",
      namaInstansi: typeof body.namaInstansi === "string" ? body.namaInstansi : "",
      nik: typeof body.nik === "string" ? body.nik : "",
      provinsi: typeof body.provinsi === "string" ? body.provinsi : "",
      kabupatenKota: typeof body.kabupatenKota === "string" ? body.kabupatenKota : "",
    });

    return NextResponse.json({
      ok: true,
      user: result.user,
    });
  } catch (error) {
    const status =
      error instanceof AdminPublicUsersError ? error.status : 500;

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal memperbarui pengguna umum.",
      },
      { status },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<RouteParams> },
) {
  try {
    await readAuthorizedSession();
    const { userId } = await context.params;
    const result = await deleteAdminPublicUser(userId);

    return NextResponse.json({
      ok: true,
      user: result.user,
    });
  } catch (error) {
    const status =
      error instanceof AdminPublicUsersError ? error.status : 500;

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menghapus pengguna umum.",
      },
      { status },
    );
  }
}
