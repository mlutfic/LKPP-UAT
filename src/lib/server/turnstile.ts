import { getServerEnv } from "@/lib/env";

type TurnstileVerificationResponse = {
  success?: boolean;
  "error-codes"?: unknown;
};

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
) {
  const normalizedToken = String(token ?? "").trim();
  if (!normalizedToken) {
    return {
      ok: false as const,
      error: "Verifikasi keamanan wajib diselesaikan.",
    };
  }

  const serverEnv = getServerEnv();
  if (!serverEnv.turnstileSecretKey) {
    return {
      ok: false as const,
      error: "Konfigurasi verifikasi keamanan belum lengkap.",
    };
  }

  const body = new URLSearchParams({
    secret: serverEnv.turnstileSecretKey,
    response: normalizedToken,
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch(serverEnv.turnstileSiteverifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as TurnstileVerificationResponse;
  if (!response.ok || !payload.success) {
    return {
      ok: false as const,
      error: "Verifikasi keamanan gagal. Coba lagi.",
      codes: Array.isArray(payload["error-codes"])
        ? payload["error-codes"].map((value) => String(value))
        : [],
    };
  }

  return {
    ok: true as const,
  };
}
