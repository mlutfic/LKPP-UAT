import { getPublicEnv, getServerEnv } from "@/lib/env";

export type AdminActivityLogTone = "role" | "info" | "warning" | "success" | "danger";

export type AdminActivityLogItem = {
  id: string;
  timestamp: string;
  actor: string;
  actorLabel: string;
  module: string;
  action: string;
  summary: string;
  result: string;
  tone: AdminActivityLogTone;
  details: string[];
  reference: string;
};

type RawAuditLog = {
  id?: string | null;
  action?: string | null;
  actor?: string | null;
  detail?: string | null;
  meta?: unknown;
  timestamp?: string | null;
};

type BackendAuditEnvelope = {
  ok?: boolean;
  error?: string;
  logs?: RawAuditLog[];
};

type StaffRow = {
  id: string;
  name?: string | null;
  login_name?: string | null;
  role?: string | null;
  unit_id?: string | null;
};

type UserRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type ActorDirectoryEntry = {
  label: string;
  identity: string;
};

type ReadAdminActivityLogsInput = {
  staffId: string;
  appUrl: string;
  limit?: number | null;
};

export class AdminActivityLogsError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdminActivityLogsError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getServerConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (
    !publicEnv.supabaseUrl ||
    !publicEnv.supabaseAnonKey ||
    !publicEnv.supabaseFunctionName ||
    !serverEnv.serviceRoleKey
  ) {
    throw new AdminActivityLogsError("Konfigurasi backend activity log belum lengkap.", 500);
  }

  return {
    supabaseUrl: publicEnv.supabaseUrl,
    supabaseAnonKey: publicEnv.supabaseAnonKey,
    functionName: publicEnv.supabaseFunctionName,
    serviceRoleKey: serverEnv.serviceRoleKey,
  };
}

function buildRestUrl(path: string, params?: Record<string, string>) {
  const { supabaseUrl } = getServerConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

function buildRestHeaders() {
  const { serviceRoleKey } = getServerConfig();

  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
  };
}

