import { getPublicEnv, getServerEnv } from "@/lib/env";

type LegacyUserRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  asal_instansi?: string | null;
  nama_instansi?: string | null;
  nik?: string | null;
  provinsi?: string | null;
  kabupaten_kota?: string | null;
  photo_url?: string | null;
  auth_user_id?: string | null;
  email_verified?: boolean | null;
  phone_verified?: boolean | null;
  created_at?: string | null;
};

type PublicUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  asalInstansi: string;
  namaInstansi: string;
  nik: string;
  provinsi: string;
  kabupatenKota: string;
  photoUrl: string;
  authUserId: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  verificationStatus: "verified" | "unverified";
  createdAt: string;
};

export class UserProfileUpdateError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "UserProfileUpdateError";
    this.status = status;
  }
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function sanitizePhone(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    return digits;
  }
  if (digits.startsWith("0")) {
    return digits;
  }
  if (digits.startsWith("62")) {
    return `+${digits}`;
  }

  return digits;
}

function isValidPhone(value: string) {
  return /^(\+62|62|0)8[0-9]{7,13}$/.test(value.replace(/\s+/g, ""));
}

function getSupabaseServerConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    throw new UserProfileUpdateError("Konfigurasi Supabase server belum lengkap.", 500);
  }

  return {
    supabaseUrl: publicEnv.supabaseUrl,
    serviceRoleKey: serverEnv.serviceRoleKey,
  };
}

function buildRestUrl(path: string, params?: Record<string, string>) {
  const { supabaseUrl } = getSupabaseServerConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

async function fetchRestRows<T>(path: string, params?: Record<string, string>) {
  const { serviceRoleKey } = getSupabaseServerConfig();
  const response = await fetch(buildRestUrl(path, params), {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new UserProfileUpdateError(
      `Gagal membaca data pengguna: ${body || response.status}`,
      500,
    );
  }

  return (await response.json()) as T[];
}

async function patchUserRow(
  userId: string,
  payload: Partial<LegacyUserRow>,
): Promise<LegacyUserRow> {
  const { serviceRoleKey } = getSupabaseServerConfig();
  const response = await fetch(
    buildRestUrl("lkpp_users", {
      id: `eq.${userId}`,
      select: "*",
    }),
    {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  const rawBody = await response.text().catch(() => "");

  if (!response.ok) {
    throw new UserProfileUpdateError(
      rawBody || "Gagal memperbarui profil pengguna.",
      500,
    );
  }

  if (rawBody.trim()) {
    try {
      const rows = JSON.parse(rawBody) as LegacyUserRow[];
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0]!;
      }
    } catch {
      // Fall through to a fresh read below.
    }
  }

  // Some environments return 204 / empty body even when the patch succeeded.
  const latest = await getUserById(userId);
  if (latest) {
    return latest;
  }

  throw new UserProfileUpdateError("Gagal memperbarui profil pengguna.", 500);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? "");
}

function isMissingOptionalLkppUserProfileColumnError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  if (!message) {
    return false;
  }

  const candidates = [
    "asal_instansi",
    "nama_instansi",
    "nik",
    "provinsi",
    "kabupaten_kota",
  ];

  return candidates.some((column) =>
    message.includes(`'${column}'`) ||
    message.includes(`"${column}"`) ||
    message.includes(` ${column} `) ||
    message.includes(`.${column}`) ||
    message.includes(`column ${column}`) ||
    (message.includes(`column of 'lkpp_users'`) && message.includes(column)),
  );
}

function mapUser(row: LegacyUserRow): PublicUser {
  const emailVerified = Boolean(row.email_verified);
  const phoneVerified = Boolean(row.phone_verified);

  return {
    id: row.id,
    name: String(row.name || "").trim(),
    phone: String(row.phone || "").trim(),
    email: normalizeEmail(row.email),
    asalInstansi: String(row.asal_instansi || "").trim(),
    namaInstansi: String(row.nama_instansi || "").trim(),
    nik: String(row.nik || "").trim(),
    provinsi: String(row.provinsi || "").trim(),
    kabupatenKota: String(row.kabupaten_kota || "").trim(),
    photoUrl: String(row.photo_url || "").trim(),
    authUserId: String(row.auth_user_id || "").trim() || null,
    emailVerified,
    phoneVerified,
    verificationStatus: emailVerified ? "verified" : "unverified",
    createdAt: String(row.created_at || ""),
  };
}

async function getUserById(userId: string) {
  const rows = await fetchRestRows<LegacyUserRow>("lkpp_users", {
    select: "*",
    id: `eq.${userId}`,
    limit: "1",
  });

  return rows[0] ?? null;
}

export async function readUserProfileFromSession(userId: string) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    throw new UserProfileUpdateError("User ID tidak valid.", 400);
  }

  const user = await getUserById(normalizedUserId);
  if (!user) {
    throw new UserProfileUpdateError("Akun pengguna tidak ditemukan.", 404);
  }

  return {
    user: mapUser(user),
  };
}

async function findUsersByPhone(phone: string) {
  return fetchRestRows<LegacyUserRow>("lkpp_users", {
    select: "id",
    phone: `eq.${phone}`,
    limit: "2",
  });
}

