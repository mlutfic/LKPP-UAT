import crypto from "node:crypto";

import { getPublicEnv, getServerEnv } from "@/lib/env";

const STAFF_RESET_ACCESS_KEY_PREFIX = "auth:staff-reset-access:";
const STAFF_RESET_SESSION_TOKEN_PREFIX = "lkppstaffreset_";
const STAFF_RESET_SESSION_TTL_SEC = 15 * 60;

type KvRow = {
  key?: string | null;
  value?: unknown;
};

export type LegacyStaffAuthRow = {
  id?: string | null;
  login_name?: string | null;
  name?: string | null;
  pin_code?: string | null;
  role?: string | null;
  unit_id?: string | null;
  unor_id?: string | null;
  is_active?: boolean | null;
  photo_url?: string | null;
};

type StaffResetAccessRecord = {
  kind: "staff-reset-access";
  staffId: string;
  loginName: string;
  requestedAt: string;
  requestedBy: string | null;
};

type StaffResetSessionTokenPayload = {
  kind: "staff-reset-session";
  staffId: string;
  loginName: string;
  issuedAt: string;
  expiresAt: string;
};

export class StaffResetAccessError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "StaffResetAccessError";
    this.status = status;
  }
}

function normalizeStaffId(value: unknown) {
  return String(value || "").trim();
}

function normalizeLoginName(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function addSecondsIso(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function isExpired(isoValue: string) {
  const time = new Date(isoValue).getTime();
  return !Number.isFinite(time) || time <= Date.now();
}

function buildResetAccessKey(staffId: string) {
  return `${STAFF_RESET_ACCESS_KEY_PREFIX}${staffId}`;
}

function extractStaffIdFromResetAccessKey(key: string) {
  if (!key.startsWith(STAFF_RESET_ACCESS_KEY_PREFIX)) {
    return "";
  }

  return normalizeStaffId(key.slice(STAFF_RESET_ACCESS_KEY_PREFIX.length));
}

function isStaffResetAccessRecord(value: unknown): value is StaffResetAccessRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "kind" in value &&
    value.kind === "staff-reset-access" &&
    "staffId" in value &&
    typeof value.staffId === "string"
  );
}

function getSupabaseConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    throw new StaffResetAccessError(
      "Konfigurasi Supabase server belum lengkap.",
      500,
    );
  }

  return {
    supabaseUrl: publicEnv.supabaseUrl,
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
    throw new StaffResetAccessError(
      `Gagal membaca data reset akses staff: ${body || response.status}`,
      500,
    );
  }

  return (await response.json()) as T[];
}

