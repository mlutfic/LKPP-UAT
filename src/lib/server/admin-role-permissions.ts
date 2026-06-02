import { getPublicEnv, getServerEnv } from "@/lib/env";
import {
  normalizeInternalRolePermissionMatrix,
  serializeInternalRolePermissionMatrix,
} from "@/lib/internal-role-policy";

type AdminSettingsRow = {
  settings_key?: string | null;
  role_permissions?: unknown;
  operating_start?: string | null;
  operating_end?: string | null;
  max_advance_booking_days?: number | null;
  updated_at?: string | null;
};

type StoredRolePermissions = Record<string, unknown>;

const DEFAULT_SETTINGS_KEY = "default";
const DEFAULT_OPERATING_START = "09:00";
const DEFAULT_OPERATING_END = "23:59";
const DEFAULT_MAX_ADVANCE_BOOKING_DAYS = 21;

export class AdminRolePermissionsError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdminRolePermissionsError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getSupabaseServerConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    throw new AdminRolePermissionsError(
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
    throw new AdminRolePermissionsError(
      `Gagal membaca hak akses role: ${body || response.status}`,
      500,
    );
  }

  return (await response.json()) as T[];
}

function getDefaultRolePermissionMatrix() {
  return normalizeInternalRolePermissionMatrix(undefined);
}

function toStoredRolePermissions(input: unknown): StoredRolePermissions {
  const serialized = serializeInternalRolePermissionMatrix(
    normalizeInternalRolePermissionMatrix(input),
  ) as StoredRolePermissions;

  delete serialized.humas_admin;
  return serialized;
}

function mapSettingsRowToRolePermissions(row: AdminSettingsRow | null | undefined) {
  return toStoredRolePermissions(row?.role_permissions);
}

async function insertAdminSettingsRow(rolePermissions: StoredRolePermissions) {
  const response = await fetch(buildRestUrl("lkpp_admin_settings"), {
    method: "POST",
    headers: {
      ...buildRestHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      settings_key: DEFAULT_SETTINGS_KEY,
      operating_start: DEFAULT_OPERATING_START,
      operating_end: DEFAULT_OPERATING_END,
      max_advance_booking_days: DEFAULT_MAX_ADVANCE_BOOKING_DAYS,
      role_permissions: rolePermissions,
    }),
    cache: "no-store",
  });

  const rows = (await response.json().catch(() => [])) as AdminSettingsRow[];
  if (!response.ok || !Array.isArray(rows) || rows.length === 0) {
    const body = Array.isArray(rows) ? JSON.stringify(rows) : "";
    throw new AdminRolePermissionsError(
      `Gagal membuat data hak akses role: ${body || response.status}`,
      500,
    );
  }

  return rows[0] ?? null;
}

async function patchAdminSettingsRow(rolePermissions: StoredRolePermissions) {
  const response = await fetch(
    buildRestUrl("lkpp_admin_settings", {
      settings_key: `eq.${DEFAULT_SETTINGS_KEY}`,
      select: "settings_key,role_permissions,updated_at",
    }),
    {
      method: "PATCH",
      headers: {
        ...buildRestHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        role_permissions: rolePermissions,
      }),
      cache: "no-store",
    },
  );

  const rows = (await response.json().catch(() => [])) as AdminSettingsRow[];
  if (!response.ok || !Array.isArray(rows) || rows.length === 0) {
    const body = Array.isArray(rows) ? JSON.stringify(rows) : "";
    throw new AdminRolePermissionsError(
      `Gagal menyimpan hak akses role: ${body || response.status}`,
      500,
    );
  }

  return rows[0] ?? null;
}

async function getAdminSettingsRow() {
  const rows = await fetchRestRows<AdminSettingsRow>("lkpp_admin_settings", {
    select:
      "settings_key,role_permissions,operating_start,operating_end,max_advance_booking_days,updated_at",
    settings_key: `eq.${DEFAULT_SETTINGS_KEY}`,
    limit: "1",
  });

  return rows[0] ?? null;
}

async function ensureAdminSettingsRow() {
  const existing = await getAdminSettingsRow();
  if (existing) {
    return existing;
  }

  return insertAdminSettingsRow(
    toStoredRolePermissions(getDefaultRolePermissionMatrix()),
  );
}

export async function readAdminRolePermissionsSettings() {
  const row = await ensureAdminSettingsRow();

  return {
    settings: {
      rolePermissions: mapSettingsRowToRolePermissions(row),
    },
    updatedAt: String(row?.updated_at || "").trim(),
  };
}

export async function updateAdminRolePermissionsSettings(input: unknown) {
  const row = await ensureAdminSettingsRow();
  const rolePermissions = toStoredRolePermissions(
    isRecord(input) ? input : getDefaultRolePermissionMatrix(),
  );

  const nextRow = await patchAdminSettingsRow(rolePermissions);
  const effectiveRow = nextRow ?? row;

  return {
    settings: {
      rolePermissions: mapSettingsRowToRolePermissions(effectiveRow),
    },
    updatedAt: String(effectiveRow?.updated_at || "").trim(),
  };
}
