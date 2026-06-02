type RolePermissionsResponse = {
  ok?: boolean;
  error?: string;
  settings?: {
    rolePermissions?: unknown;
  };
  updatedAt?: string;
};

async function readResponseError(
  response: Response,
  fallbackMessage: string,
) {
  const payload = (await response.json().catch(() => null)) as
    | RolePermissionsResponse
    | null;

  throw new Error(payload?.error || fallbackMessage);
}

export async function getRolePermissions(options?: { timeoutMs?: number }) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? 15_000,
  );

  try {
    const response = await fetch("/api/admin/role-permissions", {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    });

    if (!response.ok) {
      await readResponseError(
        response,
        "Gagal membaca hak akses role.",
      );
    }

    return (await response.json()) as RolePermissionsResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Permintaan hak akses role melebihi batas waktu.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function updateRolePermissions(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/role-permissions", {
    method: "PUT",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ rolePermissions: payload }),
  });

  if (!response.ok) {
    await readResponseError(
      response,
      "Gagal menyimpan hak akses role.",
    );
  }

  return (await response.json()) as RolePermissionsResponse;
}
