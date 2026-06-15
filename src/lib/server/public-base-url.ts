import { getPublicEnv } from "@/lib/env";

function normalizeBaseUrl(rawValue: string) {
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

export function resolvePublicBaseUrl(preferredBaseUrl?: string) {
  const preferred = normalizeBaseUrl(preferredBaseUrl ?? "");
  if (preferred) {
    return preferred;
  }

  const configured = normalizeBaseUrl(getPublicEnv().appUrl);
  if (configured) {
    return configured;
  }

  return "http://127.0.0.1:3200";
}
