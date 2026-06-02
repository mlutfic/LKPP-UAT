type AdminServicesResponse = {
  ok?: boolean;
  error?: string;
  service?: unknown;
  services?: Array<{
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
};

async function readJson(response: Response): Promise<AdminServicesResponse> {
  return (await response.json().catch(() => ({}))) as AdminServicesResponse;
}

async function requestAdminServices(
  path: string,
  options: {
    method: "POST" | "PUT" | "DELETE";
    body?: Record<string, unknown>;
  },
) {
  const response = await fetch(path, {
    method: options.method,
    credentials: "include",
    cache: "no-store",
    headers: options.body
      ? {
          Accept: "application/json",
          "Content-Type": "application/json",
        }
      : {
          Accept: "application/json",
        },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await readJson(response);
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Gagal memproses layanan.");
  }

  return payload;
}

export function createService(
  payload: Record<string, unknown>,
  _actor?: { staffId?: string | null },
) {
  return requestAdminServices("/api/admin/services", {
    method: "POST",
    body: payload,
  });
}

export function updateService(
  id: string,
  payload: Record<string, unknown>,
  _actor?: { staffId?: string | null },
) {
  return requestAdminServices(`/api/admin/services/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteService(
  id: string,
  _actor?: { staffId?: string | null },
) {
  return requestAdminServices(`/api/admin/services/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getAdminServiceCatalogMeta() {
  const response = await fetch("/api/admin/services", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await readJson(response);
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Gagal membaca metadata layanan.");
  }

  return {
    services: Array.isArray(payload.services)
      ? payload.services.map((service) => ({
          id: String(service.id || "").trim().toUpperCase(),
          createdAt: String(service.createdAt || "").trim(),
          updatedAt: String(service.updatedAt || "").trim(),
        }))
      : [],
  };
}
