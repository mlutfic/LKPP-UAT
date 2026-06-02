type HelpFaqEnvelope<T> = {
  ok?: boolean;
  error?: string;
} & T;

async function requestHelpFaqApi<T>(
  path: string,
  init?: RequestInit,
): Promise<HelpFaqEnvelope<T>> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    credentials: "same-origin",
  });

  const payload = (await response.json().catch(() => ({}))) as HelpFaqEnvelope<T>;

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Terjadi kesalahan saat memanggil API FAQ.");
  }

  return payload;
}

export function getHelpFaqs(_actor?: { staffId?: string | null }) {
  return requestHelpFaqApi<{ helpFaqs: unknown[] }>("/api/help-faqs");
}

export function getPublicHelpFaqs() {
  return requestHelpFaqApi<{ helpFaqs: unknown[] }>("/api/help-faqs/public");
}

export function createHelpFaq(
  payload: Record<string, unknown>,
  _actor?: { staffId?: string | null },
) {
  return requestHelpFaqApi<{ helpFaq: unknown; helpFaqs?: unknown[] }>("/api/help-faqs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateHelpFaq(
  id: string,
  payload: Record<string, unknown>,
  _actor?: { staffId?: string | null },
) {
  return requestHelpFaqApi<{ helpFaq: unknown; helpFaqs?: unknown[] }>(
    `/api/help-faqs/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteHelpFaq(id: string, _actor?: { staffId?: string | null }) {
  return requestHelpFaqApi<{ helpFaqs?: unknown[] }>(
    `/api/help-faqs/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
}
