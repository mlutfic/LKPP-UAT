import { getPublicBackendConfig } from "@/lib/api/backend-config";
import { getPublicEnv, getServerEnv } from "@/lib/env";

export type HelpFaqStatus = "Aktif" | "Perlu Review" | "Arsip";

type BackendHelpFaqRow = Record<string, unknown>;

type MergedHelpFaqRow = BackendHelpFaqRow & {
  id: string;
  status: HelpFaqStatus;
  active: boolean;
  sortOrder: number;
  order: number;
  updatedAt: string;
  createdAt: string;
};

type StoredHelpFaqStateItem = {
  status: HelpFaqStatus;
  sortOrder: number;
  order: number;
  updatedAt: string;
};

type StoredHelpFaqState = {
  kind: "help-faq-state";
  items: Record<string, StoredHelpFaqStateItem>;
  updatedAt: string;
};

type KvRow = {
  key?: string | null;
  value?: unknown;
};

type BackendEnvelope = {
  ok?: boolean;
  error?: string;
  helpFaq?: unknown;
  helpFaqs?: unknown[];
};

const HELP_FAQ_STATE_KEY = "admin:help-faq:state";

export class AdminHelpFaqError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdminHelpFaqError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeFaqId(value: unknown) {
  return String(value || "").trim();
}

export function normalizeHelpFaqStatus(value: unknown): HelpFaqStatus {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (
    normalized === "perlu review" ||
    normalized === "review" ||
    normalized === "pending review"
  ) {
    return "Perlu Review";
  }

  if (normalized === "arsip" || normalized === "archive") {
    return "Arsip";
  }

  return "Aktif";
}

function getSupabaseServerConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();
  const backendConfig = getPublicBackendConfig();

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    throw new AdminHelpFaqError("Konfigurasi Supabase FAQ belum lengkap.", 500);
  }

  if (!backendConfig.backendBaseUrl || !backendConfig.supabaseAnonKey) {
    throw new AdminHelpFaqError("Konfigurasi backend FAQ belum lengkap.", 500);
  }

  return {
    supabaseUrl: publicEnv.supabaseUrl,
    serviceRoleKey: serverEnv.serviceRoleKey,
    backendBaseUrl: backendConfig.backendBaseUrl,
    supabaseAnonKey: backendConfig.supabaseAnonKey,
  };
}

function buildRestUrl(path: string, params?: Record<string, string>) {
  const { supabaseUrl } = getSupabaseServerConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

function buildRestHeaders() {
  const { serviceRoleKey } = getSupabaseServerConfig();

  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
  };
}

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