async function findUsersByNik(nik: string) {
  return fetchRestRows<LegacyUserRow>("lkpp_users", {
    select: "id",
    nik: `eq.${nik}`,
    limit: "2",
  });
}

export async function updateUserProfileFromSession(args: {
  userId: string;
  name?: string;
  phone?: string;
  asalInstansi?: string;
  namaInstansi?: string;
  nik?: string;
  provinsi?: string;
  kabupatenKota?: string;
}) {
  const userId = String(args.userId || "").trim();
  if (!userId) {
    throw new UserProfileUpdateError("User ID tidak valid.", 400);
  }

  const existing = await getUserById(userId);
  if (!existing) {
    throw new UserProfileUpdateError("Akun pengguna tidak ditemukan.", 404);
  }

  const nextName =
    args.name != null ? String(args.name).trim() : String(existing.name || "").trim();
  const nextPhone =
    args.phone != null
      ? sanitizePhone(args.phone)
      : sanitizePhone(existing.phone || "");
  const nextAsalInstansi =
    args.asalInstansi != null
      ? String(args.asalInstansi).trim()
      : String(existing.asal_instansi || "").trim();
  const nextNamaInstansi =
    args.namaInstansi != null
      ? String(args.namaInstansi).trim()
      : String(existing.nama_instansi || "").trim();
  const nextNik =
    args.nik != null
      ? String(args.nik).replace(/\D/g, "").slice(0, 16)
      : String(existing.nik || "").replace(/\D/g, "");
  const nextProvinsi =
    args.provinsi != null
      ? String(args.provinsi).trim()
      : String(existing.provinsi || "").trim();
  const nextKabupatenKota =
    args.kabupatenKota != null
      ? String(args.kabupatenKota).trim()
      : String(existing.kabupaten_kota || "").trim();

  if (!nextName || nextName.length < 2) {
    throw new UserProfileUpdateError("Nama minimal 2 karakter.", 400);
  }
  if (!isValidPhone(nextPhone)) {
    throw new UserProfileUpdateError("Format nomor HP tidak valid.", 400);
  }
  if (!nextAsalInstansi) {
    throw new UserProfileUpdateError("Kategori instansi wajib diisi.", 400);
  }
  if (!nextNamaInstansi) {
    throw new UserProfileUpdateError("Nama instansi wajib diisi.", 400);
  }
  if (nextNik.length !== 16) {
    throw new UserProfileUpdateError("NIK wajib 16 digit.", 400);
  }
  if (!nextProvinsi) {
    throw new UserProfileUpdateError("Provinsi wajib diisi.", 400);
  }
  if (!nextKabupatenKota) {
    throw new UserProfileUpdateError("Kabupaten/kota wajib diisi.", 400);
  }

  if (nextPhone !== String(existing.phone || "").trim()) {
    const phoneConflicts = await findUsersByPhone(nextPhone);
    if (phoneConflicts.some((row) => row.id !== userId)) {
      throw new UserProfileUpdateError("Nomor HP sudah dipakai akun lain.", 409);
    }
  }

  if (nextNik !== String(existing.nik || "").replace(/\D/g, "")) {
    const nikConflicts = await findUsersByNik(nextNik);
    if (nikConflicts.some((row) => row.id !== userId)) {
      throw new UserProfileUpdateError("NIK sudah dipakai akun lain.", 409);
    }
  }

  const basePayload = {
    name: nextName,
    phone: nextPhone,
    phone_verified:
      nextPhone === String(existing.phone || "").trim()
        ? existing.phone_verified
        : false,
  } satisfies Partial<LegacyUserRow>;
  const optionalProfilePayload = {
    asal_instansi: nextAsalInstansi,
    nama_instansi: nextNamaInstansi,
    nik: nextNik,
    provinsi: nextProvinsi,
    kabupaten_kota: nextKabupatenKota,
  } satisfies Partial<LegacyUserRow>;

  let updated: LegacyUserRow;
  try {
    updated = await patchUserRow(userId, {
      ...basePayload,
      ...optionalProfilePayload,
    });
  } catch (error) {
    if (!isMissingOptionalLkppUserProfileColumnError(error)) {
      throw error;
    }

    // Older schemas may miss optional profile columns; read back the row and
    // fail explicitly below if the mandatory profile fields remain unsaved.
    updated = await patchUserRow(userId, basePayload);
  }

  const mappedUser = mapUser(updated);
  const requiredProfileSnapshot = {
    asalInstansi: nextAsalInstansi,
    namaInstansi: nextNamaInstansi,
    nik: nextNik,
    provinsi: nextProvinsi,
    kabupatenKota: nextKabupatenKota,
  } as const;
  const requiredProfileSaved =
    mappedUser.asalInstansi === requiredProfileSnapshot.asalInstansi &&
    mappedUser.namaInstansi === requiredProfileSnapshot.namaInstansi &&
    mappedUser.nik === requiredProfileSnapshot.nik &&
    mappedUser.provinsi === requiredProfileSnapshot.provinsi &&
    mappedUser.kabupatenKota === requiredProfileSnapshot.kabupatenKota;

  if (!requiredProfileSaved) {
    throw new UserProfileUpdateError(
      "Data profil wajib belum berhasil disimpan lengkap. Silakan coba lagi atau hubungi admin.",
      500,
    );
  }

  return {
    user: mappedUser,
  };
}