async function deleteKvRow(key: string) {
  const response = await fetch(
    buildRestUrl("kv_store_f08d97a1", { key: `eq.${key}` }),
    {
      method: "DELETE",
      headers: {
        ...buildRestHeaders(),
        Prefer: "return=minimal",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new StaffResetAccessError(
      `Gagal menghapus status reset akses staff: ${body || response.status}`,
      500,
    );
  }
}

async function insertKvRow(key: string, value: StaffResetAccessRecord) {
  const response = await fetch(buildRestUrl("kv_store_f08d97a1"), {
    method: "POST",
    headers: {
      ...buildRestHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ key, value }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new StaffResetAccessError(
      `Gagal menyimpan status reset akses staff: ${body || response.status}`,
      500,
    );
  }
}

function getTokenSecret() {
  const serverEnv = getServerEnv();
  const secret =
    serverEnv.authEmailSecret ||
    serverEnv.emailChangeSecret ||
    serverEnv.serviceRoleKey;

  if (!secret) {
    throw new StaffResetAccessError(
      "Secret reset akses staff belum tersedia.",
      500,
    );
  }

  return crypto.createHash("sha256").update(secret).digest();
}

function encodeResetSessionToken(payload: StaffResetSessionTokenPayload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getTokenSecret(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${STAFF_RESET_SESSION_TOKEN_PREFIX}${iv.toString(
    "base64url",
  )}.${encrypted.toString("base64url")}.${authTag.toString("base64url")}`;
}

function decodeResetSessionToken(token: string): StaffResetSessionTokenPayload {
  const normalized = String(token || "").trim();
  if (!normalized.startsWith(STAFF_RESET_SESSION_TOKEN_PREFIX)) {
    throw new StaffResetAccessError("Token reset akses staff tidak valid.", 400);
  }

  const raw = normalized.slice(STAFF_RESET_SESSION_TOKEN_PREFIX.length);
  const [ivPart, payloadPart, authTagPart] = raw.split(".");
  if (!ivPart || !payloadPart || !authTagPart) {
    throw new StaffResetAccessError("Format token reset akses staff tidak valid.", 400);
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
    ) as StaffResetSessionTokenPayload;

    if (!payload || typeof payload !== "object") {
      throw new Error("payload kosong");
    }

    if (payload.kind !== "staff-reset-session") {
      throw new StaffResetAccessError("Jenis token reset akses staff tidak sesuai.", 400);
    }

    if (isExpired(payload.expiresAt)) {
      throw new StaffResetAccessError("Sesi reset akses staff sudah kedaluwarsa.", 410);
    }

    return payload;
  } catch (error) {
    if (error instanceof StaffResetAccessError) {
      throw error;
    }

    throw new StaffResetAccessError("Token reset akses staff tidak dapat dibaca.", 400);
  }
}

async function sleep(milliseconds: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function fetchLegacyStaffById(staffId: string) {
  const normalizedStaffId = normalizeStaffId(staffId);
  if (!normalizedStaffId) {
    return null;
  }

  const rows = await fetchRestRows<LegacyStaffAuthRow>("lkpp_staff", {
    select: "*",
    id: `eq.${normalizedStaffId}`,
    limit: "1",
  });

  return rows[0] ?? null;
}

export async function fetchLegacyStaffByLoginName(loginName: string) {
  const normalizedLoginName = normalizeLoginName(loginName);
  if (!normalizedLoginName) {
    return null;
  }

  const rows = await fetchRestRows<LegacyStaffAuthRow>("lkpp_staff", {
    select: "*",
    login_name: `eq.${normalizedLoginName}`,
    limit: "2",
  });

  return rows[0] ?? null;
}

export async function patchLegacyStaffPassword(staffId: string, newPassword: string) {
  const normalizedStaffId = normalizeStaffId(staffId);
  if (!normalizedStaffId) {
    throw new StaffResetAccessError("ID staff reset akses tidak valid.", 400);
  }

  const response = await fetch(
    buildRestUrl("lkpp_staff", {
      id: `eq.${normalizedStaffId}`,
      select: "*",
    }),
    {
      method: "PATCH",
      headers: {
        ...buildRestHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ pin_code: newPassword }),
      cache: "no-store",
    },
  );

  const rows = (await response.json().catch(() => [])) as LegacyStaffAuthRow[];
  if (!response.ok || !rows.length) {
    throw new StaffResetAccessError("Gagal memperbarui password akun staff.", 500);
  }

  return rows[0] ?? null;
}

export async function resolveLegacyStaffId(staffId: string, loginName: string) {
  const normalizedStaffId = normalizeStaffId(staffId);
  if (normalizedStaffId) {
    return normalizedStaffId;
  }

  const normalizedLoginName = normalizeLoginName(loginName);
  if (!normalizedLoginName) {
    return "";
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const row = await fetchLegacyStaffByLoginName(normalizedLoginName);
    const resolvedStaffId = normalizeStaffId(row?.id);
    if (resolvedStaffId) {
      return resolvedStaffId;
    }

    if (attempt < 3) {
      await sleep(300);
    }
  }

  return "";
}

export async function getStaffResetAccessState(staffId: string) {
  const normalizedStaffId = normalizeStaffId(staffId);
  if (!normalizedStaffId) {
    return false;
  }

  const rows = await fetchRestRows<KvRow>("kv_store_f08d97a1", {
    select: "key,value",
    key: `eq.${buildResetAccessKey(normalizedStaffId)}`,
    limit: "1",
  });

  const row = rows[0] ?? null;
  return Boolean(
    row &&
      isStaffResetAccessRecord(row.value) &&
      normalizeStaffId(row.value.staffId) === normalizedStaffId,
  );
}

export async function listStaffResetAccessStatesByStaffIds(staffIds: string[]) {
  const uniqueStaffIds = Array.from(
    new Set(staffIds.map((entry) => normalizeStaffId(entry)).filter(Boolean)),
  );

  const result = new Map<string, boolean>();
  if (!uniqueStaffIds.length) {
    return result;
  }

  const trackedStaffIds = new Set(uniqueStaffIds);
  const rows = await fetchRestRows<KvRow>("kv_store_f08d97a1", {
    select: "key,value",
    key: `like.${STAFF_RESET_ACCESS_KEY_PREFIX}%`,
    limit: "1000",
  });

  for (const row of rows) {
    const kvKey = String(row.key || "").trim();
    const staffId = extractStaffIdFromResetAccessKey(kvKey);
    if (!staffId || !trackedStaffIds.has(staffId)) {
      continue;
    }

    if (isStaffResetAccessRecord(row.value)) {
      result.set(staffId, true);
    }
  }

  return result;
}

export async function setStaffResetAccessState(args: {
  staffId: string;
  loginName?: string | null;
  requestedBy?: string | null;
  enabled: boolean;
}) {
  const staffId = normalizeStaffId(args.staffId);
  if (!staffId) {
    throw new StaffResetAccessError("ID staff reset akses tidak valid.", 400);
  }

  const key = buildResetAccessKey(staffId);
  await deleteKvRow(key);

  if (!args.enabled) {
    return;
  }

  const loginName = normalizeLoginName(args.loginName);
  const payload: StaffResetAccessRecord = {
    kind: "staff-reset-access",
    staffId,
    loginName,
    requestedAt: new Date().toISOString(),
    requestedBy: normalizeStaffId(args.requestedBy) || null,
  };

  await insertKvRow(key, payload);
}

export async function clearStaffResetAccessState(staffId: string) {
  const normalizedStaffId = normalizeStaffId(staffId);
  if (!normalizedStaffId) {
    return;
  }

  await deleteKvRow(buildResetAccessKey(normalizedStaffId));
}

export function issueStaffResetSessionToken(args: {
  staffId: string;
  loginName: string;
}) {
  const staffId = normalizeStaffId(args.staffId);
  const loginName = normalizeLoginName(args.loginName);
  if (!staffId || !loginName) {
    throw new StaffResetAccessError("Data sesi reset akses staff belum lengkap.", 400);
  }

  return encodeResetSessionToken({
    kind: "staff-reset-session",
    staffId,
    loginName,
    issuedAt: new Date().toISOString(),
    expiresAt: addSecondsIso(STAFF_RESET_SESSION_TTL_SEC),
  });
}

export function verifyStaffResetSessionToken(token: string) {
  const payload = decodeResetSessionToken(token);

  return {
    staffId: normalizeStaffId(payload.staffId),
    loginName: normalizeLoginName(payload.loginName),
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
  };
}
