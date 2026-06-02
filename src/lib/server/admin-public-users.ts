import crypto from "node:crypto";

import { getPublicEnv, getServerEnv } from "@/lib/env";
import { isStrongPassword } from "@/lib/password-policy";

type LegacyUserRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  pin_code?: string | null;
  asal_instansi?: string | null;
  nama_instansi?: string | null;
  nik?: string | null;
  provinsi?: string | null;
  kabupaten_kota?: string | null;
  photo_url?: string | null;
  auth_user_id?: string | null;
  email_verified?: boolean | null;
  phone_verified?: boolean | null;
  verified_at?: string | null;
  created_at?: string | null;
};

type AuthUserRecord = {
  id?: string | null;
  email?: string | null;
  phone?: string | null;
  email_confirmed_at?: string | null;
  phone_confirmed_at?: string | null;
};

type AuthSyncResult = {
  authUserId: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
};

export type AdminPublicUserRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
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
  profileComplete: boolean;
  readyForLogin: boolean;
  createdAt: string;
};

export type AdminPublicUserUpsertInput = {
  name: string;
  email: string;
  phone: string;
  password?: string;
  asalInstansi?: string;
  namaInstansi?: string;
  nik?: string;
  provinsi?: string;
  kabupatenKota?: string;
};

export class AdminPublicUsersError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdminPublicUsersError";
    this.status = status;
  }
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function sanitizePhone(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizePhoneE164(value: unknown) {
  const digits = sanitizePhone(value);
  if (!digits) {
    return "";
  }

  if (digits.startsWith("0")) {
    return `+62${digits.slice(1)}`;
  }

  if (digits.startsWith("62")) {
    return `+${digits}`;
  }

  if (digits.startsWith("8")) {
    return `+62${digits}`;
  }

  return `+${digits}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  return /^\d{10,16}$/.test(value);
}

function getSupabaseConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey || !serverEnv.serviceRoleKey) {
    throw new AdminPublicUsersError("Konfigurasi Supabase server belum lengkap.", 500);
  }

  return {
    supabaseUrl: publicEnv.supabaseUrl,
    anonKey: publicEnv.supabaseAnonKey,
    serviceRoleKey: serverEnv.serviceRoleKey,
  };
}

function buildRestUrl(path: string, params?: Record<string, string>) {
  const { supabaseUrl } = getSupabaseConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

function buildRestHeaders() {
  const { serviceRoleKey } = getSupabaseConfig();
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
  };
}

async function fetchRestRows<T>(path: string, params?: Record<string, string>) {
  const response = await fetch(buildRestUrl(path, params), {
    method: "GET",
    headers: buildRestHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AdminPublicUsersError(
      `Gagal membaca data pengguna publik: ${body || response.status}`,
      500,
    );
  }

  return (await response.json()) as T[];
}

async function insertUserRow(payload: LegacyUserRow) {
  const { serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(buildRestUrl("lkpp_users", { select: "*" }), {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const rows = (await response.json().catch(() => [])) as LegacyUserRow[];
  if (!response.ok || !rows.length) {
    const message =
      typeof rows === "object" ? JSON.stringify(rows) : String(response.status);
    throw new AdminPublicUsersError(
      `Gagal menyimpan akun pengguna: ${message}`,
      500,
    );
  }

  return rows[0]!;
}

async function patchUserRow(userId: string, payload: Partial<LegacyUserRow>) {
  const { serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(
    buildRestUrl("lkpp_users", { id: `eq.${userId}`, select: "*" }),
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

  const rows = (await response.json().catch(() => [])) as LegacyUserRow[];
  if (!response.ok || !rows.length) {
    throw new AdminPublicUsersError("Gagal memperbarui akun pengguna.", 500);
  }

  return rows[0]!;
}

async function deleteUserRow(userId: string) {
  const { serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(buildRestUrl("lkpp_users", { id: `eq.${userId}` }), {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AdminPublicUsersError(body || "Gagal menghapus akun pengguna.", 500);
  }
}

async function getUserById(userId: string) {
  const rows = await fetchRestRows<LegacyUserRow>("lkpp_users", {
    select: "*",
    id: `eq.${userId}`,
    limit: "1",
  });

  return rows[0] ?? null;
}

async function findUsersByEmail(email: string) {
  return fetchRestRows<LegacyUserRow>("lkpp_users", {
    select: "*",
    email: `eq.${email}`,
    limit: "5",
  });
}

async function findUsersByPhone(phone: string) {
  return fetchRestRows<LegacyUserRow>("lkpp_users", {
    select: "*",
    phone: `eq.${phone}`,
    limit: "5",
  });
}

async function findUsersByNik(nik: string) {
  if (!nik) {
    return [] as LegacyUserRow[];
  }

  return fetchRestRows<LegacyUserRow>("lkpp_users", {
    select: "*",
    nik: `eq.${nik}`,
    limit: "5",
  });
}

async function authAdminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/admin${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const rawBody = await response.text().catch(() => "");
  let payload:
    | (T & {
        msg?: string;
        error?: string;
        message?: string;
      })
    | Record<string, unknown> = {};

  if (rawBody.trim()) {
    try {
      payload = JSON.parse(rawBody) as T & {
        msg?: string;
        error?: string;
        message?: string;
      };
    } catch {
      payload = { message: rawBody };
    }
  }

  if (!response.ok) {
    throw new AdminPublicUsersError(
      String(
        payload.message ||
          payload.msg ||
          payload.error ||
          rawBody ||
          "Auth admin request gagal",
      ),
      500,
    );
  }

  return payload as T;
}

function extractAuthUserRecord(
  payload: { user?: AuthUserRecord } & Record<string, unknown>,
) {
  if (payload.user && typeof payload.user === "object") {
    return payload.user as AuthUserRecord;
  }

  if (
    typeof payload.id === "string" ||
    typeof payload.email === "string" ||
    typeof payload.phone === "string"
  ) {
    return payload as unknown as AuthUserRecord;
  }

  return null;
}

function extractAuthVerificationState(authUser: AuthUserRecord | null | undefined) {
  return {
    emailVerified: Boolean(authUser?.email_confirmed_at),
    phoneVerified: Boolean(authUser?.phone_confirmed_at),
  };
}

async function listAuthUsers(page: number, perPage: number) {
  return authAdminRequest<{ users?: AuthUserRecord[] }>(
    `/users?page=${page}&per_page=${perPage}`,
  );
}

async function findAuthUserByEmailOrPhone(email: string, phoneE164: string) {
  const perPage = 200;

  for (let page = 1; page <= 50; page += 1) {
    const response = await listAuthUsers(page, perPage);
    const users = response.users ?? [];
    const found = users.find((user) => {
      const matchesEmail = normalizeEmail(user.email) === email;
      const matchesPhone = Boolean(phoneE164) && String(user.phone || "").trim() === phoneE164;
      return matchesEmail || matchesPhone;
    });

    if (found) {
      return found;
    }

    if (users.length < perPage) {
      break;
    }
  }

  return null;
}

function createRandomStrongPassword() {
  return `Lkpp!${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}A`;
}

async function createAuthUser(payload: {
  legacyUserId: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  emailConfirmed: boolean;
}) {
  const phoneE164 = normalizePhoneE164(payload.phone);
  const preferredPassword =
    payload.password && String(payload.password).trim()
      ? String(payload.password).trim()
      : createRandomStrongPassword();

  const baseBody: Record<string, unknown> = {
    email: payload.email,
    email_confirm: payload.emailConfirmed,
    password: preferredPassword,
    user_metadata: {
      name: payload.name,
      phone: payload.phone,
    },
    app_metadata: {
      source: "lkpp",
      lkppUserId: payload.legacyUserId,
    },
  };

  if (phoneE164) {
    baseBody.phone = phoneE164;
    baseBody.phone_confirm = true;
  }

  try {
    const response = await authAdminRequest<{ user?: AuthUserRecord } & Record<string, unknown>>(
      "/users",
      {
        method: "POST",
        body: JSON.stringify(baseBody),
      },
    );
    return extractAuthUserRecord(response);
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error).toLowerCase();
    if (phoneE164 && message.includes("phone")) {
      const retryBody = { ...baseBody };
      delete retryBody.phone;
      delete retryBody.phone_confirm;
      const retry = await authAdminRequest<{ user?: AuthUserRecord } & Record<string, unknown>>(
        "/users",
        {
          method: "POST",
          body: JSON.stringify(retryBody),
        },
      );
      return extractAuthUserRecord(retry);
    }

    if (message.includes("password")) {
      const retryBody = { ...baseBody, password: createRandomStrongPassword() };
      const retry = await authAdminRequest<{ user?: AuthUserRecord } & Record<string, unknown>>(
        "/users",
        {
          method: "POST",
          body: JSON.stringify(retryBody),
        },
      );
      return extractAuthUserRecord(retry);
    }

    throw error;
  }
}

async function updateAuthUser(
  authUserId: string,
  payload: {
    name: string;
    phone: string;
    email?: string;
    password?: string;
    emailConfirmed: boolean;
  },
) {
  const phoneE164 = normalizePhoneE164(payload.phone);
  const baseBody: Record<string, unknown> = {
    email_confirm: payload.emailConfirmed,
    user_metadata: {
      name: payload.name,
      phone: payload.phone,
    },
  };

  if (payload.email) {
    baseBody.email = payload.email;
  }

  if (payload.password) {
    baseBody.password = payload.password;
  }

  if (phoneE164) {
    baseBody.phone = phoneE164;
    baseBody.phone_confirm = true;
  }

  try {
    const response = await authAdminRequest<{ user?: AuthUserRecord } & Record<string, unknown>>(
      `/users/${authUserId}`,
      {
        method: "PUT",
        body: JSON.stringify(baseBody),
      },
    );
    return extractAuthUserRecord(response);
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error).toLowerCase();
    if (phoneE164 && message.includes("phone")) {
      const retryBody = { ...baseBody };
      delete retryBody.phone;
      delete retryBody.phone_confirm;
      const retry = await authAdminRequest<{ user?: AuthUserRecord } & Record<string, unknown>>(
        `/users/${authUserId}`,
        {
          method: "PUT",
          body: JSON.stringify(retryBody),
        },
      );
      return extractAuthUserRecord(retry);
    }

    if (payload.password && message.includes("password")) {
      const retryBody = { ...baseBody, password: createRandomStrongPassword() };
      const retry = await authAdminRequest<{ user?: AuthUserRecord } & Record<string, unknown>>(
        `/users/${authUserId}`,
        {
          method: "PUT",
          body: JSON.stringify(retryBody),
        },
      );
      return extractAuthUserRecord(retry);
    }

    throw error;
  }
}

async function deleteAuthUser(authUserId: string) {
  await authAdminRequest<Record<string, unknown>>(`/users/${authUserId}`, {
    method: "DELETE",
  });
}

async function syncAuthUser(args: {
  legacyUserId: string;
  existingAuthUserId?: string | null;
  name: string;
  email: string;
  phone: string;
  password?: string;
  emailConfirmed: boolean;
}): Promise<AuthSyncResult> {
  const email = normalizeEmail(args.email);
  const phoneE164 = normalizePhoneE164(args.phone);
  let authUser: AuthUserRecord | null | undefined = null;
  let fallbackAuthUserId = String(args.existingAuthUserId || "").trim() || null;

  if (fallbackAuthUserId) {
    try {
      authUser = await updateAuthUser(fallbackAuthUserId, {
        name: args.name,
        phone: args.phone,
        email,
        password: args.password,
        emailConfirmed: args.emailConfirmed,
      });
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error).toLowerCase();
      if (!message.includes("not found") && !message.includes("user not found")) {
        throw error;
      }
      authUser = null;
      fallbackAuthUserId = null;
    }
  }

  if (!authUser) {
    const existingAuth = await findAuthUserByEmailOrPhone(email, phoneE164);
    fallbackAuthUserId = existingAuth?.id ?? fallbackAuthUserId;
    authUser =
      existingAuth && existingAuth.id
        ? await updateAuthUser(existingAuth.id, {
            name: args.name,
            phone: args.phone,
            email,
            password: args.password,
            emailConfirmed: args.emailConfirmed,
          })
        : await createAuthUser({
            legacyUserId: args.legacyUserId,
            name: args.name,
            phone: args.phone,
            email,
            password: args.password,
            emailConfirmed: args.emailConfirmed,
          });
  }

  const verification = extractAuthVerificationState(authUser);
  return {
    authUserId: authUser?.id ?? fallbackAuthUserId,
    emailVerified: verification.emailVerified || args.emailConfirmed,
    phoneVerified: verification.phoneVerified,
  };
}

function isProfileComplete(args: {
  name: string;
  email: string;
  phone: string;
  asalInstansi: string;
  namaInstansi: string;
  nik: string;
  provinsi: string;
  kabupatenKota: string;
}) {
  return Boolean(
    args.name.trim() &&
      args.email.trim() &&
      args.phone.trim() &&
      args.asalInstansi.trim() &&
      args.namaInstansi.trim() &&
      args.provinsi.trim() &&
      args.kabupatenKota.trim() &&
      args.nik.replace(/\D/g, "").length === 16,
  );
}

function mapUser(row: LegacyUserRow): AdminPublicUserRecord {
  const name = String(row.name || "").trim();
  const email = normalizeEmail(row.email);
  const phone = String(row.phone || "").trim();
  const asalInstansi = String(row.asal_instansi || "").trim();
  const namaInstansi = String(row.nama_instansi || "").trim();
  const nik = String(row.nik || "").trim();
  const provinsi = String(row.provinsi || "").trim();
  const kabupatenKota = String(row.kabupaten_kota || "").trim();
  const photoUrl = String(row.photo_url || "").trim();
  const authUserId = String(row.auth_user_id || "").trim() || null;
  const emailVerified = Boolean(row.email_verified);
  const phoneVerified = Boolean(row.phone_verified);
  const readyForLogin = Boolean(String(row.pin_code || "").trim()) && emailVerified && Boolean(authUserId);

  return {
    id: row.id,
    name,
    email,
    phone,
    asalInstansi,
    namaInstansi,
    nik,
    provinsi,
    kabupatenKota,
    photoUrl,
    authUserId,
    emailVerified,
    phoneVerified,
    verificationStatus: emailVerified ? "verified" : "unverified",
    profileComplete: isProfileComplete({
      name,
      email,
      phone,
      asalInstansi,
      namaInstansi,
      nik,
      provinsi,
      kabupatenKota,
    }),
    readyForLogin,
    createdAt: String(row.created_at || ""),
  };
}

function normalizeUpsertInput(
  input: AdminPublicUserUpsertInput,
  options: {
    requirePassword: boolean;
  },
) {
  const name = String(input.name || "").trim();
  const email = normalizeEmail(input.email);
  const phone = sanitizePhone(input.phone);
  const password = String(input.password || "").trim();
  const nik = String(input.nik || "").replace(/\D/g, "").slice(0, 16);
  const asalInstansi = String(input.asalInstansi || "").trim();
  const namaInstansi = String(input.namaInstansi || "").trim();
  const provinsi = String(input.provinsi || "").trim();
  const kabupatenKota = String(input.kabupatenKota || "").trim();

  if (name.length < 2) {
    throw new AdminPublicUsersError("Nama pengguna minimal 2 karakter.", 400);
  }
  if (!isValidEmail(email)) {
    throw new AdminPublicUsersError("Format email pengguna belum valid.", 400);
  }
  if (!isValidPhone(phone)) {
    throw new AdminPublicUsersError("Format nomor WhatsApp belum valid.", 400);
  }
  if (options.requirePassword && !isStrongPassword(password)) {
    throw new AdminPublicUsersError(
      "Password minimal 8 karakter serta mengandung huruf besar, huruf kecil, dan karakter khusus.",
      400,
    );
  }
  if (password && !isStrongPassword(password)) {
    throw new AdminPublicUsersError(
      "Password minimal 8 karakter serta mengandung huruf besar, huruf kecil, dan karakter khusus.",
      400,
    );
  }
  if (nik && nik.length !== 16) {
    throw new AdminPublicUsersError("NIK harus 16 digit angka.", 400);
  }

  return {
    name,
    email,
    phone,
    password,
    nik,
    asalInstansi,
    namaInstansi,
    provinsi,
    kabupatenKota,
  };
}

export async function listAdminPublicUsers() {
  const rows = await fetchRestRows<LegacyUserRow>("lkpp_users", {
    select: "*",
    order: "created_at.desc",
  });

  return {
    items: rows.map(mapUser),
    generatedAt: new Date().toISOString(),
  };
}

export async function createAdminPublicUser(input: AdminPublicUserUpsertInput) {
  const normalized = normalizeUpsertInput(input, { requirePassword: true });
  const [existingByEmail, existingByPhone, existingByNik] = await Promise.all([
    findUsersByEmail(normalized.email),
    findUsersByPhone(normalized.phone),
    findUsersByNik(normalized.nik),
  ]);

  if (existingByEmail.length > 0) {
    throw new AdminPublicUsersError("Email sudah dipakai akun pengguna lain.", 409);
  }
  if (existingByPhone.length > 0) {
    throw new AdminPublicUsersError("Nomor WhatsApp sudah dipakai akun pengguna lain.", 409);
  }
  if (normalized.nik && existingByNik.length > 0) {
    throw new AdminPublicUsersError("NIK sudah dipakai akun pengguna lain.", 409);
  }

  const nowIso = new Date().toISOString();
  const inserted = await insertUserRow({
    id: `u${Date.now()}${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`,
    name: normalized.name,
    email: normalized.email,
    phone: normalized.phone,
    pin_code: normalized.password,
    asal_instansi: normalized.asalInstansi,
    nama_instansi: normalized.namaInstansi,
    nik: normalized.nik,
    provinsi: normalized.provinsi,
    kabupaten_kota: normalized.kabupatenKota,
    photo_url: null,
    auth_user_id: null,
    email_verified: true,
    phone_verified: false,
    verified_at: nowIso,
    created_at: nowIso,
  });

  try {
    const authSync = await syncAuthUser({
      legacyUserId: inserted.id,
      name: normalized.name,
      email: normalized.email,
      phone: normalized.phone,
      password: normalized.password,
      emailConfirmed: true,
    });

    const updated = await patchUserRow(inserted.id, {
      auth_user_id: authSync.authUserId,
      email_verified: authSync.emailVerified,
      phone_verified: authSync.phoneVerified,
      verified_at: authSync.emailVerified ? nowIso : inserted.verified_at,
    });

    return {
      user: mapUser(updated),
    };
  } catch (error) {
    await deleteUserRow(inserted.id).catch(() => undefined);
    throw error;
  }
}

export async function updateAdminPublicUser(userId: string, input: AdminPublicUserUpsertInput) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    throw new AdminPublicUsersError("User ID tidak valid.", 400);
  }

  const existing = await getUserById(normalizedUserId);
  if (!existing) {
    throw new AdminPublicUsersError("Akun pengguna tidak ditemukan.", 404);
  }

  const normalized = normalizeUpsertInput(input, { requirePassword: false });
  const [existingByEmail, existingByPhone, existingByNik] = await Promise.all([
    findUsersByEmail(normalized.email),
    findUsersByPhone(normalized.phone),
    findUsersByNik(normalized.nik),
  ]);

  if (existingByEmail.some((entry) => entry.id !== normalizedUserId)) {
    throw new AdminPublicUsersError("Email sudah dipakai akun pengguna lain.", 409);
  }
  if (existingByPhone.some((entry) => entry.id !== normalizedUserId)) {
    throw new AdminPublicUsersError("Nomor WhatsApp sudah dipakai akun pengguna lain.", 409);
  }
  if (normalized.nik && existingByNik.some((entry) => entry.id !== normalizedUserId)) {
    throw new AdminPublicUsersError("NIK sudah dipakai akun pengguna lain.", 409);
  }

  const authSync = await syncAuthUser({
    legacyUserId: existing.id,
    existingAuthUserId: String(existing.auth_user_id || "").trim() || null,
    name: normalized.name,
    email: normalized.email,
    phone: normalized.phone,
    password: normalized.password || undefined,
    emailConfirmed: Boolean(existing.email_verified),
  });

  const updated = await patchUserRow(existing.id, {
    name: normalized.name,
    email: normalized.email,
    phone: normalized.phone,
    pin_code: normalized.password || existing.pin_code || "",
    asal_instansi: normalized.asalInstansi,
    nama_instansi: normalized.namaInstansi,
    nik: normalized.nik,
    provinsi: normalized.provinsi,
    kabupaten_kota: normalized.kabupatenKota,
    auth_user_id: authSync.authUserId,
    email_verified: authSync.emailVerified || Boolean(existing.email_verified),
    phone_verified: authSync.phoneVerified || Boolean(existing.phone_verified),
    verified_at:
      authSync.emailVerified || existing.email_verified
        ? String(existing.verified_at || new Date().toISOString())
        : existing.verified_at,
  });

  return {
    user: mapUser(updated),
  };
}

export async function deleteAdminPublicUser(userId: string) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    throw new AdminPublicUsersError("User ID tidak valid.", 400);
  }

  const existing = await getUserById(normalizedUserId);
  if (!existing) {
    throw new AdminPublicUsersError("Akun pengguna tidak ditemukan.", 404);
  }

  const authUserId = String(existing.auth_user_id || "").trim();
  if (authUserId) {
    try {
      await deleteAuthUser(authUserId);
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error).toLowerCase();
      if (!message.includes("not found") && !message.includes("user not found")) {
        throw error;
      }
    }
  }

  await deleteUserRow(normalizedUserId);

  return {
    user: mapUser(existing),
  };
}
