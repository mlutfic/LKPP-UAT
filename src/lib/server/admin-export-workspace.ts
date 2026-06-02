import { getInternalAppointmentStatusLabel } from "@/features/internal/internal-appointment-status";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";
import {
  readAdminActivityLogs,
  type AdminActivityLogItem,
} from "@/lib/server/admin-activity-logs";

type ExportScope = "rekap" | "audit" | "publik";
type ExportFormat = "csv" | "pdf";

type AppointmentExportRow = {
  id?: string | null;
  appointment_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  queue_number?: string | null;
  status?: string | null;
  checked_in?: boolean | null;
  call_count?: number | null;
  service_id?: string | null;
  service_name?: string | null;
  unit_short_name?: string | null;
  staff_note?: string | null;
};

type BackendAnnouncementsEnvelope = {
  ok?: boolean;
  error?: string;
  announcements?: unknown[];
};

type NormalizedAnnouncementRecord = {
  id: string;
  title: string;
  message: string;
  type: string;
  active: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  dateKey: string;
  lifecycleLabel: "Tayang" | "Terjadwal" | "Lewat jadwal" | "Arsip";
};

export type AdminExportWorkspacePackage = {
  id: string;
  title: string;
  status: "Siap" | "Terkirim" | "Perlu Review";
  note: string;
  scope: ExportScope;
  scopeLabel: string;
  rowCount: number;
  formats: ExportFormat[];
  dateKey: string;
  lastUpdatedLabel: string;
  columns: string[];
  rows: string[][];
};

type ReadAdminExportWorkspaceInput = {
  staffId: string;
  appUrl: string;
  startDate: string;
  endDate: string;
};

export class AdminExportWorkspaceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdminExportWorkspaceError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown) {
  return value === true;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
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
    throw new AdminExportWorkspaceError(
      "Konfigurasi Supabase untuk ekspor admin belum lengkap.",
      500,
    );
  }

  return {
    supabaseUrl: publicEnv.supabaseUrl,
    supabaseAnonKey: publicEnv.supabaseAnonKey,
    functionName: publicEnv.supabaseFunctionName,
    serviceRoleKey: serverEnv.serviceRoleKey,
  };
}

function buildRestUrl(path: string, params: Array<[string, string]> = []) {
  const { supabaseUrl } = getServerConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`);

  for (const [key, value] of params) {
    url.searchParams.append(key, value);
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

async function fetchRestRows<T>(path: string, params: Array<[string, string]> = []) {
  const response = await fetch(buildRestUrl(path, params), {
    method: "GET",
    headers: buildRestHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AdminExportWorkspaceError(
      `Gagal membaca data ekspor admin: ${body || response.status}`,
      500,
    );
  }

  return (await response.json()) as T[];
}

async function fetchAdminAnnouncements(staffId: string, appUrl: string) {
  const { supabaseUrl, supabaseAnonKey, functionName } = getServerConfig();
  const response = await fetch(
    `${supabaseUrl}/functions/v1/${functionName}/announcements`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        Accept: "application/json",
        "X-Staff-Id": staffId,
        "X-App-Url": appUrl,
        "X-Client-Origin": appUrl,
      },
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => ({}))) as BackendAnnouncementsEnvelope;
  if (!response.ok || payload.ok === false) {
    throw new AdminExportWorkspaceError(
      payload.error || "Data pengumuman belum bisa dibaca.",
      response.status || 500,
    );
  }

  return Array.isArray(payload.announcements) ? payload.announcements : [];
}

function compareDateKeys(left: string, right: string) {
  return left.localeCompare(right);
}

function dateKeyToUtcDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function utcDateToKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDateKey(dateKey: string, offsetDays: number) {
  const date = dateKeyToUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return utcDateToKey(date);
}

function getJakartaTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDateKey(dateKey: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${dateKey}T00:00:00+07:00`));
}

function formatRelativeDateLabel(dateKey: string) {
  const today = getJakartaTodayKey();

  if (dateKey === today) {
    return "Hari ini";
  }

  if (dateKey === shiftDateKey(today, -1)) {
    return "Kemarin";
  }

  return formatDateKey(dateKey);
}

function extractDateKey(value: unknown) {
  const raw = asString(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})T/);
  return isoMatch?.[1] ?? "";
}

function isDateWithinRange(dateKey: string, startDate: string, endDate: string) {
  return Boolean(
    dateKey &&
      compareDateKeys(dateKey, startDate) >= 0 &&
      compareDateKeys(dateKey, endDate) <= 0,
  );
}

function getMinDateKey(dateKeys: string[]) {
  return dateKeys.filter(Boolean).sort(compareDateKeys)[0] ?? null;
}

function getMaxDateKey(dateKeys: string[]) {
  return dateKeys.filter(Boolean).sort(compareDateKeys).at(-1) ?? null;
}

