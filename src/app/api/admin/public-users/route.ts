import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createAdminPublicUser,
  AdminPublicUsersError,
  listAdminPublicUsers,
} from "@/lib/server/admin-public-users";
import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";

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

export async function GET() {
  try {
    await readAuthorizedSession();
    const result = await listAdminPublicUsers();

    return NextResponse.json({
      ok: true,
      items: result.items,
      generatedAt: result.generatedAt,
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
            : "Gagal memuat data pengguna umum.",
      },
      { status },
    );
  }
}

export async function POST(request: Request) {
  try {
    await readAuthorizedSession();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await createAdminPublicUser({
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

    return NextResponse.json(
      {
        ok: true,
        user: result.user,
      },
      { status: 201 },
    );
  } catch (error) {
    const status =
      error instanceof AdminPublicUsersError ? error.status : 500;

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menambahkan pengguna umum.",
      },
      { status },
    );
  }
}
