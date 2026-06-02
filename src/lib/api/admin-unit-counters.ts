async function localAdminRequest<T = unknown>(
  path: string,
  method: "GET" | "PUT",
  body?: Record<string, unknown>,
) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    cache: "no-store",
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  } & T;

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Permintaan loket unit lokal gagal.");
  }

  return payload;
}

export type AdminUnitCounterItem = {
  id: string;
  unitId: string;
  counterNumber: number;
  label: string;
  active: boolean;
};

export function getAdminUnitCounters() {
  return localAdminRequest<{
    items?: AdminUnitCounterItem[];
    generatedAt?: string;
  }>("/api/admin/unit-counters", "GET");
}

export function syncAdminUnitCounters(payload: {
  unitId: string;
  counters: Array<{
    counterNumber: number;
    label: string;
    active: boolean;
  }>;
}) {
  return localAdminRequest<{
    unitId?: string;
    items?: AdminUnitCounterItem[];
  }>("/api/admin/unit-counters", "PUT", payload);
}
