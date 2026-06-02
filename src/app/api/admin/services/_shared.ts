import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";
import { getPublicBackendConfig } from "@/lib/api/backend-config";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import {
  ensureAdminServiceLevelStorageReady,
  isMissingServiceLevelColumnError,
} from "@/lib/server/admin-service-levels";

type BackendEnvelope = {
  ok?: boolean;
  error?: string;
  service?: unknown;
};

type ServiceCatalogRow = {
  id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function resolveFrontendOrigin(request: Request) {
  const requestUrl = request.url ? new URL(request.url) : null;
  const origin = request.headers.get("origin")?.trim();
  const referer = request.headers.get("referer")?.trim();

  if (origin) {
    return origin.replace(/\/$/, "");
  }

  if (referer) {
    try {
      return new URL(referer).origin.replace(/\/$/, "");
    } catch {
      return "";
    }
  }

  if (requestUrl?.origin) {
    return requestUrl.origin.replace(/\/$/, "");
  }

  return getPublicEnv().appUrl.replace(/\/$/, "");
}

async function readHumasAdminSession() {
  const cookieStore = await cookies();
  const session = parseMockSessionCookieValue(
    cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value,
  );

  const normalizedRole = String(session?.role || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

  if (!session?.staffId || normalizedRole !== "humas-admin") {
    return null;
  }

  return {
    staffId: session.staffId,
    role: normalizedRole,
  };
}

export async function listAdminServiceCatalogRows() {
  const session = await readHumasAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Akses katalog layanan ditolak." },
      { status: 403 },
    );
  }

  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();
  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "Konfigurasi katalog layanan belum lengkap." },
      { status: 500 },
    );
  }

  const headers: Record<string, string> = {
    apikey: serverEnv.serviceRoleKey,
    Authorization: `Bearer ${serverEnv.serviceRoleKey}`,
    Accept: "application/json",
  };

  const url = new URL(`${publicEnv.supabaseUrl}/rest/v1/lkpp_services`);
  url.searchParams.set("select", "id,created_at,updated_at");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "500");

  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const rows = (await response.json().catch(() => [])) as ServiceCatalogRow[];
  if (!response.ok) {
    const message =
      Array.isArray(rows) || typeof rows !== "object"
        ? `Gagal membaca metadata layanan: ${response.status}`
        : "Gagal membaca metadata layanan.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    services: rows.map((row) => ({
      id: String(row.id || "").trim().toUpperCase(),
      createdAt: String(row.created_at || "").trim(),
      updatedAt: String(row.updated_at || "").trim(),
    })),
  });
}

async function proxyToBackend(
  request: Request,
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
) {
  const session = await readHumasAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Akses katalog layanan ditolak." },
      { status: 403 },
    );
  }

  const config = getPublicBackendConfig();
  if (!config.backendBaseUrl || !config.supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, error: "Konfigurasi backend katalog layanan belum lengkap." },
      { status: 500 },
    );
  }

  if (method !== "DELETE") {
    await ensureAdminServiceLevelStorageReady();
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.supabaseAnonKey}`,
    Accept: "application/json",
    "X-Staff-Id": session.staffId,
  };
  const frontendOrigin = resolveFrontendOrigin(request);

  if (frontendOrigin) {
    headers["X-App-Url"] = frontendOrigin;
    headers["X-Client-Origin"] = frontendOrigin;
  }

  if (body != null) {
    headers["Content-Type"] = "application/json";
  }

  const perform = async () => {
    const response = await fetch(`${config.backendBaseUrl}${path}`, {
      method,
      headers,
      body: body == null ? undefined : JSON.stringify(body),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as BackendEnvelope;
    return { response, payload };
  };

  let { response, payload } = await perform();

  if (
    method !== "DELETE" &&
    (!response.ok || payload.ok === false) &&
    isMissingServiceLevelColumnError(payload.error || "")
  ) {
    await ensureAdminServiceLevelStorageReady();
    ({ response, payload } = await perform());
  }

  return NextResponse.json(payload, { status: response.status });
}

export async function proxyAdminServiceCreate(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return proxyToBackend(request, "/services", "POST", body);
}

export async function proxyAdminServiceUpdate(request: Request, serviceId: string) {
  const normalizedServiceId = String(serviceId || "").trim().toUpperCase();
  if (!normalizedServiceId) {
    return NextResponse.json(
      { ok: false, error: "ID layanan wajib diisi." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return proxyToBackend(request, `/services/${normalizedServiceId}`, "PUT", body);
}

export async function proxyAdminServiceDelete(request: Request, serviceId: string) {
  const normalizedServiceId = String(serviceId || "").trim().toUpperCase();
  if (!normalizedServiceId) {
    return NextResponse.json(
      { ok: false, error: "ID layanan wajib diisi." },
      { status: 400 },
    );
  }

  return proxyToBackend(request, `/services/${normalizedServiceId}`, "DELETE");
}
