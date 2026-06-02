import crypto from "node:crypto";

import nodemailer from "nodemailer";

import { getPublicEnv, getServerEnv } from "@/lib/env";

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
  auth_user_id?: string | null;
  email_verified?: boolean | null;
  phone_verified?: boolean | null;
  verified_at?: string | null;
  photo_url?: string | null;
  created_at?: string | null;
};

type UserEmailChangeTokenPayload = {
  userId: string;
  currentEmail: string;
  newEmail: string;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
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
  pin: string;
  createdAt: string;
};

const EMAIL_CHANGE_TOKEN_TTL_SEC = 30 * 60;

export class UserEmailChangeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "UserEmailChangeError";
    this.status = status;
  }
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function maskEmail(value: string) {
  const email = normalizeEmail(value);
  const [localPart, domain = ""] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart.slice(0, 1)}***@${domain}`;
  }

  return `${localPart.slice(0, 2)}${"*".repeat(Math.max(localPart.length - 2, 3))}@${domain}`;
}

function getSupabaseServerConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey || !serverEnv.serviceRoleKey) {
    throw new UserEmailChangeError("Konfigurasi Supabase server belum lengkap.", 500);
  }

  return {
    supabaseUrl: publicEnv.supabaseUrl,
    anonKey: publicEnv.supabaseAnonKey,
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
    throw new UserEmailChangeError(
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

  const rows = (await response.json().catch(() => [])) as LegacyUserRow[];
  if (!response.ok || !Array.isArray(rows) || rows.length === 0) {
    throw new UserEmailChangeError("Gagal memperbarui email pengguna.", 500);
  }

  return rows[0]!;
}

async function verifySupabaseAuthPassword(email: string, password: string) {
  const { supabaseUrl, anonKey } = getSupabaseServerConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (response.ok) {
    return true;
  }

  return false;
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
    pin: String(row.pin_code || ""),
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

async function findUsersByEmail(email: string) {
  return fetchRestRows<LegacyUserRow>("lkpp_users", {
    select: "*",
    email: `eq.${email}`,
    limit: "2",
  });
}

function getEmailChangeSecret() {
  const serverEnv = getServerEnv();
  const secret = serverEnv.emailChangeSecret || serverEnv.serviceRoleKey;
  if (!secret) {
    throw new UserEmailChangeError("Secret verifikasi email perubahan alamat belum tersedia.", 500);
  }
  return secret;
}

function signTokenPayload(payload: UserEmailChangeTokenPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getEmailChangeSecret())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function verifyTokenSignature(token: string): UserEmailChangeTokenPayload {
  const [encodedPayload, signature] = String(token || "").trim().split(".");
  if (!encodedPayload || !signature) {
    throw new UserEmailChangeError("Tautan verifikasi perubahan email tidak valid.", 400);
  }

  const expectedSignature = crypto
    .createHmac("sha256", getEmailChangeSecret())
    .update(encodedPayload)
    .digest("base64url");

  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSignature);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    throw new UserEmailChangeError("Tautan verifikasi perubahan email tidak valid.", 400);
  }

  let payload: UserEmailChangeTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as UserEmailChangeTokenPayload;
  } catch {
    throw new UserEmailChangeError("Tautan verifikasi perubahan email tidak dapat dibaca.", 400);
  }

  if (
    !payload.userId ||
    !isValidEmail(payload.currentEmail) ||
    !isValidEmail(payload.newEmail) ||
    !payload.issuedAt ||
    !payload.expiresAt ||
    !payload.nonce
  ) {
    throw new UserEmailChangeError("Isi tautan verifikasi perubahan email tidak lengkap.", 400);
  }

  if (new Date(payload.expiresAt).getTime() <= Date.now()) {
    throw new UserEmailChangeError("Tautan verifikasi perubahan email sudah kedaluwarsa.", 410);
  }

  return payload;
}

function buildEmailChangeMessage(args: {
  userName: string;
  currentEmail: string;
  newEmail: string;
  verificationLink: string;
}) {
  const expiresInMinutes = Math.trunc(EMAIL_CHANGE_TOKEN_TTL_SEC / 60);
  const text = [
    `Halo ${args.userName || "Pengguna LKPP"},`,
    "",
    "Kami menerima permintaan perubahan email akun Antrean LKPP.",
    `Email saat ini: ${args.currentEmail}`,
    `Email baru: ${args.newEmail}`,
    "",
    `Klik tautan berikut untuk menyetujui perubahan email dalam ${expiresInMinutes} menit:`,
    args.verificationLink,
    "",
    "Jika Anda tidak merasa meminta perubahan ini, abaikan email ini dan tetap gunakan email lama Anda.",
    "",
    "Salam,",
    "Portal Antrean LKPP",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <p>Halo <strong>${args.userName || "Pengguna LKPP"}</strong>,</p>
      <p>Kami menerima permintaan perubahan email akun Antrean LKPP.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Email saat ini</td><td><strong>${args.currentEmail}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Email baru</td><td><strong>${args.newEmail}</strong></td></tr>
      </table>
      <p>Silakan klik tombol berikut untuk menyetujui perubahan email. Tautan berlaku selama ${expiresInMinutes} menit.</p>
      <p style="margin:24px 0">
        <a href="${args.verificationLink}" style="display:inline-block;background:#b3261e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">
          Konfirmasi Perubahan Email
        </a>
      </p>
      <p>Jika tombol tidak terbuka, gunakan tautan berikut:</p>
      <p><a href="${args.verificationLink}">${args.verificationLink}</a></p>
      <p>Jika Anda tidak merasa meminta perubahan ini, abaikan email ini dan tetap gunakan email lama Anda.</p>
      <p>Salam,<br />Portal Antrean LKPP</p>
    </div>
  `;

  return { text, html };
}