async function fetchRestRows<T>(path: string, params?: Record<string, string>) {
  const response = await fetch(buildRestUrl(path, params), {
    method: "GET",
    headers: buildRestHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AdminActivityLogsError(
      `Gagal membaca data activity log: ${body || response.status}`,
      500,
    );
  }

  return (await response.json()) as T[];
}

async function fetchBackendAuditLogs({ staffId, appUrl }: ReadAdminActivityLogsInput) {
  const { supabaseUrl, supabaseAnonKey, functionName } = getServerConfig();

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}/audit-logs`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: "application/json",
      "X-Staff-Id": staffId,
      "X-App-Url": appUrl,
      "X-Client-Origin": appUrl,
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as BackendAuditEnvelope;
  if (!response.ok || payload.ok === false) {
    throw new AdminActivityLogsError(
      payload.error || "Backend audit logs belum bisa dibaca.",
      response.status || 500,
    );
  }

  return Array.isArray(payload.logs) ? payload.logs : [];
}

async function fetchActorDirectory(logs: RawAuditLog[]) {
  const actorValues = Array.from(
    new Set(
      logs
        .map((item) => asString(item.actor))
        .filter(Boolean),
    ),
  );

  const staffIds = actorValues.filter((value) => value.startsWith("s"));
  const userIds = actorValues.filter((value) => value.startsWith("u"));
  const directory = new Map<string, ActorDirectoryEntry>();

  if (staffIds.length) {
    const staffRows = await fetchRestRows<StaffRow>("lkpp_staff", {
      select: "id,name,login_name,role,unit_id",
      id: `in.(${staffIds.join(",")})`,
      limit: String(Math.max(staffIds.length, 1)),
    });

    for (const row of staffRows) {
      const id = asString(row.id);
      if (!id) continue;
      directory.set(id, {
        label: asString(row.name) || asString(row.login_name) || "Petugas LKPP",
        identity: asString(row.login_name) || id,
      });
    }
  }

  if (userIds.length) {
    const userRows = await fetchRestRows<UserRow>("lkpp_users", {
      select: "id,name,email,phone",
      id: `in.(${userIds.join(",")})`,
      limit: String(Math.max(userIds.length, 1)),
    });

    for (const row of userRows) {
      const id = asString(row.id);
      if (!id) continue;
      directory.set(id, {
        label: asString(row.name) || "Pengguna Publik",
        identity: asString(row.email) || asString(row.phone) || id,
      });
    }
  }

  return directory;
}

function humanizeActionKey(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readRequestMeta(meta: unknown) {
  const record = isRecord(meta) ? meta : {};
  const request = isRecord(record.request) ? record.request : {};

  return {
    requestPath: asString(request.path),
    requestMethod: asString(request.method),
    requestOrigin: asString(request.origin),
    requestReferer: asString(request.referer),
    queueNumber: asString(record.queueNumber),
    appointmentId: asString(record.appointmentId),
    serviceId: asString(record.serviceId),
    userId: asString(record.userId),
    changeKeys: isRecord(record.changes) ? Object.keys(record.changes) : [],
  };
}

function deriveReference(action: string, meta: unknown) {
  const requestMeta = readRequestMeta(meta);

  if (requestMeta.requestReferer) {
    try {
      const url = new URL(requestMeta.requestReferer);
      if (url.pathname && url.pathname !== "/") {
        return url.pathname;
      }
    } catch {
      // Ignore malformed referer.
    }
  }

  if (requestMeta.requestPath.includes("/settings")) {
    return requestMeta.changeKeys.includes("rolePermissions")
      ? "/admin/panel/hak-akses-role"
      : "/admin/panel/pengaturan";
  }

  if (requestMeta.requestPath.includes("/help-faqs")) {
    return "/admin/panel/faq-bantuan";
  }

  if (requestMeta.requestPath.includes("/staff")) {
    return "/admin/panel/login-penugasan";
  }

  if (requestMeta.requestPath.includes("/services")) {
    return "/admin/panel/layanan";
  }

  if (requestMeta.requestPath.includes("/appointments")) {
    return "/unit/data-antrean";
  }

  if (requestMeta.requestPath.includes("/users/")) {
    return "/profil";
  }

  switch (action) {
    case "BOOKING_CREATED":
    case "BOOKING_CANCELLED":
      return "/";
    default:
      return requestMeta.requestPath || "/";
  }
}

function deriveModule(action: string, detail: string, meta: unknown) {
  const requestMeta = readRequestMeta(meta);

  if (requestMeta.requestPath.includes("/settings")) {
    return requestMeta.changeKeys.includes("rolePermissions")
      ? "Akses & Peran"
      : "Pengaturan Sistem";
  }

  if (requestMeta.requestPath.includes("/help-faqs")) {
    return "FAQ & Bantuan";
  }

  if (requestMeta.requestPath.includes("/staff")) {
    return "Akun & Penugasan";
  }

  if (requestMeta.requestPath.includes("/services")) {
    return "Katalog Layanan";
  }

  if (requestMeta.requestPath.includes("/appointments")) {
    return action === "BOOKING_CREATED" || action === "BOOKING_CANCELLED"
      ? "Antrean Publik"
      : "Operasional Antrean";
  }

  if (requestMeta.requestPath.includes("/users/")) {
    return "Pengguna Publik";
  }

  if (action.startsWith("BOOKING_")) {
    return "Antrean Publik";
  }

  if (action.includes("STATUS") || detail.toLowerCase().includes("calling")) {
    return "Operasional Antrean";
  }

  return "Log Aktivitas";
}

function deriveActionLabel(action: string, detail: string, meta: unknown) {
  const requestMeta = readRequestMeta(meta);
  const normalizedDetail = detail.toLowerCase();

  switch (action) {
    case "SETTINGS_UPDATED":
      if (requestMeta.changeKeys.includes("rolePermissions")) {
        return "Menyimpan hak akses role";
      }
      return "Memperbarui pengaturan sistem";
    case "STATUS_CHANGED":
      if (normalizedDetail.includes("calling")) {
        return "Memanggil antrean";
      }
      if (normalizedDetail.includes("confirmed")) {
        return "Mengonfirmasi antrean";
      }
      if (normalizedDetail.includes("serving") || normalizedDetail.includes("in_service")) {
        return "Memulai layanan";
      }
      if (normalizedDetail.includes("completed")) {
        return "Menyelesaikan layanan";
      }
      if (normalizedDetail.includes("cancel")) {
        return "Membatalkan antrean";
      }
      return "Mengubah status antrean";
    case "BOOKING_CREATED":
      return "Membuat booking antrean";
    case "BOOKING_CANCELLED":
      return "Membatalkan booking antrean";
    case "USER_PROFILE_UPDATED":
      return "Memperbarui profil pengguna";
    case "USER_PHOTO_UPDATED":
      return "Memperbarui foto pengguna";
    case "PROFILE_PHOTO_CLEANUP":
      return "Membersihkan foto profil";
    case "HELP_FAQ_CREATED":
      return "Menambah FAQ";
    case "HELP_FAQ_UPDATED":
      return "Memperbarui FAQ";
    case "HELP_FAQ_DELETED":
      return "Menghapus FAQ";
    default:
      return humanizeActionKey(action || "Aktivitas");
  }
}

function deriveResultAndTone(action: string, detail: string): {
  result: string;
  tone: AdminActivityLogTone;
} {
  const normalizedDetail = detail.toLowerCase();

  switch (action) {
    case "SETTINGS_UPDATED":
      return { result: "Tersimpan", tone: "success" };
    case "BOOKING_CREATED":
      return { result: "Dibuat", tone: "success" };
    case "BOOKING_CANCELLED":
      return { result: "Dibatalkan", tone: "warning" };
    case "USER_PROFILE_UPDATED":
    case "USER_PHOTO_UPDATED":
      return { result: "Tercatat", tone: "info" };
    case "PROFILE_PHOTO_CLEANUP":
      return { result: "Selesai", tone: "success" };
    case "STATUS_CHANGED":
      if (normalizedDetail.includes("calling")) {
        return { result: "Dipanggil", tone: "info" };
      }
      if (normalizedDetail.includes("confirmed")) {
        return { result: "Dikonfirmasi", tone: "success" };
      }
      if (normalizedDetail.includes("completed")) {
        return { result: "Selesai", tone: "success" };
      }
      if (normalizedDetail.includes("cancel")) {
        return { result: "Dibatalkan", tone: "warning" };
      }
      return { result: "Diperbarui", tone: "info" };
    default:
      return { result: "Tercatat", tone: "info" };
  }
}

function buildSummary(detail: string, meta: unknown) {
  if (detail) {
    return detail;
  }

  const requestMeta = readRequestMeta(meta);
  if (requestMeta.queueNumber) {
    return `Aktivitas tercatat untuk antrean ${requestMeta.queueNumber}.`;
  }

  if (requestMeta.requestPath) {
    return `Aktivitas backend tercatat melalui ${requestMeta.requestPath}.`;
  }

  return "Aktivitas berhasil dicatat oleh backend.";
}

function buildDetailLines(log: RawAuditLog, module: string, reference: string) {
  const requestMeta = readRequestMeta(log.meta);
  const details: string[] = [];

  if (requestMeta.queueNumber) {
    details.push(`Nomor antrean: ${requestMeta.queueNumber}`);
  }

  if (requestMeta.serviceId) {
    details.push(`Layanan: ${requestMeta.serviceId}`);
  }

  if (requestMeta.appointmentId) {
    details.push(`ID appointment: ${requestMeta.appointmentId}`);
  }

  if (requestMeta.changeKeys.length) {
    details.push(`Perubahan: ${requestMeta.changeKeys.join(", ")}`);
  }

  if (requestMeta.requestMethod || requestMeta.requestPath) {
    details.push(
      `Request: ${[requestMeta.requestMethod, requestMeta.requestPath].filter(Boolean).join(" ")}`.trim(),
    );
  }

  if (requestMeta.requestOrigin) {
    details.push(`Origin: ${requestMeta.requestOrigin}`);
  }

  if (!details.length) {
    details.push(`Modul: ${module}`);
    details.push(`Referensi: ${reference}`);
  }

  return Array.from(new Set(details)).slice(0, 4);
}

function resolveActorIdentity(actor: string, directory: Map<string, ActorDirectoryEntry>) {
  const matched = directory.get(actor);
  if (matched) {
    return matched;
  }

  if (actor === "system") {
    return {
      label: "Sistem",
      identity: "system@lkpp.go.id",
    };
  }

  if (actor.includes("@")) {
    return {
      label: actor.split("@")[0] || actor,
      identity: actor,
    };
  }

  if (actor.startsWith("u")) {
    return {
      label: "Pengguna Publik",
      identity: actor,
    };
  }

  if (actor.startsWith("s")) {
    return {
      label: "Petugas LKPP",
      identity: actor,
    };
  }

  return {
    label: actor || "Aktor Tidak Dikenal",
    identity: actor || "-",
  };
}

function normalizeAuditLogItem(
  log: RawAuditLog,
  actorDirectory: Map<string, ActorDirectoryEntry>,
): AdminActivityLogItem | null {
  const actionKey = asString(log.action);
  const actorKey = asString(log.actor);
  const timestamp = asString(log.timestamp);

  if (!actionKey || !timestamp) {
    return null;
  }

  const actor = resolveActorIdentity(actorKey, actorDirectory);
  const summary = buildSummary(asString(log.detail), log.meta);
  const module = deriveModule(actionKey, summary, log.meta);
  const reference = deriveReference(actionKey, log.meta);
  const detailLines = buildDetailLines(log, module, reference);
  const { result, tone } = deriveResultAndTone(actionKey, summary);

  return {
    id: asString(log.id) || `${actionKey}-${timestamp}`,
    timestamp,
    actor: actor.identity,
    actorLabel: actor.label,
    module,
    action: deriveActionLabel(actionKey, summary, log.meta),
    summary,
    result,
    tone,
    details: detailLines,
    reference,
  };
}

export async function readAdminActivityLogs(input: ReadAdminActivityLogsInput) {
  const rawLogs = await fetchBackendAuditLogs(input);
  const actorDirectory = await fetchActorDirectory(rawLogs);
  const normalizedLogs = rawLogs
    .map((log) => normalizeAuditLogItem(log, actorDirectory))
    .filter((item): item is AdminActivityLogItem => item != null)
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  const limit =
    typeof input.limit === "number" && Number.isFinite(input.limit)
      ? Math.max(0, Math.floor(input.limit))
      : 200;
  const logs = limit > 0 ? normalizedLogs.slice(0, limit) : normalizedLogs;

  return {
    logs,
    generatedAt: new Date().toISOString(),
  };
}