function normalizeAnnouncementRecord(rawAnnouncement: unknown) {
  if (!isRecord(rawAnnouncement)) {
    return null;
  }

  const id = asString(rawAnnouncement.id);
  const title = asString(rawAnnouncement.title) || "Tanpa judul";
  const message = asString(rawAnnouncement.message);
  if (!id || (!title && !message)) {
    return null;
  }

  const startDate =
    extractDateKey(rawAnnouncement.startDate) ||
    extractDateKey(rawAnnouncement.start_date);
  const endDate =
    extractDateKey(rawAnnouncement.endDate) ||
    extractDateKey(rawAnnouncement.end_date);
  const createdAt =
    asString(rawAnnouncement.createdAt) ||
    asString(rawAnnouncement.created_at);
  const createdDateKey = extractDateKey(createdAt);
  const active =
    rawAnnouncement.active !== false && rawAnnouncement.is_active !== false;
  const today = getJakartaTodayKey();

  let lifecycleLabel: NormalizedAnnouncementRecord["lifecycleLabel"] = "Tayang";
  if (!active) {
    lifecycleLabel = "Arsip";
  } else if (startDate && compareDateKeys(today, startDate) < 0) {
    lifecycleLabel = "Terjadwal";
  } else if (endDate && compareDateKeys(today, endDate) > 0) {
    lifecycleLabel = "Lewat jadwal";
  }

  return {
    id,
    title,
    message,
    type: asString(rawAnnouncement.type) || "info",
    active,
    startDate,
    endDate,
    createdAt,
    dateKey: startDate || createdDateKey || endDate,
    lifecycleLabel,
  } satisfies NormalizedAnnouncementRecord;
}

function toPackageDateKey(dateKey: string | null, fallbackDateKey: string) {
  return dateKey || fallbackDateKey;
}

function mapAppointmentRows(rows: AppointmentExportRow[]) {
  const columns = [
    "ID Appointment",
    "Nomor Antrean",
    "Tanggal",
    "Jam",
    "Layanan",
    "Unit",
    "Status",
    "Check-in",
    "Panggilan",
    "Catatan",
  ];
  const records = rows.map((row) => {
    const dateKey = extractDateKey(row.appointment_date);
    const timeRange = [asString(row.start_time).slice(0, 5), asString(row.end_time).slice(0, 5)]
      .filter(Boolean)
      .join(" - ");
    const statusLabel = getInternalAppointmentStatusLabel({
      status: asString(row.status),
      checkedIn: asBoolean(row.checked_in),
    });

    return {
      dateKey,
      values: [
        asString(row.id) || asString(row.queue_number),
        formatQueueNumberForDisplay(asString(row.queue_number).toUpperCase()),
        dateKey ? formatDateKey(dateKey) : "-",
        timeRange || "-",
        asString(row.service_name) || asString(row.service_id) || "Layanan LKPP",
        asString(row.unit_short_name) || "Unit layanan LKPP",
        statusLabel,
        asBoolean(row.checked_in) ? "Ya" : "Belum",
        String(asNumber(row.call_count, 0)),
        asString(row.staff_note) || "-",
      ],
    };
  });

  return {
    columns,
    rows: records.map((record) => record.values),
    dateKeys: records.map((record) => record.dateKey).filter(Boolean),
  };
}

function mapAuditRows(logs: AdminActivityLogItem[]) {
  const columns = [
    "ID Log",
    "Waktu",
    "Aktor",
    "Modul",
    "Aksi",
    "Hasil",
    "Ringkasan",
    "Referensi",
  ];
  const records = logs.map((log) => ({
    dateKey: extractDateKey(log.timestamp),
    values: [
      log.id,
      log.timestamp,
      log.actorLabel,
      log.module,
      log.action,
      log.result,
      log.summary || log.details.join(" | ") || "-",
      log.reference || "-",
    ],
  }));

  return {
    columns,
    rows: records.map((record) => record.values),
    dateKeys: records.map((record) => record.dateKey).filter(Boolean),
  };
}

function mapAnnouncementRows(announcements: NormalizedAnnouncementRecord[]) {
  const columns = [
    "ID Pengumuman",
    "Judul",
    "Jenis",
    "Status",
    "Mulai Tayang",
    "Berakhir",
    "Dibuat",
    "Pesan",
  ];
  const records = announcements.map((announcement) => ({
    dateKey: announcement.dateKey,
    values: [
      announcement.id,
      announcement.title,
      announcement.type || "info",
      announcement.lifecycleLabel,
      announcement.startDate || "-",
      announcement.endDate || "-",
      announcement.createdAt || "-",
      announcement.message || "-",
    ],
  }));

  return {
    columns,
    rows: records.map((record) => record.values),
    dateKeys: records.map((record) => record.dateKey).filter(Boolean),
  };
}

