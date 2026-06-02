import { getPublicEnv, getServerEnv } from "@/lib/env";

type KvRow = {
  key?: string | null;
  value?: unknown;
};

type StoredAdminProfile = {
  kind: "admin-profile";
  staffId: string | null;
  name: string;
  email: string;
  coordination: string;
  lastSyncLabel: string;
  updatedAt: string;
};

type AdminProfileSnapshot = {
  name: string;
  email: string;
  coordination: string;
  lastSyncLabel: string;
  updatedAt: string;
};

const ADMIN_PROFILE_KEY_PREFIX = "admin:profile:";
const DEFAULT_ADMIN_PROFILE = {
  name: "Hana Prameswari",
  email: "admin-layanan@lkpp.go.id",
  coordination: "Koordinasi dengan humas monitoring, supervisor, dan unit organisasi.",
  lastSyncLabel: "14 Apr 2026, 19.05",
};

export class AdminProfileError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdminProfileError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStaffId(value: unknown) {
  return String(value || "").trim();
}

function buildAdminProfileKey(staffId: string) {
  return `${ADMIN_PROFILE_KEY_PREFIX}${staffId || "humas-admin"}`;
}

function getSupabaseServerConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    throw new AdminProfileError("Konfigurasi Supabase server belum lengkap.", 500);
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

function buildRestHeaders() {
  const { serviceRoleKey } = getSupabaseServerConfig();

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
    throw new AdminProfileError(
      `Gagal membaca profil admin: ${body || response.status}`,
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
    throw new AdminProfileError(
      `Gagal menghapus profil admin lama: ${body || response.status}`,
      500,
    );
  }
}

async function insertKvRow(key: string, value: StoredAdminProfile) {
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
    throw new AdminProfileError(
      `Gagal menyimpan profil admin: ${body || response.status}`,
      500,
    );
  }
}

function normalizeStoredAdminProfile(input: unknown): AdminProfileSnapshot {
  const record = isRecord(input) ? input : {};

  return {
    name: asString(record.name) || DEFAULT_ADMIN_PROFILE.name,
    email: asString(record.email) || DEFAULT_ADMIN_PROFILE.email,
    coordination:
      asString(record.coordination) || DEFAULT_ADMIN_PROFILE.coordination,
    lastSyncLabel:
      asString(record.lastSyncLabel) || DEFAULT_ADMIN_PROFILE.lastSyncLabel,
    updatedAt: asString(record.updatedAt),
  };
}

async function getAdminProfileRow(staffId: string) {
  const rows = await fetchRestRows<KvRow>("kv_store_f08d97a1", {
    select: "key,value",
    key: `eq.${buildAdminProfileKey(staffId)}`,
    limit: "1",
  });

  return rows[0] ?? null;
}

export async function readAdminProfileSettings(staffId: string) {
  const normalizedStaffId = normalizeStaffId(staffId);
  const row = await getAdminProfileRow(normalizedStaffId);
  const profile = normalizeStoredAdminProfile(row?.value);

  return {
    profile: {
      name: profile.name,
      email: profile.email,
      coordination: profile.coordination,
      lastSyncLabel: profile.lastSyncLabel,
    },
    updatedAt: profile.updatedAt,
  };
}

export async function updateAdminProfileSettings(args: {
  staffId: string;
  profile: unknown;
}) {
  const normalizedStaffId = normalizeStaffId(args.staffId);
  if (!normalizedStaffId) {
    throw new AdminProfileError("Sesi admin tidak valid.", 403);
  }

  const profile = normalizeStoredAdminProfile(args.profile);
  if (!profile.name) {
    throw new AdminProfileError("Nama admin wajib diisi.", 400);
  }

  if (!profile.email) {
    throw new AdminProfileError("Email internal wajib diisi.", 400);
  }

  const updatedAt = new Date().toISOString();
  const storedProfile: StoredAdminProfile = {
    kind: "admin-profile",
    staffId: normalizedStaffId,
    name: profile.name,
    email: profile.email,
    coordination: profile.coordination,
    lastSyncLabel: profile.lastSyncLabel,
    updatedAt,
  };

  const key = buildAdminProfileKey(normalizedStaffId);
  await deleteKvRow(key);
  await insertKvRow(key, storedProfile);

  return {
    profile: {
      name: storedProfile.name,
      email: storedProfile.email,
      coordination: storedProfile.coordination,
      lastSyncLabel: storedProfile.lastSyncLabel,
    },
    updatedAt,
  };
}
