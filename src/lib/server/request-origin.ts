import { getPublicEnv } from "@/lib/env";

function normalizeOrigin(rawValue: string) {
  const value = String(rawValue || "").trim();
  if (!value) {
    return "";
  }

  try {
    return new URL(value).origin.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function buildForwardedOrigin(host: string, proto: string) {
  const normalizedHost = String(host || "").trim();
  if (!normalizedHost) {
    return "";
  }

  const normalizedProto = String(proto || "").trim() || "https";
  return `${normalizedProto}://${normalizedHost}`.replace(/\/$/, "");
}

export function resolveRequestOrigin(request: Request) {
  const forwardedOrigin = buildForwardedOrigin(
    request.headers.get("x-forwarded-host") ?? "",
    request.headers.get("x-forwarded-proto") ?? "",
  );
  if (forwardedOrigin) {
    return forwardedOrigin;
  }

  const requestOrigin = normalizeOrigin(request.url);
  if (requestOrigin) {
    return requestOrigin;
  }

  for (const headerName of ["referer", "origin"]) {
    const headerOrigin = normalizeOrigin(request.headers.get(headerName) ?? "");
    if (headerOrigin) {
      return headerOrigin;
    }
  }

  return getPublicEnv().appUrl.replace(/\/$/, "");
}