export async function readAdminExportWorkspace({
  staffId,
  appUrl,
  startDate,
  endDate,
}: ReadAdminExportWorkspaceInput) {
  const [
    appointmentRows,
    oldestAppointmentRow,
    newestAppointmentRow,
    auditResult,
    rawAnnouncements,
  ] = await Promise.all([
    fetchRestRows<AppointmentExportRow>("v_lkpp_appointments_enriched", [
      [
        "select",
        "id,appointment_date,start_time,end_time,queue_number,status,checked_in,call_count,service_id,service_name,unit_short_name,staff_note",
      ],
      ["appointment_date", `gte.${startDate}`],
      ["appointment_date", `lte.${endDate}`],
      ["order", "appointment_date.desc,start_time.desc"],
    ]),
    fetchRestRows<AppointmentExportRow>("v_lkpp_appointments_enriched", [
      ["select", "appointment_date"],
      ["order", "appointment_date.asc,start_time.asc"],
      ["limit", "1"],
    ]),
    fetchRestRows<AppointmentExportRow>("v_lkpp_appointments_enriched", [
      ["select", "appointment_date"],
      ["order", "appointment_date.desc,start_time.desc"],
      ["limit", "1"],
    ]),
    readAdminActivityLogs({ staffId, appUrl, limit: 0 }),
    fetchAdminAnnouncements(staffId, appUrl),
  ]);

  const allAuditLogs = auditResult.logs;
  const filteredAuditLogs = allAuditLogs.filter((log) =>
    isDateWithinRange(extractDateKey(log.timestamp), startDate, endDate),
  );
  const allAnnouncements = rawAnnouncements
    .map((announcement) => normalizeAnnouncementRecord(announcement))
    .filter((announcement): announcement is NormalizedAnnouncementRecord => announcement !== null);
  const filteredAnnouncements = allAnnouncements.filter((announcement) =>
    isDateWithinRange(announcement.dateKey, startDate, endDate),
  );

  const appointmentsData = mapAppointmentRows(appointmentRows);
  const auditData = mapAuditRows(filteredAuditLogs);
  const announcementData = mapAnnouncementRows(filteredAnnouncements);

  const appointmentLatestDateKey = extractDateKey(
    newestAppointmentRow[0]?.appointment_date,
  );
  const auditLatestDateKey = getMaxDateKey(
    allAuditLogs.map((log) => extractDateKey(log.timestamp)),
  );
  const announcementLatestDateKey = getMaxDateKey(
    allAnnouncements.map((announcement) => announcement.dateKey),
  );

  const availableRange = {
    minDate: getMinDateKey([
      extractDateKey(oldestAppointmentRow[0]?.appointment_date),
      ...allAuditLogs.map((log) => extractDateKey(log.timestamp)),
      ...allAnnouncements.map((announcement) => announcement.dateKey),
    ]),
    maxDate: getMaxDateKey([
      appointmentLatestDateKey,
      ...allAuditLogs.map((log) => extractDateKey(log.timestamp)),
      ...allAnnouncements.map((announcement) => announcement.dateKey),
    ]),
  };
  const fallbackDateKey = availableRange.maxDate || endDate;

  const packages = [
    {
      id: "ED-01",
      title: "Rekap Antrean Harian",
      status:
        appointmentsData.rows.length > 0 ? "Siap" : "Perlu Review",
      note: "Data antrean layanan dari Supabase.",
      scope: "rekap",
      scopeLabel: "Rekap layanan",
      rowCount: appointmentsData.rows.length,
      formats: ["csv", "pdf"],
      dateKey: toPackageDateKey(appointmentLatestDateKey, fallbackDateKey),
      lastUpdatedLabel: formatRelativeDateLabel(
        toPackageDateKey(appointmentLatestDateKey, fallbackDateKey),
      ),
      columns: appointmentsData.columns,
      rows: appointmentsData.rows,
    },
    {
      id: "ED-02",
      title: "Laporan Modul Admin",
      status: filteredAuditLogs.length > 0 ? "Terkirim" : "Perlu Review",
      note: "Aktivitas sistem dan admin dari audit log Supabase.",
      scope: "audit",
      scopeLabel: "Audit sistem",
      rowCount: auditData.rows.length,
      formats: ["csv", "pdf"],
      dateKey: toPackageDateKey(auditLatestDateKey, fallbackDateKey),
      lastUpdatedLabel: formatRelativeDateLabel(
        toPackageDateKey(auditLatestDateKey, fallbackDateKey),
      ),
      columns: auditData.columns,
      rows: auditData.rows,
    },
    {
      id: "ED-03",
      title: "Rekap Pengumuman",
      status:
        filteredAnnouncements.some(
          (announcement) => announcement.lifecycleLabel !== "Tayang",
        ) || filteredAnnouncements.length === 0
          ? "Perlu Review"
          : "Siap",
      note: "Status publikasi pengumuman dari Supabase.",
      scope: "publik",
      scopeLabel: "Komunikasi publik",
      rowCount: announcementData.rows.length,
      formats: ["csv", "pdf"],
      dateKey: toPackageDateKey(announcementLatestDateKey, fallbackDateKey),
      lastUpdatedLabel: formatRelativeDateLabel(
        toPackageDateKey(announcementLatestDateKey, fallbackDateKey),
      ),
      columns: announcementData.columns,
      rows: announcementData.rows,
    },
  ] satisfies AdminExportWorkspacePackage[];

  return {
    generatedAt: new Date().toISOString(),
    availableRange,
    packages,
  };
}
