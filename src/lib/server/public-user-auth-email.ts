import crypto from "node:crypto";

import nodemailer from "nodemailer";

import { getPublicEnv, getServerEnv } from "@/lib/env";
import { isStrongPassword } from "@/lib/password-policy";
import { maskEmail } from "@/lib/privacy";

const EMAIL_TOKEN_PREFIX = "lkppv1_";
const EMAIL_CHALLENGE_TTL_SEC = 10 * 60;
const EMAIL_VERIFICATION_TTL_SEC = 20 * 60;
const STABLE_UAT_PUBLIC_URL = "https://lkpp-antrean-uat.vercel.app";

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

type AuthChallengeBase = {
  challengeId: string;
  issuedAt: string;
  expiresAt: string;
};

type RegisterChallengePayload = AuthChallengeBase & {
  kind: "register-challenge";
  name: string;
  phone: string;
  email: string;
  otp: string;
};

type RegisterVerificationPayload = {
  kind: "register-verified";
  challengeId: string;
  phone: string;
  email: string;
  issuedAt: string;
  expiresAt: string;
};

type PasswordResetChallengePayload = AuthChallengeBase & {
  kind: "password-reset-challenge";
  userId: string;
  email: string;
  otp: string;
};

type PasswordResetVerificationPayload = {
  kind: "password-reset-verified";
  challengeId: string;
  userId: string;
  email: string;
  issuedAt: string;
  expiresAt: string;
};

type UserVerificationChallengePayload = AuthChallengeBase & {
  kind: "user-verification-challenge";
  userId: string;
  email: string;
};

type AuthEmailTokenPayload =
  | RegisterChallengePayload
  | RegisterVerificationPayload
  | PasswordResetChallengePayload
  | PasswordResetVerificationPayload
  | UserVerificationChallengePayload;

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

type RegisterVerificationRequest = {
  name: string;
  phone: string;
  email: string;
  password: string;
};

type RegisterCompletionRequest = {
  name: string;
  phone: string;
  email: string;
  password: string;
  verificationToken: string;
  asalInstansi?: string;
  namaInstansi?: string;
  nik?: string;
  provinsi?: string;
  kabupatenKota?: string;
};

type PasswordResetConfirmRequest = {
  newPassword: string;
  verificationToken?: string;
  challengeToken?: string;
  emailOtp?: string;
};

export class PublicUserAuthEmailError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PublicUserAuthEmailError";
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
  return /^\d{10,16}$/.test(String(value || "").trim());
}

function isExpired(isoValue: string) {
  const time = new Date(isoValue).getTime();
  return !Number.isFinite(time) || time <= Date.now();
}