async function sendEmailChangeVerificationEmail(args: {
  recipientEmail: string;
  recipientName: string;
  currentEmail: string;
  newEmail: string;
  verificationLink: string;
}) {
  const serverEnv = getServerEnv();
  if (
    !serverEnv.brevoSmtpHost ||
    !serverEnv.brevoSmtpPort ||
    !serverEnv.brevoSmtpUser ||
    !serverEnv.brevoSmtpPass ||
    !serverEnv.smtpFromEmail
  ) {
    throw new UserEmailChangeError("Konfigurasi email verifikasi belum lengkap.", 500);
  }

  const transporter = nodemailer.createTransport({
    host: serverEnv.brevoSmtpHost,
    port: Number(serverEnv.brevoSmtpPort),
    secure: Number(serverEnv.brevoSmtpPort) === 465,
    auth: {
      user: serverEnv.brevoSmtpUser,
      pass: serverEnv.brevoSmtpPass,
    },
  });

  const { recipientEmail, recipientName, ...contentArgs } = args;
  const message = buildEmailChangeMessage({
    userName: recipientName,
    ...contentArgs,
  });
  await transporter.sendMail({
    from: `${serverEnv.smtpFromName} <${serverEnv.smtpFromEmail}>`,
    to: recipientEmail,
    subject: "Konfirmasi Perubahan Email Akun Antrean LKPP",
    text: message.text,
    html: message.html,
  });
}

export async function requestUserEmailChangeVerification(args: {
  userId: string;
  currentPassword: string;
  newEmail: string;
}) {
  const user = await getUserById(args.userId);
  if (!user) {
    throw new UserEmailChangeError("Akun pengguna tidak ditemukan.", 404);
  }

  const currentEmail = normalizeEmail(user.email);
  const nextEmail = normalizeEmail(args.newEmail);
  const currentPassword = String(args.currentPassword || "").trim();

  if (!currentPassword) {
    throw new UserEmailChangeError("Password saat ini wajib diisi.", 400);
  }

  if (!isValidEmail(currentEmail)) {
    throw new UserEmailChangeError("Email akun saat ini belum valid.", 400);
  }

  if (!isValidEmail(nextEmail)) {
    throw new UserEmailChangeError("Format email baru tidak valid.", 400);
  }

  if (nextEmail === currentEmail) {
    throw new UserEmailChangeError("Email baru harus berbeda dari email saat ini.", 400);
  }

  const passwordMatched =
    String(user.pin_code || "") === currentPassword ||
    (await verifySupabaseAuthPassword(currentEmail, currentPassword));
  if (!passwordMatched) {
    throw new UserEmailChangeError("Password saat ini tidak valid.", 401);
  }

  const existingUsers = await findUsersByEmail(nextEmail);
  if (existingUsers.some((row) => row.id !== user.id)) {
    throw new UserEmailChangeError("Email baru sudah dipakai akun lain.", 409);
  }

  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TOKEN_TTL_SEC * 1000).toISOString();
  const emailChangeToken = signTokenPayload({
    userId: user.id,
    currentEmail,
    newEmail: nextEmail,
    issuedAt,
    expiresAt,
    nonce: crypto.randomUUID(),
  });

  const verificationLink = `${getPublicEnv().appUrl}/profil?authFlow=user-email-change&emailChangeToken=${encodeURIComponent(emailChangeToken)}`;
  await sendEmailChangeVerificationEmail({
    recipientEmail: nextEmail,
    recipientName: String(user.name || "").trim() || "Pengguna LKPP",
    currentEmail,
    newEmail: nextEmail,
    verificationLink,
  });

  return {
    destination: {
      email: maskEmail(nextEmail),
    },
    expiresInSec: EMAIL_CHANGE_TOKEN_TTL_SEC,
  };
}

export async function confirmUserEmailChange(emailChangeToken: string) {
  const payload = verifyTokenSignature(emailChangeToken);
  const user = await getUserById(payload.userId);
  if (!user) {
    throw new UserEmailChangeError("Akun pengguna tidak ditemukan.", 404);
  }

  const currentEmail = normalizeEmail(user.email);
  if (currentEmail !== payload.currentEmail) {
    throw new UserEmailChangeError(
      "Permintaan perubahan email ini sudah tidak berlaku. Silakan ajukan ulang dari profil akun.",
      409,
    );
  }

  const existingUsers = await findUsersByEmail(payload.newEmail);
  if (existingUsers.some((row) => row.id !== user.id)) {
    throw new UserEmailChangeError("Email baru sudah dipakai akun lain.", 409);
  }

  const updated = await patchUserRow(user.id, {
    email: payload.newEmail,
    auth_user_id: null,
    email_verified: true,
    verified_at: new Date().toISOString(),
  });

  return {
    user: mapUser(updated),
    email: normalizeEmail(updated.email),
  };
}
