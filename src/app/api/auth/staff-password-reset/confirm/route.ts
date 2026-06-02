import { NextResponse } from "next/server";

import { mapLegacyStaffRoleToInternalRole } from "@/lib/internal-role-policy";
import { isStrongPassword } from "@/lib/password-policy";
import {
  clearStaffResetAccessState,
  fetchLegacyStaffById,
  getStaffResetAccessState,
  patchLegacyStaffPassword,
  verifyStaffResetSessionToken,
} from "@/lib/server/staff-reset-access";
import { listStaffAssignedCounters } from "@/lib/server/unit-counter-storage";

function normalizeLoginName(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

async function mapStaff(row: Record<string, unknown>) {
  const unitId = String(row.unit_id ?? row.unor_id ?? row.unorId ?? "")
    .trim()
    .toUpperCase();
  const role = String(row.role ?? "resepsionis").trim();
  const internalRole = mapLegacyStaffRoleToInternalRole(role, {
    unitId,
    fallbackRole: "resepsionis",
  });
  let assignedCounters: Awaited<ReturnType<typeof listStaffAssignedCounters>> = [];
  if (internalRole === "unit-organisasi" && row.id) {
    try {
      assignedCounters = await listStaffAssignedCounters(String(row.id));
    } catch {
      assignedCounters = [];
    }
  }
  const preferredCounter =
    assignedCounters.find((entry) => entry.active) ?? assignedCounters[0] ?? null;

  return {
    id: row.id,
    name: row.name ?? "",
    loginName: row.login_name ?? "",
    photoUrl: row.photo_url ?? "",
    pin: row.pin_code ?? "",
    role,
    active: row.is_active !== false,
    assignedServices: [],
    unorId: unitId,
    unitId,
    assignedCounters,
    activeCounterId: preferredCounter?.id ?? undefined,
    activeCounterNumber: preferredCounter?.counterNumber ?? undefined,
    activeCounterLabel: preferredCounter?.label ?? undefined,
    onBreak: false,
    mustChangePin: false,
    schedule: [],
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const resetToken = String(body.resetToken || "");
    const newPassword = String(body.newPassword || "").trim();
    const verification = verifyStaffResetSessionToken(resetToken);

    if (!isStrongPassword(newPassword)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Password baru minimal 8 karakter serta mengandung huruf besar, huruf kecil, dan karakter khusus.",
        },
        { status: 400 },
      );
    }

    const staff = await fetchLegacyStaffById(verification.staffId);
    if (!staff) {
      return NextResponse.json(
        { ok: false, error: "Akun petugas tidak ditemukan." },
        { status: 404 },
      );
    }

    if (staff.is_active === false) {
      return NextResponse.json(
        { ok: false, error: "Akun petugas sedang dinonaktifkan." },
        { status: 403 },
      );
    }

    if (
      normalizeLoginName(staff.login_name) !== verification.loginName
    ) {
      return NextResponse.json(
        { ok: false, error: "Sesi reset akses staff sudah tidak berlaku." },
        { status: 409 },
      );
    }

    const resetStillRequired = await getStaffResetAccessState(verification.staffId);
    if (!resetStillRequired) {
      return NextResponse.json(
        {
          ok: false,
          error: "Permintaan reset akses ini sudah tidak aktif. Coba login ulang.",
        },
        { status: 409 },
      );
    }

    if (String(staff.pin_code || "").trim() === newPassword.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Password baru harus berbeda dari password sebelumnya.",
        },
        { status: 409 },
      );
    }

    const updatedStaff = await patchLegacyStaffPassword(verification.staffId, newPassword);
    await clearStaffResetAccessState(verification.staffId);

    return NextResponse.json({
      ok: true,
      staff: await mapStaff(updatedStaff ?? {}),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menyimpan password baru petugas.";
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