async function fetchRestRows<T>(path: string, params?: Record<string, string>) {
  const response = await fetch(buildRestUrl(path, params), {
    method: "GET",
    headers: buildRestHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AdminHelpFaqError(
      `Gagal membaca metadata FAQ: ${body || response.status}`,
      500,
    );
  }

  return (await response.json()) as T[];
}

async function deleteKvRow(key: string) {
  const response = await fetch(
    buildRestUrl("kv_store_f08d97a1", { key: `eq.${key}` }),
    {
      method: "DELETE",
      headers: {
        ...buildRestHeaders(),
        Prefer: "return=minimal",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new AdminHelpFaqError(
      `Gagal membersihkan metadata FAQ: ${body || response.status}`,
      500,
    );
  }
}

async function insertKvRow(key: string, value: StoredHelpFaqState) {
  const response = await fetch(buildRestUrl("kv_store_f08d97a1"), {
    method: "POST",
    headers: {
      ...buildRestHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ key, value }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AdminHelpFaqError(
      `Gagal menyimpan metadata FAQ: ${body || response.status}`,
      500,
    );
  }
}

function normalizeStoredHelpFaqState(input: unknown): StoredHelpFaqState {
  const record = isRecord(input) ? input : {};
  const rawItems = isRecord(record.items) ? record.items : {};
  const items: Record<string, StoredHelpFaqStateItem> = {};

  for (const [faqId, value] of Object.entries(rawItems)) {
    if (!faqId.trim() || !isRecord(value)) {
      continue;
    }

    const sortOrder = asNumber(value.sortOrder, asNumber(value.order, 0));
    items[faqId.trim()] = {
      status: normalizeHelpFaqStatus(value.status),
      sortOrder,
      order: asNumber(value.order, sortOrder),
      updatedAt: asString(value.updatedAt),
    };
  }

  return {
    kind: "help-faq-state",
    items,
    updatedAt: asString(record.updatedAt),
  };
}

async function readHelpFaqState() {
  const rows = await fetchRestRows<KvRow>("kv_store_f08d97a1", {
    select: "key,value",
    key: `eq.${HELP_FAQ_STATE_KEY}`,
    limit: "1",
  });

  return normalizeStoredHelpFaqState(rows[0]?.value);
}

async function writeHelpFaqState(state: StoredHelpFaqState) {
  await deleteKvRow(HELP_FAQ_STATE_KEY);
  await insertKvRow(HELP_FAQ_STATE_KEY, state);
}

async function updateHelpFaqState(
  mutator: (current: StoredHelpFaqState) => StoredHelpFaqState,
) {
  const current = await readHelpFaqState();
  const next = mutator(current);

  await writeHelpFaqState({
    kind: "help-faq-state",
    items: next.items,
    updatedAt: next.updatedAt || new Date().toISOString(),
  });

  return next;
}

function buildBackendHeaders(request: Request, staffId?: string) {
  const { supabaseAnonKey } = getSupabaseServerConfig();
  const origin = resolveFrontendOrigin(request);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${supabaseAnonKey}`,
    Accept: "application/json",
  };

  if (staffId) {
    headers["X-Staff-Id"] = staffId;
  }

  if (origin) {
    headers["X-App-Url"] = origin;
    headers["X-Client-Origin"] = origin;
  }

  return headers;
}

async function fetchBackendEnvelope(
  request: Request,
  path: string,
  init: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    staffId?: string;
    body?: unknown;
  } = {},
) {
  const { backendBaseUrl } = getSupabaseServerConfig();
  const headers = buildBackendHeaders(request, init.staffId);

  if (init.body != null) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${backendBaseUrl}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body == null ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as BackendEnvelope;
  if (!response.ok || payload.ok === false) {
    throw new AdminHelpFaqError(
      payload.error || "Gagal memanggil backend FAQ.",
      response.status || 500,
    );
  }

  return payload;
}

function mergeHelpFaqRows(rows: unknown[], state: StoredHelpFaqState) {
  return rows
    .map((row, index) => {
      const record = isRecord(row) ? row : {};
      const faqId = normalizeFaqId(record.id);
      if (!faqId) {
        return null;
      }

      const stored = state.items[faqId];
      const active =
        stored?.status === "Arsip" ? false : record.active !== false;
      const fallbackStatus = active ? "Aktif" : "Arsip";
      const sortOrder = stored?.sortOrder ?? asNumber(record.sortOrder, asNumber(record.order, index + 1));
      const updatedAt =
        stored?.updatedAt ||
        asString(record.updatedAt) ||
        asString(record.updated_at) ||
        asString(record.createdAt) ||
        asString(record.created_at);

      return {
        ...record,
        id: faqId,
        status: stored?.status ?? normalizeHelpFaqStatus(record.status || fallbackStatus),
        active,
        sortOrder,
        order: stored?.order ?? sortOrder,
        updatedAt,
        createdAt: asString(record.createdAt) || asString(record.created_at),
      };
    })
    .filter((row): row is MergedHelpFaqRow => row !== null)
    .sort((left, right) => {
      const leftSort = asNumber(left.sortOrder, asNumber(left.order, 0));
      const rightSort = asNumber(right.sortOrder, asNumber(right.order, 0));

      if (leftSort !== rightSort) {
        return leftSort - rightSort;
      }

      const leftDate = asString(left.createdAt) || asString(left.updatedAt);
      const rightDate = asString(right.createdAt) || asString(right.updatedAt);

      return rightDate.localeCompare(leftDate) || asString(left.id).localeCompare(asString(right.id));
    });
}

async function fetchAdminHelpFaqRows(request: Request, staffId: string) {
  const payload = await fetchBackendEnvelope(request, "/help-faqs", {
    method: "GET",
    staffId,
  });

  return Array.isArray(payload.helpFaqs) ? payload.helpFaqs : [];
}

async function fetchPublicHelpFaqRows(request: Request) {
  const payload = await fetchBackendEnvelope(request, "/help-faqs/public", {
    method: "GET",
  });

  return Array.isArray(payload.helpFaqs) ? payload.helpFaqs : [];
}

function findFaqIdInUnknown(value: unknown) {
  if (!isRecord(value)) {
    return "";
  }

  return normalizeFaqId(value.id);
}

function findFaqQuestion(value: unknown) {
  if (!isRecord(value)) {
    return "";
  }

  return asString(value.question || value.title);
}

function findFaqAnswer(value: unknown) {
  if (!isRecord(value)) {
    return "";
  }

  return asString(value.answer || value.note || value.description);
}

function resolveCreatedFaqId(args: {
  payload: BackendEnvelope;
  rows: unknown[];
  title: string;
  note: string;
}) {
  const fromSingle = findFaqIdInUnknown(args.payload.helpFaq);
  if (fromSingle) {
    return fromSingle;
  }

  if (Array.isArray(args.payload.helpFaqs)) {
    const fromList = args.payload.helpFaqs
      .map((row) => findFaqIdInUnknown(row))
      .find(Boolean);
    if (fromList) {
      return fromList;
    }
  }

  const matches = args.rows
    .filter((row) => {
      return (
        findFaqQuestion(row) === args.title &&
        findFaqAnswer(row) === args.note &&
        Boolean(findFaqIdInUnknown(row))
      );
    })
    .sort((left, right) => {
      const leftDate =
        findFaqIdInUnknown(left) +
        (asString((left as Record<string, unknown>).createdAt) ||
          asString((left as Record<string, unknown>).updatedAt));
      const rightDate =
        findFaqIdInUnknown(right) +
        (asString((right as Record<string, unknown>).createdAt) ||
          asString((right as Record<string, unknown>).updatedAt));
      return rightDate.localeCompare(leftDate);
    });

  return findFaqIdInUnknown(matches[0]);
}

export async function listAdminHelpFaqs(staffId: string, request: Request) {
  const [rows, state] = await Promise.all([
    fetchAdminHelpFaqRows(request, staffId),
    readHelpFaqState(),
  ]);

  return {
    helpFaqs: mergeHelpFaqRows(rows, state),
    updatedAt: state.updatedAt,
  };
}

export async function listPublicHelpFaqs(request: Request) {
  const [rows, state] = await Promise.all([
    fetchPublicHelpFaqRows(request),
    readHelpFaqState(),
  ]);

  const helpFaqs = mergeHelpFaqRows(rows, state).filter((row) => {
    return row.status === "Aktif" && row.active !== false;
  });

  return {
    helpFaqs,
    updatedAt: state.updatedAt,
  };
}

export async function createAdminHelpFaq(args: {
  staffId: string;
  request: Request;
  payload: Record<string, unknown>;
}) {
  const title = asString(args.payload.question || args.payload.title);
  const note = asString(args.payload.answer || args.payload.note);
  const status = normalizeHelpFaqStatus(args.payload.status);
  const sortOrder = asNumber(args.payload.sortOrder, asNumber(args.payload.order, 0));

  const payload = await fetchBackendEnvelope(args.request, "/help-faqs", {
    method: "POST",
    staffId: args.staffId,
    body: args.payload,
  });

  const backendRows = await fetchAdminHelpFaqRows(args.request, args.staffId);
  const createdFaqId = resolveCreatedFaqId({
    payload,
    rows: backendRows,
    title,
    note,
  });

  const state = createdFaqId
    ? await updateHelpFaqState((current) => ({
        kind: "help-faq-state",
        items: {
          ...current.items,
          [createdFaqId]: {
            status,
            sortOrder,
            order: sortOrder,
            updatedAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      }))
    : await readHelpFaqState();

  const helpFaqs = mergeHelpFaqRows(backendRows, state);
  const helpFaq = createdFaqId
    ? helpFaqs.find((row) => normalizeFaqId(row.id) === createdFaqId) ?? null
    : null;

  return { helpFaq, helpFaqs };
}

export async function updateAdminHelpFaq(args: {
  staffId: string;
  faqId: string;
  request: Request;
  payload: Record<string, unknown>;
}) {
  const faqId = normalizeFaqId(args.faqId);
  if (!faqId) {
    throw new AdminHelpFaqError("ID FAQ wajib diisi.", 400);
  }

  await fetchBackendEnvelope(args.request, `/help-faqs/${faqId}`, {
    method: "PUT",
    staffId: args.staffId,
    body: args.payload,
  });

  const status = normalizeHelpFaqStatus(args.payload.status);
  const sortOrder = asNumber(args.payload.sortOrder, asNumber(args.payload.order, 0));
  const state = await updateHelpFaqState((current) => ({
    kind: "help-faq-state",
    items: {
      ...current.items,
      [faqId]: {
        status,
        sortOrder,
        order: sortOrder,
        updatedAt: new Date().toISOString(),
      },
    },
    updatedAt: new Date().toISOString(),
  }));

  const backendRows = await fetchAdminHelpFaqRows(args.request, args.staffId);
  const helpFaqs = mergeHelpFaqRows(backendRows, state);
  const helpFaq = helpFaqs.find((row) => normalizeFaqId(row.id) === faqId) ?? null;

  return { helpFaq, helpFaqs };
}

export async function deleteAdminHelpFaq(args: {
  staffId: string;
  faqId: string;
  request: Request;
}) {
  const faqId = normalizeFaqId(args.faqId);
  if (!faqId) {
    throw new AdminHelpFaqError("ID FAQ wajib diisi.", 400);
  }

  await fetchBackendEnvelope(args.request, `/help-faqs/${faqId}`, {
    method: "DELETE",
    staffId: args.staffId,
  });

  const state = await updateHelpFaqState((current) => {
    const nextItems = { ...current.items };
    delete nextItems[faqId];

    return {
      kind: "help-faq-state",
      items: nextItems,
      updatedAt: new Date().toISOString(),
    };
  });

  const backendRows = await fetchAdminHelpFaqRows(args.request, args.staffId);
  const helpFaqs = mergeHelpFaqRows(backendRows, state);

  return { helpFaqs };
}
