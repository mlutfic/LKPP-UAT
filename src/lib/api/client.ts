import { getPublicBackendConfig } from "@/lib/api/backend-config";
import { getPublicEnv } from "@/lib/env";
import type { ApiEnvelope, ApiRequestOptions } from "@/lib/api/types";

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === "string" ||
    (typeof Blob !== "undefined" && value instanceof Blob) ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) ||
    (typeof ReadableStream !== "undefined" && value instanceof ReadableStream)
  );
}

let runtimeConfigPromise: Promise<ReturnType<typeof getPublicBackendConfig>> | null = null;

function resolveFrontendOrigin() {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  return getPublicEnv().appUrl.replace(/\/$/, "");
}

async function resolvePublicBackendConfig() {
  const directConfig = getPublicBackendConfig();
  if (directConfig.backendBaseUrl && directConfig.supabaseAnonKey) {
    return directConfig;
  }

  if (typeof window === "undefined") {
    return directConfig;
  }

  if (!runtimeConfigPromise) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 4_000);

    runtimeConfigPromise = fetch("/api/runtime-config", {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Gagal memuat konfigurasi runtime.");
        }

        const payload = (await response.json()) as Partial<
          ReturnType<typeof getPublicBackendConfig>
        >;

        return {
          supabaseUrl: String(payload.supabaseUrl || directConfig.supabaseUrl || "").trim(),
          supabaseAnonKey: String(
            payload.supabaseAnonKey || directConfig.supabaseAnonKey || "",
          ).trim(),
          functionName: String(payload.functionName || directConfig.functionName || "").trim(),
          backendBaseUrl: String(
            payload.backendBaseUrl || directConfig.backendBaseUrl || "",
          ).trim(),
          turnstileSiteKey: String(
            payload.turnstileSiteKey || directConfig.turnstileSiteKey || "",
          ).trim(),
        };
      })
      .catch(() => {
        runtimeConfigPromise = null;
        return directConfig;
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });
  }

  return runtimeConfigPromise;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiEnvelope<T>> {
  const config = await resolvePublicBackendConfig();
  const {
    method = "GET",
    body,
    headers = {},
    timeoutMs = 15000,
    cache,
    actor,
  } = options;

  if (!config.backendBaseUrl) {
    throw new Error("Backend base URL belum dikonfigurasi.");
  }

  const requestHeaders: Record<string, string> = {
    Authorization: `Bearer ${config.supabaseAnonKey}`,
    ...headers,
  };
  const frontendOrigin = resolveFrontendOrigin();

  if (!isFormData(body) && !isBodyInit(body) && body) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (frontendOrigin) {
    requestHeaders["X-App-Url"] = frontendOrigin;
    requestHeaders["X-Client-Origin"] = frontendOrigin;
  }

  if (actor?.userId) {
    requestHeaders["X-User-Id"] = actor.userId;
  }

  if (actor?.staffId) {
    requestHeaders["X-Staff-Id"] = actor.staffId;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${config.backendBaseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body:
        body == null
          ? undefined
          : isFormData(body) || isBodyInit(body)
            ? body
            : JSON.stringify(body),
      cache,
      signal: controller.signal,
    });

    const data = (await response.json()) as ApiEnvelope<T>;

    if (!data.ok) {
      throw new Error(data.error || "Terjadi kesalahan saat memanggil API.");
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Permintaan ke backend melebihi batas waktu.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
