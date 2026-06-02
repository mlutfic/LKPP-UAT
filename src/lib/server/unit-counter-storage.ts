import { getPublicEnv, getServerEnv } from "@/lib/env";

type UnitCounterRow = {
  id?: string | null;
  unit_id?: string | null;
  counter_number?: number | null;
  label?: string | null;
  is_active?: boolean | null;
};

type StaffCounterAssignmentRow = {
  staff_id?: string | null;
  counter_id?: string | null;
};

export type UnitCounterRecord = {
  id: string;
  unitId: string;
  counterNumber: number;
  label: string;
  active: boolean;
};

export type StaffCounterAssignmentRecord = {
  staffId: string;
  counterIds: string[];
};

let unitCounterStorageEnsured = false;

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

function tryGetSupabaseManagementConfig() {
  try {
    return getSupabaseManagementConfig();
  } catch {
    return null;
  }
}

function buildRestHeaders() {
  const { serviceRoleKey } = getSupabaseAdminConfig();
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
  };
}

function buildRestUrl(path: string, params?: Record<string, string>) {
  const { supabaseUrl } = getSupabaseAdminConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

function normalizeUnitId(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function normalizeCounterNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return 0;
}

function normalizeCounterId(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function normalizeStaffId(value: unknown) {
  return String(value || "").trim();
}

export function buildUnitCounterId(unitId: string, counterNumber: number) {
  return `${normalizeUnitId(unitId)}-COUNTER-${Math.max(normalizeCounterNumber(counterNumber), 0)}`;
}

async function runManagementQuery(query: string) {
  const config = tryGetSupabaseManagementConfig();
  if (!config) {
    return false;
  }

  const { projectRef, accessToken } = config;
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
    throw new Error(`Gagal menyiapkan tabel loket unit: ${text || response.status}`);
  }

  return true;
}

function isMissingTableErrorMessage(message: string) {
  const normalizedMessage = String(message || "").toLowerCase();
  return (
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("could not find the table") ||
    normalizedMessage.includes("relation") ||
    normalizedMessage.includes("pgrst")
  );
}

async function ensureUnitCounterStorageReady() {
  if (unitCounterStorageEnsured) {
    return true;
  }

  const ensured = await runManagementQuery(
    [
      "create table if not exists public.lkpp_unit_counters (",
      "id text primary key,",
      "unit_id text not null,",
      "counter_number integer not null,",
      "label text not null,",
      "is_active boolean not null default true,",
      "created_at timestamptz not null default timezone('utc', now()),",
      "updated_at timestamptz not null default timezone('utc', now()),",
      "constraint lkpp_unit_counters_unit_number_key unique (unit_id, counter_number)",
      ");",
      "create table if not exists public.lkpp_staff_counter_assignments (",
      "staff_id text not null,",
      "counter_id text not null,",
      "created_at timestamptz not null default timezone('utc', now()),",
      "constraint lkpp_staff_counter_assignments_pkey primary key (staff_id, counter_id),",
      "constraint lkpp_staff_counter_assignments_counter_fkey",
      "foreign key (counter_id) references public.lkpp_unit_counters(id) on delete cascade",
      ");",
    ].join(" "),
  );

  unitCounterStorageEnsured = Boolean(ensured);
  return Boolean(ensured);
}

async function fetchUnitCounterRows(): Promise<UnitCounterRow[]> {
  const managementReady = await ensureUnitCounterStorageReady();

  const response = await fetch(
    buildRestUrl("lkpp_unit_counters", {
      select: "id,unit_id,counter_number,label,is_active",
      order: "unit_id.asc,counter_number.asc",
    }),
    {
      method: "GET",
      headers: buildRestHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const text = await response.text();
    if (!managementReady && isMissingTableErrorMessage(text)) {
      return [];
    }
    throw new Error(`Gagal membaca daftar loket unit: ${text || response.status}`);
  }

  return (await response.json()) as UnitCounterRow[];
}

async function fetchStaffCounterAssignmentRows(): Promise<StaffCounterAssignmentRow[]> {
  const managementReady = await ensureUnitCounterStorageReady();

  const response = await fetch(
    buildRestUrl("lkpp_staff_counter_assignments", {
      select: "staff_id,counter_id",
      order: "staff_id.asc,counter_id.asc",
    }),
    {
      method: "GET",
      headers: buildRestHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const text = await response.text();
    if (!managementReady && isMissingTableErrorMessage(text)) {
      return [];
    }
    throw new Error(`Gagal membaca assignment loket petugas: ${text || response.status}`);
  }

  return (await response.json()) as StaffCounterAssignmentRow[];
}

function mapUnitCounterRow(row: UnitCounterRow): UnitCounterRecord | null {
  const unitId = normalizeUnitId(row.unit_id);
  const counterNumber = normalizeCounterNumber(row.counter_number);
  const id = normalizeCounterId(row.id) || buildUnitCounterId(unitId, counterNumber);

  if (!unitId || counterNumber < 1 || !id) {
    return null;
  }

  return {
    id,
    unitId,
    counterNumber,
    label: String(row.label || "").trim() || `Loket ${counterNumber}`,
    active: row.is_active !== false,
  };
}

export async function listUnitCounters(): Promise<UnitCounterRecord[]> {
  const rows = await fetchUnitCounterRows();

  return rows
    .map(mapUnitCounterRow)
    .filter((entry): entry is UnitCounterRecord => entry !== null);
}

export async function listUnitCountersByUnitId(unitId: string) {
  const normalizedUnitId = normalizeUnitId(unitId);
  if (!normalizedUnitId) {
    return [] as UnitCounterRecord[];
  }

  const items = await listUnitCounters();
  return items.filter((item) => item.unitId === normalizedUnitId);
}

export async function listStaffCounterAssignments(): Promise<StaffCounterAssignmentRecord[]> {
  const rows = await fetchStaffCounterAssignmentRows();
  const counterIdsByStaffId = new Map<string, Set<string>>();

  for (const row of rows) {
    const staffId = normalizeStaffId(row.staff_id);
    const counterId = normalizeCounterId(row.counter_id);
    if (!staffId || !counterId) {
      continue;
    }

    if (!counterIdsByStaffId.has(staffId)) {
      counterIdsByStaffId.set(staffId, new Set());
    }

    counterIdsByStaffId.get(staffId)?.add(counterId);
  }

  return Array.from(counterIdsByStaffId.entries())
    .map(([staffId, counterIds]) => ({
      staffId,
      counterIds: Array.from(counterIds).sort(),
    }))
    .sort((left, right) => left.staffId.localeCompare(right.staffId));
}

export async function listStaffCounterAssignmentsByStaffIds(staffIds: string[]) {
  const trackedStaffIds = new Set(staffIds.map(normalizeStaffId).filter(Boolean));
  const result = new Map<string, string[]>();

  if (trackedStaffIds.size < 1) {
    return result;
  }

  const items = await listStaffCounterAssignments();
  for (const item of items) {
    if (trackedStaffIds.has(item.staffId)) {
      result.set(item.staffId, item.counterIds);
    }
  }

  return result;
}

export async function listStaffAssignedCounters(staffId: string) {
  const normalizedStaffId = normalizeStaffId(staffId);
  if (!normalizedStaffId) {
    return [] as UnitCounterRecord[];
  }

  const [counters, assignmentsByStaffId] = await Promise.all([
    listUnitCounters(),
    listStaffCounterAssignmentsByStaffIds([normalizedStaffId]),
  ]);
  const assignedCounterIds = new Set(assignmentsByStaffId.get(normalizedStaffId) ?? []);

  return counters.filter((counter) => assignedCounterIds.has(counter.id));
}

export async function replaceUnitCounters(
  unitId: string,
  counters: Array<{
    counterNumber: number;
    label?: string;
    active?: boolean;
  }>,
) {
  const normalizedUnitId = normalizeUnitId(unitId);
  if (!normalizedUnitId) {
    throw new Error("ID unit untuk loket tidak valid.");
  }

  const managementReady = await ensureUnitCounterStorageReady();

  const normalizedCounterEntries = counters
    .map((entry) => {
      const counterNumber = normalizeCounterNumber(entry.counterNumber);
      if (counterNumber < 1) {
        return null;
      }

      const id = buildUnitCounterId(normalizedUnitId, counterNumber);
      return {
        id,
        unit_id: normalizedUnitId,
        counter_number: counterNumber,
        label: String(entry.label || "").trim() || `Loket ${counterNumber}`,
        is_active: entry.active !== false,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        id: string;
        unit_id: string;
        counter_number: number;
        label: string;
        is_active: boolean;
      } => entry !== null,
    );
  const normalizedCounters = Array.from(
    new Map(normalizedCounterEntries.map((entry) => [entry.id, entry] as const)).values(),
  ).sort((left, right) =>
    normalizeCounterNumber(left.counter_number) - normalizeCounterNumber(right.counter_number),
  );

  const existingCounters = await listUnitCountersByUnitId(normalizedUnitId);
  const nextCounterIds = new Set(
    normalizedCounters.map((entry) => normalizeCounterId(entry.id)),
  );
  const staleCounterIds = existingCounters
    .map((entry) => normalizeCounterId(entry.id))
    .filter((counterId) => !nextCounterIds.has(counterId));

  if (staleCounterIds.length > 0) {
    const deleteResponse = await fetch(
      buildRestUrl("lkpp_unit_counters", {
        unit_id: `eq.${normalizedUnitId}`,
        id: `in.(${staleCounterIds.join(",")})`,
      }),
      {
        method: "DELETE",
        headers: {
          ...buildRestHeaders(),
          Prefer: "return=minimal",
        },
        cache: "no-store",
      },
    );

    if (!deleteResponse.ok) {
      const text = await deleteResponse.text();
      if (!managementReady && isMissingTableErrorMessage(text || "")) {
        throw new Error(
          "Tabel loket unit belum tersedia di database. Siapkan storage loket terlebih dahulu sebelum menyimpan konfigurasi unit.",
        );
      }
      throw new Error(`Gagal menghapus loket lama: ${text || deleteResponse.status}`);
    }
  }

  if (normalizedCounters.length > 0) {
    const upsertResponse = await fetch(buildRestUrl("lkpp_unit_counters"), {
      method: "POST",
      headers: {
        ...buildRestHeaders(),
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(normalizedCounters),
      cache: "no-store",
    });

    if (!upsertResponse.ok) {
      const text = await upsertResponse.text();
      if (!managementReady && isMissingTableErrorMessage(text || "")) {
        throw new Error(
          "Tabel loket unit belum tersedia di database. Siapkan storage loket terlebih dahulu sebelum menyimpan konfigurasi unit.",
        );
      }
      throw new Error(`Gagal menyimpan loket unit: ${text || upsertResponse.status}`);
    }
  }

  return listUnitCountersByUnitId(normalizedUnitId);
}

export async function replaceStaffCounterAssignments(staffId: string, counterIds: string[]) {
  const normalizedStaffId = normalizeStaffId(staffId);
  if (!normalizedStaffId) {
    throw new Error("ID staff untuk assignment loket tidak valid.");
  }

  const managementReady = await ensureUnitCounterStorageReady();

  const normalizedCounterIds = Array.from(
    new Set(counterIds.map(normalizeCounterId).filter(Boolean)),
  ).sort();

  const deleteResponse = await fetch(
    buildRestUrl("lkpp_staff_counter_assignments", {
      staff_id: `eq.${normalizedStaffId}`,
    }),
    {
      method: "DELETE",
      headers: {
        ...buildRestHeaders(),
        Prefer: "return=minimal",
      },
      cache: "no-store",
    },
  );

  if (!deleteResponse.ok) {
    const text = await deleteResponse.text();
    if (!managementReady && isMissingTableErrorMessage(text || "")) {
      throw new Error(
        "Tabel assignment loket belum tersedia di database. Siapkan storage loket terlebih dahulu sebelum menyimpan assignment petugas.",
      );
    }
    throw new Error(`Gagal menghapus assignment loket lama: ${text || deleteResponse.status}`);
  }

  if (normalizedCounterIds.length > 0) {
    const insertResponse = await fetch(buildRestUrl("lkpp_staff_counter_assignments"), {
      method: "POST",
      headers: {
        ...buildRestHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(
        normalizedCounterIds.map((counterId) => ({
          staff_id: normalizedStaffId,
          counter_id: counterId,
        })),
      ),
      cache: "no-store",
    });

    if (!insertResponse.ok) {
      const text = await insertResponse.text();
      if (!managementReady && isMissingTableErrorMessage(text || "")) {
        throw new Error(
          "Tabel assignment loket belum tersedia di database. Siapkan storage loket terlebih dahulu sebelum menyimpan assignment petugas.",
        );
      }
      throw new Error(`Gagal menyimpan assignment loket baru: ${text || insertResponse.status}`);
    }
  }

  return {
    staffId: normalizedStaffId,
    counterIds: normalizedCounterIds,
  } satisfies StaffCounterAssignmentRecord;
}
