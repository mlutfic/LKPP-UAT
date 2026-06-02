export type AdminServiceLevelEntry = {
  serviceId: string;
  serviceLevel: 1 | 2;
};

type ServiceLevelsResponse = {
  ok: boolean;
  error?: string;
  serviceLevels?: AdminServiceLevelEntry[];
  serviceId?: string;
  serviceLevel?: 1 | 2;
};

async function readJson(response: Response): Promise<ServiceLevelsResponse> {
  return (await response.json().catch(() => ({}))) as ServiceLevelsResponse;
}

export async function getAdminServiceLevels() {
  const response = await fetch("/api/admin/service-levels", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await readJson(response);
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Gagal membaca level layanan.");
  }

  return {
    serviceLevels: Array.isArray(payload.serviceLevels) ? payload.serviceLevels : [],
  };
}

export async function saveAdminServiceLevel(
  serviceId: string,
  serviceLevel: 1 | 2,
) {
  const response = await fetch("/api/admin/service-levels", {
    method: "PUT",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      serviceId,
      serviceLevel,
    }),
  });

  const payload = await readJson(response);
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Gagal menyimpan level layanan.");
  }

  return {
    serviceId: String(payload.serviceId || "").trim().toUpperCase(),
    serviceLevel: payload.serviceLevel === 2 ? 2 : 1,
  } satisfies AdminServiceLevelEntry;
}
