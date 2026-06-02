import { getPublicEnv, getServerEnv } from "@/lib/env";

type ServiceLevelRow = {
  id?: string | null;
  service_level?: number | null;
};

export type AdminServiceLevelEntry = {
  serviceId: string;
  serviceLevel: 1 | 2;
};

let serviceLevelColumnEnsured = false;

function normalizeServiceId(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function normalizeServiceLevel(value: unknown): 1 | 2 {
  return value === 2 ? 2 : 1;
}

function getSupabaseAdminConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    throw new Error("Konfigurasi Supabase server belum lengkap.");
  }

  return {
    supabaseUrl: publicEnv.supabaseUrl,
    serviceRoleKey: serverEnv.serviceRoleKey,
  };
}

function getSupabaseManagementConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  const projectRef =
    serverEnv.supabaseProjectRef.trim() ||
    (() => {
      try {
        return new URL(publicEnv.supabaseUrl).hostname.split(".")[0] ?? "";
      } catch {
        return "";
      }
    })();

  if (!serverEnv.supabaseAccessToken || !projectRef) {
    throw new Error("Token management Supabase atau project ref belum tersedia.");
  }

  return {
    projectRef,
    accessToken: serverEnv.supabaseAccessToken,
  };
}

function buildRestHeaders() {
  const { serviceRoleKey } = getSupabaseAdminConfig();
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
  };
}

export function isMissingServiceLevelColumnError(message: string) {
  const normalized = String(message || "").toLowerCase();
  return normalized.includes("service_level") && normalized.includes("lkpp_services");
}

async function runManagementQuery(query: string) {
  const { projectRef, accessToken } = getSupabaseManagementConfig();
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gagal menyiapkan kolom level layanan: ${text || response.status}`);
  }
}

async function ensureServiceLevelColumn() {
  if (serviceLevelColumnEnsured) {
    return;
  }

  await runManagementQuery(
    [
      "alter table public.lkpp_services add column if not exists service_level integer;",
      "update public.lkpp_services set service_level = 1 where service_level is null;",
      "alter table public.lkpp_services alter column service_level set default 1;",
      "alter table public.lkpp_services alter column service_level set not null;",
      "alter table public.lkpp_services drop constraint if exists lkpp_services_service_level_check;",
      "alter table public.lkpp_services add constraint lkpp_services_service_level_check check (service_level in (1,2));",
    ].join(" "),
  );

  serviceLevelColumnEnsured = true;
}

async function fetchServiceLevelRows(): Promise<ServiceLevelRow[]> {
  const { supabaseUrl } = getSupabaseAdminConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/lkpp_services`);
  url.searchParams.set("select", "id,service_level");
  url.searchParams.set("order", "id.asc");

  const response = await fetch(url, {
    method: "GET",
    headers: buildRestHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    if (isMissingServiceLevelColumnError(text)) {
      await ensureServiceLevelColumn();
      return fetchServiceLevelRows();
    }

    throw new Error(`Gagal membaca level layanan: ${text || response.status}`);
  }

  return (await response.json()) as ServiceLevelRow[];
}

export async function ensureAdminServiceLevelStorageReady() {
  await fetchServiceLevelRows();
}

export async function listAdminServiceLevels(): Promise<AdminServiceLevelEntry[]> {
  const rows = await fetchServiceLevelRows();

  return rows
    .map((row) => {
      const serviceId = normalizeServiceId(row.id);
      if (!serviceId) {
        return null;
      }

      return {
        serviceId,
        serviceLevel: normalizeServiceLevel(row.service_level),
      } satisfies AdminServiceLevelEntry;
    })
    .filter((entry): entry is AdminServiceLevelEntry => entry !== null);
}

export async function updateAdminServiceLevel(
  serviceId: string,
  serviceLevel: 1 | 2,
): Promise<AdminServiceLevelEntry> {
  const normalizedServiceId = normalizeServiceId(serviceId);
  const normalizedServiceLevel = normalizeServiceLevel(serviceLevel);

  if (!normalizedServiceId) {
    throw new Error("ID layanan tidak valid.");
  }

  const { supabaseUrl } = getSupabaseAdminConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/lkpp_services`);
  url.searchParams.set("id", `eq.${normalizedServiceId}`);
  url.searchParams.set("select", "id,service_level");

  const performUpdate = async () =>
    fetch(url, {
      method: "PATCH",
      headers: {
        ...buildRestHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ service_level: normalizedServiceLevel }),
      cache: "no-store",
    });

  let response = await performUpdate();

  if (!response.ok) {
    const text = await response.text();
    if (isMissingServiceLevelColumnError(text)) {
      await ensureServiceLevelColumn();
      response = await performUpdate();
    } else {
      throw new Error(`Gagal menyimpan level layanan: ${text || response.status}`);
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gagal menyimpan level layanan: ${text || response.status}`);
  }

  const rows = (await response.json()) as ServiceLevelRow[];
  const row = rows[0];

  return {
    serviceId: normalizeServiceId(row?.id || normalizedServiceId),
    serviceLevel: normalizeServiceLevel(row?.service_level ?? normalizedServiceLevel),
  };
}