function addSecondsIso(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function secondsUntilIso(isoValue: string) {
  const time = new Date(isoValue).getTime();
  if (!Number.isFinite(time)) {
    return 0;
  }

  return Math.max(Math.floor((time - Date.now()) / 1000), 0);
}

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function getTokenSecret() {
  const serverEnv = getServerEnv();
  const secret =
    serverEnv.authEmailSecret ||
    serverEnv.emailChangeSecret ||
    serverEnv.serviceRoleKey;
  if (!secret) {
    throw new PublicUserAuthEmailError(
      "Secret verifikasi email belum tersedia.",
      500,
    );
  }

  return crypto.createHash("sha256").update(secret).digest();
}

function encodeToken(payload: AuthEmailTokenPayload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getTokenSecret(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${EMAIL_TOKEN_PREFIX}${iv.toString("base64url")}.${encrypted.toString(
    "base64url",
  )}.${authTag.toString("base64url")}`;
}

function decodeToken(token: string): AuthEmailTokenPayload {
  const normalized = String(token || "").trim();
  if (!normalized.startsWith(EMAIL_TOKEN_PREFIX)) {
    throw new PublicUserAuthEmailError("Tautan email tidak valid.", 400);
  }

  const raw = normalized.slice(EMAIL_TOKEN_PREFIX.length);
  const [ivPart, payloadPart, authTagPart] = raw.split(".");
  if (!ivPart || !payloadPart || !authTagPart) {
    throw new PublicUserAuthEmailError("Format token email tidak valid.", 400);
  }

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getTokenSecret(),
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payloadPart, "base64url")),
      decipher.final(),
    ]);
    const payload = JSON.parse(
      decrypted.toString("utf8"),
    ) as AuthEmailTokenPayload;

    if (!payload || typeof payload !== "object") {
      throw new Error("Token payload kosong");
    }

    if ("expiresAt" in payload && isExpired(payload.expiresAt)) {
      throw new PublicUserAuthEmailError("Tautan email sudah kedaluwarsa.", 410);
    }

    return payload;
  } catch (error) {
    if (error instanceof PublicUserAuthEmailError) {
      throw error;
    }

    throw new PublicUserAuthEmailError("Token email tidak dapat dibaca.", 400);
  }
}

function assertTokenKind<T extends AuthEmailTokenPayload["kind"]>(
  payload: AuthEmailTokenPayload,
  kind: T,
): asserts payload is Extract<AuthEmailTokenPayload, { kind: T }> {
  if (payload.kind !== kind) {
    throw new PublicUserAuthEmailError("Jenis token email tidak sesuai.", 400);
  }
}

function getStablePublicEmailBaseUrl() {
  const appUrl = String(getPublicEnv().appUrl || "").trim().replace(/\/$/, "");

  if (!appUrl) {
    return STABLE_UAT_PUBLIC_URL;
  }

  // Public auth emails should point to a stable alias, not ephemeral deploy URLs.
  if (
    /(?:^https?:\/\/)?(?:[^/]+\.)?vercel\.app$/i.test(appUrl) ||
    /pages\.dev$/i.test(appUrl)
  ) {
    return STABLE_UAT_PUBLIC_URL;
  }

  return appUrl;
}

function buildPublicUrl(pathname: string, params: Record<string, string>) {
  const url = new URL(pathname, `${getStablePublicEmailBaseUrl()}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

function buildMaskedDestination(email: string) {
  return {
    email: maskEmail(email),
  };
}

function buildSmtpTransport() {
  const serverEnv = getServerEnv();
  if (
    !serverEnv.brevoSmtpHost ||
    !serverEnv.brevoSmtpPort ||
    !serverEnv.brevoSmtpUser ||
    !serverEnv.brevoSmtpPass ||
    !serverEnv.smtpFromEmail
  ) {
    throw new PublicUserAuthEmailError(
      "Konfigurasi email verifikasi belum lengkap.",
      500,
    );
  }

  return nodemailer.createTransport({
    host: serverEnv.brevoSmtpHost,
    port: Number(serverEnv.brevoSmtpPort),
    secure: Number(serverEnv.brevoSmtpPort) === 465,
    auth: {
      user: serverEnv.brevoSmtpUser,
      pass: serverEnv.brevoSmtpPass,
    },
  });
}

async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const serverEnv = getServerEnv();
  const transporter = buildSmtpTransport();

  await transporter.sendMail({
    from: `${serverEnv.smtpFromName || "LKPP Antrean"} <${serverEnv.smtpFromEmail}>`,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  });
}

function getSupabaseConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (
    !publicEnv.supabaseUrl ||
    !publicEnv.supabaseAnonKey ||
    !serverEnv.serviceRoleKey
  ) {
    throw new PublicUserAuthEmailError(
      "Konfigurasi Supabase server belum lengkap.",
      500,
    );
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

async function fetchRestRows<T>(path: string, params?: Record<string, string>) {
  const { serviceRoleKey } = getSupabaseConfig();
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
    throw new PublicUserAuthEmailError(
      `Gagal membaca data pengguna: ${body || response.status}`,
      500,
    );
  }

  return (await response.json()) as T[];
}

async function insertUserRow(payload: Partial<LegacyUserRow>) {
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
    throw new PublicUserAuthEmailError(
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
    throw new PublicUserAuthEmailError("Gagal memperbarui akun pengguna.", 500);
  }

  return rows[0]!;
}

async function deleteUserRow(userId: string) {
  const { serviceRoleKey } = getSupabaseConfig();
  await fetch(buildRestUrl("lkpp_users", { id: `eq.${userId}` }), {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: "no-store",
  }).catch(() => undefined);
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

async function findUsersByPhone(phone: string) {
  return fetchRestRows<LegacyUserRow>("lkpp_users", {
    select: "*",
    phone: `eq.${phone}`,
    limit: "2",
  });
}

async function findUsersByNik(nik: string) {
  if (!nik) {
    return [] as LegacyUserRow[];
  }

  return fetchRestRows<LegacyUserRow>("lkpp_users", {
    select: "*",
    nik: `eq.${nik}`,
    limit: "2",
  });
}

async function verifySupabaseAuthPassword(email: string, password: string) {
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  return response.ok;
}

async function authAdminRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
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

  const payload = (await response.json().catch(() => ({}))) as T & {
    msg?: string;
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new PublicUserAuthEmailError(
      String(payload.message || payload.msg || payload.error || "Auth admin request gagal"),
      500,
    );
  }

  return payload;
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
    const response = await authAdminRequest<{ user?: AuthUserRecord } & Record<string, unknown>>("/users", {
      method: "POST",
      body: JSON.stringify(baseBody),
    });
    return extractAuthUserRecord(response);
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error).toLowerCase();
    if (phoneE164 && message.includes("phone")) {
      const retryBody = { ...baseBody };
      delete retryBody.phone;
      delete retryBody.phone_confirm;
      const retry = await authAdminRequest<{ user?: AuthUserRecord } & Record<string, unknown>>("/users", {
        method: "POST",
        body: JSON.stringify(retryBody),
      });
      return extractAuthUserRecord(retry);
    }

    if (message.includes("password")) {
      const retryBody = { ...baseBody, password: createRandomStrongPassword() };
      const retry = await authAdminRequest<{ user?: AuthUserRecord } & Record<string, unknown>>("/users", {
        method: "POST",
        body: JSON.stringify(retryBody),
      });
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

async function syncAuthUser(args: {
  legacyUserId: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  emailConfirmed?: boolean;
}) : Promise<AuthSyncResult> {
  const email = normalizeEmail(args.email);
  if (!isValidEmail(email)) {
    return {
      authUserId: null,
      emailVerified: false,
      phoneVerified: false,
    };
  }

  const phoneE164 = normalizePhoneE164(args.phone);
  const existingAuth = await findAuthUserByEmailOrPhone(email, phoneE164);
  const emailConfirmed = args.emailConfirmed !== false;

  const authUser =
    existingAuth && existingAuth.id
      ? await updateAuthUser(existingAuth.id, {
        name: args.name,
        phone: args.phone,
        email,
        password: args.password,
        emailConfirmed,
      })
      : await createAuthUser({
          legacyUserId: args.legacyUserId,
          name: args.name,
          phone: args.phone,
          email,
          password: args.password,
          emailConfirmed,
        });

  const verification = extractAuthVerificationState(authUser);
  return {
    authUserId: authUser?.id ?? existingAuth?.id ?? null,
    emailVerified: verification.emailVerified || emailConfirmed,
    phoneVerified: verification.phoneVerified,
  };
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

function buildEmailShell(args: {
  title: string;
  greetingName: string;
  introLines: string[];
  otp?: string;
  buttonLabel: string;
  actionUrl: string;
  outroLines?: string[];
}) {
  const introHtml = args.introLines.map((line) => `<p>${line}</p>`).join("");
  const outroHtml = (args.outroLines ?? []).map((line) => `<p>${line}</p>`).join("");
  const otpHtml = args.otp
    ? `
      <p style="margin:20px 0 8px"><strong>Kode OTP 6 digit Anda:</strong></p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 12px;width:100%;max-width:320px;border-collapse:separate">
        <tr>
          <td style="border:1px solid #efc1ba;border-radius:16px;background:#f8d7d3;color:#7a1f16;text-align:center;font-size:28px;font-weight:700;letter-spacing:6px;padding:16px 20px">
            ${args.otp}
          </td>
        </tr>
      </table>
      <p style="margin:0 0 20px;color:#7a1f16">
        Masukkan kode ini di halaman verifikasi jika Anda tidak memakai tombol konfirmasi email.
      </p>
    `
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <p>Halo <strong>${args.greetingName || "Pengguna LKPP"}</strong>,</p>
      ${introHtml}
      ${otpHtml}
      <p style="margin:24px 0">
        <a href="${args.actionUrl}" style="display:inline-block;background:#b3261e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">
          ${args.buttonLabel}
        </a>
      </p>
      <p>Jika tombol tidak terbuka, gunakan tautan berikut:</p>
      <p><a href="${args.actionUrl}">${args.actionUrl}</a></p>
      ${outroHtml}
      <p>Salam,<br />Portal Antrean LKPP</p>
    </div>
  `;

  const textLines = [
    `Halo ${args.greetingName || "Pengguna LKPP"},`,
    "",
    ...args.introLines,
    ...(args.otp
      ? [
          "",
          `Kode OTP 6 digit: ${args.otp}`,
          "Masukkan kode ini di halaman verifikasi jika Anda tidak memakai tombol konfirmasi email.",
        ]
      : []),
    "",
    `${args.buttonLabel}:`,
    args.actionUrl,
    "",
    ...(args.outroLines ?? []),
    "",
    "Salam,",
    "Portal Antrean LKPP",
  ];

  return {
    subject: args.title,
    html,
    text: textLines.join("\n"),
  };
}

async function sendRegisterVerificationEmail(payload: RegisterChallengePayload, recipientName: string) {
  const actionUrl = buildPublicUrl("/", {
    authFlow: "register-email",
    challengeId: payload.challengeId,
    emailAuthToken: encodeToken(payload),
  });

  const message = buildEmailShell({
    title: "Konfirmasi Pendaftaran Akun Antrean LKPP",
    greetingName: recipientName,
    introLines: [
      "Terima kasih telah membuat akun di Portal Antrean LKPP.",
      `Gunakan kode OTP berikut atau klik tautan konfirmasi dalam ${Math.trunc(
        EMAIL_CHALLENGE_TTL_SEC / 60,
      )} menit untuk melanjutkan pendaftaran.`,
    ],
    otp: payload.otp,
    buttonLabel: "Konfirmasi Pendaftaran",
    actionUrl,
    outroLines: [
      "Jika Anda tidak merasa membuat akun ini, abaikan email ini.",
    ],
  });

  await sendEmail({
    to: payload.email,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

async function sendPasswordResetEmail(payload: PasswordResetChallengePayload, recipientName: string) {
  const actionUrl = buildPublicUrl("/reset", {
    authFlow: "reset-password",
    challengeId: payload.challengeId,
    emailAuthToken: encodeToken(payload),
  });

  const message = buildEmailShell({
    title: "Reset Password Akun Antrean LKPP",
    greetingName: recipientName,
    introLines: [
      "Kami menerima permintaan reset password untuk akun Anda.",
      `Gunakan kode OTP berikut atau klik tautan reset dalam ${Math.trunc(
        EMAIL_CHALLENGE_TTL_SEC / 60,
      )} menit untuk membuat password baru.`,
    ],
    otp: payload.otp,
    buttonLabel: "Buka Form Reset Password",
    actionUrl,
    outroLines: [
      "Jika Anda tidak merasa meminta reset password, abaikan email ini.",
    ],
  });

  await sendEmail({
    to: payload.email,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

async function sendUserVerificationEmail(payload: UserVerificationChallengePayload, recipientName: string) {
  const actionUrl = buildPublicUrl("/profil", {
    authFlow: "user-verification",
    challengeId: payload.challengeId,
    emailAuthToken: encodeToken(payload),
  });

  const message = buildEmailShell({
    title: "Verifikasi Email Akun Antrean LKPP",
    greetingName: recipientName,
    introLines: [
      "Silakan konfirmasi email akun Anda untuk menjaga keamanan akses dan memudahkan reset password.",
      `Tautan ini berlaku selama ${Math.trunc(EMAIL_CHALLENGE_TTL_SEC / 60)} menit.`,
    ],
    buttonLabel: "Verifikasi Email Akun",
    actionUrl,
    outroLines: [
      "Jika Anda tidak merasa meminta verifikasi ini, abaikan email ini.",
    ],
  });

  await sendEmail({
    to: payload.email,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

function issueRegisterVerificationToken(payload: RegisterChallengePayload) {
  return encodeToken({
    kind: "register-verified",
    challengeId: payload.challengeId,
    phone: payload.phone,
    email: payload.email,
    issuedAt: new Date().toISOString(),
    expiresAt: addSecondsIso(EMAIL_VERIFICATION_TTL_SEC),
  });
}

function issuePasswordResetVerificationToken(payload: PasswordResetChallengePayload) {
  return encodeToken({
    kind: "password-reset-verified",
    challengeId: payload.challengeId,
    userId: payload.userId,
    email: payload.email,
    issuedAt: new Date().toISOString(),
    expiresAt: addSecondsIso(EMAIL_VERIFICATION_TTL_SEC),
  });
}

export function isLocalAuthEmailToken(token: string | undefined | null) {
  return String(token || "").trim().startsWith(EMAIL_TOKEN_PREFIX);
}

export async function requestRegisterVerification(
  args: RegisterVerificationRequest,
) {
  const name = String(args.name || "").trim();
  const phone = sanitizePhone(args.phone);
  const email = normalizeEmail(args.email);
  const password = String(args.password || "").trim();

  if (name.length < 2) {
    throw new PublicUserAuthEmailError("Nama minimal 2 karakter.", 400);
  }
  if (!isValidPhone(phone)) {
    throw new PublicUserAuthEmailError("Format nomor WhatsApp belum valid.", 400);
  }
  if (!isValidEmail(email)) {
    throw new PublicUserAuthEmailError("Format email tidak valid.", 400);
  }
  if (!isStrongPassword(password)) {
    throw new PublicUserAuthEmailError(
      "Password minimal 8 karakter serta mengandung huruf besar, huruf kecil, dan karakter khusus.",
      400,
    );
  }

  const [existingByEmail, existingByPhone] = await Promise.all([
    findUsersByEmail(email),
    findUsersByPhone(phone),
  ]);

  if (existingByPhone.length > 0) {
    throw new PublicUserAuthEmailError("Nomor WhatsApp sudah terdaftar.", 409);
  }
  if (existingByEmail.length > 0) {
    throw new PublicUserAuthEmailError("Email sudah terdaftar.", 409);
  }

  const challengePayload: RegisterChallengePayload = {
    kind: "register-challenge",
    challengeId: crypto.randomUUID(),
    name,
    phone,
    email,
    otp: generateOtp(),
    issuedAt: new Date().toISOString(),
    expiresAt: addSecondsIso(EMAIL_CHALLENGE_TTL_SEC),
  };

  await sendRegisterVerificationEmail(challengePayload, name);

  return {
    challengeId: challengePayload.challengeId,
    challengeToken: encodeToken(challengePayload),
    expiresInSec: EMAIL_CHALLENGE_TTL_SEC,
    destination: buildMaskedDestination(email),
    provider: "brevo-direct",
  };
}

export async function verifyRegisterOtp(challengeToken: string, emailOtp: string) {
  const payload = decodeToken(challengeToken);
  assertTokenKind(payload, "register-challenge");

  const otp = String(emailOtp || "").replace(/\D/g, "").slice(0, 6);
  if (!/^\d{6}$/.test(otp)) {
    throw new PublicUserAuthEmailError("Kode OTP email harus 6 digit angka.", 400);
  }
  if (payload.otp !== otp) {
    throw new PublicUserAuthEmailError("Kode OTP email tidak cocok.", 401);
  }

  return {
    verificationToken: issueRegisterVerificationToken(payload),
    expiresInSec: EMAIL_VERIFICATION_TTL_SEC,
    email: payload.email,
    phone: payload.phone,
  };
}

export async function verifyRegisterEmailLink(emailAuthToken: string) {
  const payload = decodeToken(emailAuthToken);
  assertTokenKind(payload, "register-challenge");

  return {
    verificationToken: issueRegisterVerificationToken(payload),
    expiresInSec: EMAIL_VERIFICATION_TTL_SEC,
    email: payload.email,
    phone: payload.phone,
  };
}

export async function completeRegister(args: RegisterCompletionRequest) {
  const name = String(args.name || "").trim();
  const phone = sanitizePhone(args.phone);
  const email = normalizeEmail(args.email);
  const password = String(args.password || "").trim();
  const verificationPayload = decodeToken(args.verificationToken);

  assertTokenKind(verificationPayload, "register-verified");

  if (!name || name.length < 2) {
    throw new PublicUserAuthEmailError("Nama minimal 2 karakter.", 400);
  }
  if (!isValidPhone(phone)) {
    throw new PublicUserAuthEmailError("Format nomor WhatsApp belum valid.", 400);
  }
  if (!isValidEmail(email)) {
    throw new PublicUserAuthEmailError("Format email tidak valid.", 400);
  }
  if (!isStrongPassword(password)) {
    throw new PublicUserAuthEmailError(
      "Password minimal 8 karakter serta mengandung huruf besar, huruf kecil, dan karakter khusus.",
      400,
    );
  }
  if (verificationPayload.email !== email || verificationPayload.phone !== phone) {
    throw new PublicUserAuthEmailError(
      "Verifikasi email tidak cocok dengan data pendaftaran.",
      409,
    );
  }

  const nik = String(args.nik || "").replace(/\D/g, "");
  if (nik && nik.length !== 16) {
    throw new PublicUserAuthEmailError("NIK harus 16 digit angka.", 400);
  }

  const [existingByEmail, existingByPhone, existingByNik] = await Promise.all([
    findUsersByEmail(email),
    findUsersByPhone(phone),
    findUsersByNik(nik),
  ]);

  if (existingByPhone.length > 0) {
    throw new PublicUserAuthEmailError("Nomor WhatsApp sudah terdaftar.", 409);
  }
  if (existingByEmail.length > 0) {
    throw new PublicUserAuthEmailError("Email sudah terdaftar.", 409);
  }
  if (existingByNik.length > 0) {
    throw new PublicUserAuthEmailError("NIK sudah dipakai akun lain.", 409);
  }

  const userId = `u${Date.now()}`;
  const inserted = await insertUserRow({
    id: userId,
    name,
    phone,
    email,
    pin_code: password,
    asal_instansi: String(args.asalInstansi || "").trim(),
    nama_instansi: String(args.namaInstansi || "").trim(),
    nik,
    provinsi: String(args.provinsi || "").trim(),
    kabupaten_kota: String(args.kabupatenKota || "").trim(),
    photo_url: null,
    auth_user_id: null,
    email_verified: true,
    phone_verified: false,
    verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  try {
    const authSync = await syncAuthUser({
      legacyUserId: inserted.id,
      name,
      email,
      phone,
      password,
      emailConfirmed: true,
    });

    const updated = await patchUserRow(inserted.id, {
      auth_user_id: authSync.authUserId,
      email_verified: authSync.emailVerified,
      phone_verified: authSync.phoneVerified,
      verified_at: authSync.emailVerified ? new Date().toISOString() : inserted.verified_at,
    });

    return {
      user: mapUser(updated),
    };
  } catch (error) {
    await deleteUserRow(inserted.id);
    throw error;
  }
}

export async function requestUserPasswordReset(emailInput: string) {
  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) {
    throw new PublicUserAuthEmailError("Format email tidak valid.", 400);
  }

  const users = await findUsersByEmail(email);
  if (users.length > 1) {
    throw new PublicUserAuthEmailError(
      "Terdapat duplikasi email pada data pengguna. Hubungi admin LKPP.",
      409,
    );
  }

  const user = users[0] ?? null;
  if (!user) {
    throw new PublicUserAuthEmailError("Email belum terdaftar.", 404);
  }

  const challengePayload: PasswordResetChallengePayload = {
    kind: "password-reset-challenge",
    challengeId: crypto.randomUUID(),
    userId: user.id,
    email,
    otp: generateOtp(),
    issuedAt: new Date().toISOString(),
    expiresAt: addSecondsIso(EMAIL_CHALLENGE_TTL_SEC),
  };

  await sendPasswordResetEmail(
    challengePayload,
    String(user.name || "").trim() || "Pengguna LKPP",
  );

  return {
    challengeId: challengePayload.challengeId,
    challengeToken: encodeToken(challengePayload),
    expiresInSec: EMAIL_CHALLENGE_TTL_SEC,
    destination: buildMaskedDestination(email),
    provider: "brevo-direct",
  };
}

export async function verifyUserPasswordResetOtp(
  challengeToken: string,
  emailOtp: string,
) {
  const payload = decodeToken(challengeToken);
  assertTokenKind(payload, "password-reset-challenge");

  const otp = String(emailOtp || "").replace(/\D/g, "").slice(0, 6);
  if (!/^\d{6}$/.test(otp)) {
    throw new PublicUserAuthEmailError("Kode OTP email harus 6 digit angka.", 400);
  }
  if (payload.otp !== otp) {
    throw new PublicUserAuthEmailError("Kode OTP email tidak cocok.", 401);
  }

  return {
    verificationToken: issuePasswordResetVerificationToken(payload),
    expiresInSec: EMAIL_VERIFICATION_TTL_SEC,
    email: payload.email,
  };
}

export async function verifyUserPasswordResetEmailLink(emailAuthToken: string) {
  const payload = decodeToken(emailAuthToken);
  assertTokenKind(payload, "password-reset-challenge");

  return {
    verificationToken: issuePasswordResetVerificationToken(payload),
    expiresInSec: EMAIL_VERIFICATION_TTL_SEC,
    email: payload.email,
  };
}

export async function confirmUserPasswordReset(args: PasswordResetConfirmRequest) {
  let verificationPayload: PasswordResetVerificationPayload | null = null;

  if (args.verificationToken) {
    const payload = decodeToken(args.verificationToken);
    assertTokenKind(payload, "password-reset-verified");
    verificationPayload = payload;
  } else if (args.challengeToken) {
    const challengePayload = decodeToken(args.challengeToken);
    assertTokenKind(challengePayload, "password-reset-challenge");
    const otp = String(args.emailOtp || "").replace(/\D/g, "").slice(0, 6);
    if (!/^\d{6}$/.test(otp)) {
      throw new PublicUserAuthEmailError("Kode OTP email harus 6 digit angka.", 400);
    }
    if (challengePayload.otp !== otp) {
      throw new PublicUserAuthEmailError("Kode OTP email tidak cocok.", 401);
    }
    verificationPayload = {
      kind: "password-reset-verified",
      challengeId: challengePayload.challengeId,
      userId: challengePayload.userId,
      email: challengePayload.email,
      issuedAt: new Date().toISOString(),
      expiresAt: addSecondsIso(EMAIL_VERIFICATION_TTL_SEC),
    };
  }

  if (!verificationPayload) {
    throw new PublicUserAuthEmailError(
      "Verifikasi reset password belum tersedia.",
      400,
    );
  }

  const newPassword = String(args.newPassword || "").trim();
  if (!isStrongPassword(newPassword)) {
    throw new PublicUserAuthEmailError(
      "Password minimal 8 karakter serta mengandung huruf besar, huruf kecil, dan karakter khusus.",
      400,
    );
  }

  const user = await getUserById(verificationPayload.userId);
  if (!user) {
    throw new PublicUserAuthEmailError("Akun pengguna tidak ditemukan.", 404);
  }

  const normalizedEmail = normalizeEmail(user.email);
  if (normalizedEmail !== verificationPayload.email) {
    throw new PublicUserAuthEmailError(
      "Permintaan reset password ini sudah tidak berlaku.",
      409,
    );
  }

  const authSync = await syncAuthUser({
    legacyUserId: user.id,
    name: String(user.name || "").trim(),
    email: normalizedEmail,
    phone: String(user.phone || "").trim(),
    password: newPassword,
    emailConfirmed: true,
  });

  const updated = await patchUserRow(user.id, {
    pin_code: newPassword,
    auth_user_id: authSync.authUserId,
    email_verified: true,
    phone_verified: authSync.phoneVerified || Boolean(user.phone_verified),
    verified_at: new Date().toISOString(),
  });

  return {
    user: mapUser(updated),
  };
}

export async function requestUserVerification(userId: string) {
  const user = await getUserById(userId);
  if (!user) {
    throw new PublicUserAuthEmailError("Akun pengguna tidak ditemukan.", 404);
  }

  const email = normalizeEmail(user.email);
  if (!isValidEmail(email)) {
    throw new PublicUserAuthEmailError("Email akun belum valid.", 400);
  }

  const challengePayload: UserVerificationChallengePayload = {
    kind: "user-verification-challenge",
    challengeId: crypto.randomUUID(),
    userId: user.id,
    email,
    issuedAt: new Date().toISOString(),
    expiresAt: addSecondsIso(EMAIL_CHALLENGE_TTL_SEC),
  };

  await sendUserVerificationEmail(
    challengePayload,
    String(user.name || "").trim() || "Pengguna LKPP",
  );

  return {
    challengeId: challengePayload.challengeId,
    expiresInSec: EMAIL_CHALLENGE_TTL_SEC,
    destination: buildMaskedDestination(email),
    provider: "brevo-direct",
  };
}

export async function confirmUserVerification(emailAuthToken: string) {
  const payload = decodeToken(emailAuthToken);
  assertTokenKind(payload, "user-verification-challenge");

  const user = await getUserById(payload.userId);
  if (!user) {
    throw new PublicUserAuthEmailError("Akun pengguna tidak ditemukan.", 404);
  }

  const email = normalizeEmail(user.email);
  if (email !== payload.email) {
    throw new PublicUserAuthEmailError(
      "Permintaan verifikasi email ini sudah tidak berlaku.",
      409,
    );
  }

  const currentPassword = String(user.pin_code || "").trim();
  const authSync = await syncAuthUser({
    legacyUserId: user.id,
    name: String(user.name || "").trim(),
    email,
    phone: String(user.phone || "").trim(),
    password: currentPassword || createRandomStrongPassword(),
    emailConfirmed: true,
  });

  const updated = await patchUserRow(user.id, {
    auth_user_id: authSync.authUserId,
    email_verified: true,
    phone_verified: authSync.phoneVerified || Boolean(user.phone_verified),
    verified_at: new Date().toISOString(),
  });

  return {
    user: mapUser(updated),
    email,
  };
}

export async function verifyCurrentPassword(userId: string, currentPassword: string) {
  const user = await getUserById(userId);
  if (!user) {
    throw new PublicUserAuthEmailError("Akun pengguna tidak ditemukan.", 404);
  }

  const normalizedPassword = String(currentPassword || "").trim();
  if (!normalizedPassword) {
    throw new PublicUserAuthEmailError("Password saat ini wajib diisi.", 400);
  }

  const localMatched = String(user.pin_code || "") === normalizedPassword;
  const authMatched =
    !localMatched && isValidEmail(normalizeEmail(user.email))
      ? await verifySupabaseAuthPassword(normalizeEmail(user.email), normalizedPassword)
      : false;

  if (!localMatched && !authMatched) {
    throw new PublicUserAuthEmailError("Password saat ini tidak valid.", 401);
  }

  return {
    user: mapUser(user),
  };
}
