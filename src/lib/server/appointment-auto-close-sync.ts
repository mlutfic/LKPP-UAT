import nodemailer from "nodemailer";

import { getBookingServiceById } from "@/content/service-booking-content";
import {
  ACTIVE_PERSISTED_APPOINTMENT_STATUS_VALUES,
  APPOINTMENT_AUTO_COMPLETED_NOTE,
  APPOINTMENT_UNPROCESSED_NOTE,
  AUTO_CANCEL_PERSISTED_APPOINTMENT_STATUS_VALUES,
  AUTO_COMPLETE_PERSISTED_APPOINTMENT_STATUS_VALUES,
  appendAppointmentAutoCloseNote,
  appendAppointmentAutoCompletedNote,
  getJakartaTodayDateKey,
} from "@/lib/appointment-auto-close";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";

type AutoCloseAppointmentRow = {
  id?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  queue_number?: string | null;
  status?: string | null;
  appointment_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  service_id?: string | null;
  service_name?: string | null;
  unit_short_name?: string | null;
  staff_note?: string | null;
  counter_id?: number | string | null;
  auto_cancelled?: boolean | null;
  checked_in?: boolean | null;
};

type AppointmentPatchRow = {
  id?: string | null;
  queue_number?: string | null;
  status?: string | null;
  appointment_date?: string | null;
  staff_note?: string | null;
  counter_id?: number | string | null;
  auto_cancelled?: boolean | null;
};

type AppointmentAutoCloseSummary = {
  todayKey: string;
  matchedCount: number;
  updatedCount: number;
};

const STABLE_UAT_PUBLIC_URL = "https://lkpp-antrean-uat.vercel.app";
const APPOINTMENT_FETCH_SELECT =
  "id,user_id,user_email,queue_number,status,appointment_date,start_time,end_time,service_id,service_name,unit_short_name,staff_note,counter_id,auto_cancelled,checked_in";
const APPOINTMENT_PATCH_SELECT =
  "id,queue_number,status,appointment_date,staff_note,counter_id,auto_cancelled";
const ACTIVE_STATUS_FILTER = `in.(${ACTIVE_PERSISTED_APPOINTMENT_STATUS_VALUES.join(",")})`;
const AUTO_CANCEL_STATUS_FILTER = `in.(${AUTO_CANCEL_PERSISTED_APPOINTMENT_STATUS_VALUES.join(",")})`;
const AUTO_COMPLETE_STATUS_FILTER = `in.(${AUTO_COMPLETE_PERSISTED_APPOINTMENT_STATUS_VALUES.join(",")})`;
const AUTO_CLOSE_THROTTLE_MS = 30_000;

let lastAutoCloseSummary: AppointmentAutoCloseSummary | null = null;
let lastAutoCloseAt = 0;
let inFlightAutoClosePromise: Promise<AppointmentAutoCloseSummary> | null = null;
let smtpTransport: ReturnType<typeof nodemailer.createTransport> | null = null;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return asString(value).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function isAppointmentStatusEnumError(error: unknown, statusValue: string) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("invalid input value for enum lkpp_appointment_status") &&
    error.message.includes(statusValue)
  );
}

function getSupabaseServerConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    throw new Error("Konfigurasi Supabase server untuk sinkron status antrean belum lengkap.");
  }

  return {
    supabaseUrl: publicEnv.supabaseUrl,
    serviceRoleKey: serverEnv.serviceRoleKey,
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

function canSendAutoCloseEmails() {
  const serverEnv = getServerEnv();

  return Boolean(
    serverEnv.brevoSmtpHost &&
      serverEnv.brevoSmtpPort &&
      serverEnv.brevoSmtpUser &&
      serverEnv.brevoSmtpPass &&
      serverEnv.smtpFromEmail,
  );
}

function getStablePublicEmailBaseUrl() {
  const appUrl = String(getPublicEnv().appUrl || "").trim().replace(/\/$/, "");

  if (!appUrl) {
    return STABLE_UAT_PUBLIC_URL;
  }

  if (
    /(?:^https?:\/\/)?(?:[^/]+\.)?vercel\.app$/i.test(appUrl) ||
    /pages\.dev$/i.test(appUrl)
  ) {
    return STABLE_UAT_PUBLIC_URL;
  }

  return appUrl;
}

function buildPublicUrl(pathname: string) {
  return new URL(pathname, `${getStablePublicEmailBaseUrl()}/`).toString();
}

function buildSmtpTransport() {
  if (smtpTransport) {
    return smtpTransport;
  }

  const serverEnv = getServerEnv();
  smtpTransport = nodemailer.createTransport({
    host: serverEnv.brevoSmtpHost,
    port: Number(serverEnv.brevoSmtpPort),
    secure: Number(serverEnv.brevoSmtpPort) === 465,
    auth: {
      user: serverEnv.brevoSmtpUser,
      pass: serverEnv.brevoSmtpPass,
    },
  });

  return smtpTransport;
}

async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const serverEnv = getServerEnv();
  const transporter = buildSmtpTransport();

  await transporter.sendMail({
    from: `${serverEnv.smtpFromName || "LKPP Antrean"} <${serverEnv.smtpFromEmail}>`,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  });
}

function formatAppointmentDateLabel(dateKey: string) {
  if (!dateKey) {
    return "hari ini";
  }

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateKey}T00:00:00+07:00`));
}

function formatAppointmentTimeRange(startTime: string, endTime: string) {
  if (startTime && endTime) {
    return `${startTime} - ${endTime} WIB`;
  }
  if (startTime) {
    return `${startTime} WIB`;
  }
  return "";
}

function resolveServiceTitle(row: AutoCloseAppointmentRow) {
  const serviceId = asString(row.service_id).toUpperCase();
  const service = getBookingServiceById(serviceId);
  return service?.title || asString(row.service_name) || serviceId || "Layanan LKPP";
}

function resolveUnitLabel(row: AutoCloseAppointmentRow) {
  const serviceId = asString(row.service_id).toUpperCase();
  const service = getBookingServiceById(serviceId);
  return service?.unitLabel || asString(row.unit_short_name) || "unit layanan LKPP";
}

function buildUserAutoCancelledEmailMessage(row: AutoCloseAppointmentRow) {
  const appointmentId = asString(row.id);
  const queueNumberRaw = asString(row.queue_number).toUpperCase();
  const queueNumber =
    formatQueueNumberForDisplay(queueNumberRaw) || queueNumberRaw || appointmentId;
  const serviceTitle = resolveServiceTitle(row);
  const unitLabel = resolveUnitLabel(row);
  const dateLabel = formatAppointmentDateLabel(asString(row.appointment_date));
  const timeRange = formatAppointmentTimeRange(
    asString(row.start_time),
    asString(row.end_time),
  );
  const actionUrl = buildPublicUrl("/login");
  const buttonLabel = "Masuk Pengguna";
  const introLines = [
    `Antrean Anda untuk ${serviceTitle} di ${unitLabel} pada ${dateLabel}${timeRange ? ` pukul ${timeRange}` : ""} ditutup otomatis karena belum masuk proses layanan sampai hari berganti.`,
    "Silakan masuk kembali untuk melihat status antrean atau mengambil jadwal baru bila masih diperlukan.",
  ];
  const introHtml = introLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <p>Halo <strong>Pengguna LKPP</strong>,</p>
      ${introHtml}
      <p style="margin:20px 0 8px"><strong>Ringkasan antrean:</strong></p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:520px;border-collapse:collapse">
        <tr>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;background:#f8fafc;width:160px"><strong>Nomor antrean</strong></td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb">${escapeHtml(queueNumber)}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;background:#f8fafc"><strong>Layanan</strong></td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb">${escapeHtml(serviceTitle)}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;background:#f8fafc"><strong>Jadwal</strong></td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb">${escapeHtml(dateLabel)}${timeRange ? `<br />${escapeHtml(timeRange)}` : ""}</td>
        </tr>
      </table>
      <p style="margin:24px 0">
        <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#b3261e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">
          ${buttonLabel}
        </a>
      </p>
      <p>Jika tombol tidak terbuka, gunakan tautan berikut:</p>
      <p><a href="${escapeHtml(actionUrl)}">${escapeHtml(actionUrl)}</a></p>
      <p>Salam,<br />Portal Antrean LKPP</p>
    </div>
  `;
  const text = [
    "Halo Pengguna LKPP,",
    "",
    ...introLines,
    "",
    "Ringkasan antrean:",
    `Nomor antrean: ${queueNumber}`,
    `Layanan: ${serviceTitle}`,
    `Jadwal: ${dateLabel}${timeRange ? `, ${timeRange}` : ""}`,
    "",
    `${buttonLabel}:`,
    actionUrl,
    "",
    "Salam,",
    "Portal Antrean LKPP",
  ].join("\n");

  return {
    subject: `Antrean ${queueNumber} ditutup otomatis`,
    html,
    text,
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
    throw new Error(body || `HTTP ${response.status}`);
  }

  return (await response.json()) as T[];
}

async function patchAppointmentRow(
  appointmentId: string,
  statusFilter: string,
  payload: Partial<AutoCloseAppointmentRow>,
) {
  const response = await fetch(
    buildRestUrl("lkpp_appointments", {
      id: `eq.${appointmentId}`,
      status: statusFilter,
      select: APPOINTMENT_PATCH_SELECT,
    }),
    {
      method: "PATCH",
      headers: {
        ...buildRestHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  const rows = (await response.json().catch(() => [])) as AppointmentPatchRow[];
  if (!response.ok) {
    const message =
      typeof rows === "object" && rows && !Array.isArray(rows)
        ? JSON.stringify(rows)
        : String(response.status);
    throw new Error(message);
  }

  return Array.isArray(rows) ? rows : [];
}

async function maybeNotifyUserAutoClosed(appointment: AutoCloseAppointmentRow) {
  if (!canSendAutoCloseEmails()) {
    return;
  }

  const recipientEmail = normalizeEmail(appointment.user_email);
  if (!isValidEmail(recipientEmail)) {
    return;
  }

  const message = buildUserAutoCancelledEmailMessage(appointment);

  try {
    await sendEmail({
      to: recipientEmail,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } catch (error) {
    console.warn(
      "[auto-close-sync] failed to send user cancellation email",
      JSON.stringify({
        appointmentId: asString(appointment.id),
        recipientEmail,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

async function runAppointmentAutoClose(todayKey: string) {
  const expiredAppointments = await fetchRestRows<AutoCloseAppointmentRow>(
    "v_lkpp_appointments_enriched",
    {
      select: APPOINTMENT_FETCH_SELECT,
      appointment_date: `lt.${todayKey}`,
      status: ACTIVE_STATUS_FILTER,
      order: "appointment_date.asc,queue_number.asc",
      limit: "5000",
    },
  );

  const autoCancelStatuses = new Set<string>(AUTO_CANCEL_PERSISTED_APPOINTMENT_STATUS_VALUES);
  const autoCompleteStatuses = new Set<string>(AUTO_COMPLETE_PERSISTED_APPOINTMENT_STATUS_VALUES);
  let updatedCount = 0;

  for (const appointment of expiredAppointments) {
    const appointmentId = asString(appointment.id);
    const currentStatus = asString(appointment.status).toLowerCase();

    if (!appointmentId || !currentStatus) {
      continue;
    }

    if (autoCompleteStatuses.has(currentStatus)) {
      const nextNote = appendAppointmentAutoCompletedNote(asString(appointment.staff_note));
      const updatedRows = await patchAppointmentRow(
        appointmentId,
        AUTO_COMPLETE_STATUS_FILTER,
        {
          status: "completed",
          auto_cancelled: false,
          checked_in: true,
          staff_note: nextNote || APPOINTMENT_AUTO_COMPLETED_NOTE,
        },
      );

      if (updatedRows.length > 0) {
        updatedCount += 1;
      }
      continue;
    }

    if (!autoCancelStatuses.has(currentStatus)) {
      continue;
    }

    const nextNote = appendAppointmentAutoCloseNote(asString(appointment.staff_note));
    let updatedRows: AppointmentPatchRow[] = [];

    try {
      updatedRows = await patchAppointmentRow(appointmentId, AUTO_CANCEL_STATUS_FILTER, {
        status: "unprocessed",
        auto_cancelled: true,
        counter_id: null,
        staff_note: nextNote || APPOINTMENT_UNPROCESSED_NOTE,
      });
    } catch (error) {
      if (!isAppointmentStatusEnumError(error, "unprocessed")) {
        throw error;
      }

      updatedRows = await patchAppointmentRow(appointmentId, AUTO_CANCEL_STATUS_FILTER, {
        status: "cancelled",
        auto_cancelled: true,
        counter_id: null,
        staff_note: nextNote || APPOINTMENT_UNPROCESSED_NOTE,
      });
    }

    if (updatedRows.length > 0) {
      updatedCount += 1;
      await maybeNotifyUserAutoClosed(appointment);
    }
  }

  return {
    todayKey,
    matchedCount: expiredAppointments.length,
    updatedCount,
  } satisfies AppointmentAutoCloseSummary;
}

export async function ensureExpiredAppointmentsAutoClosed(options?: {
  force?: boolean;
}) {
  const todayKey = getJakartaTodayDateKey();
  const force = options?.force === true;
  const now = Date.now();

  if (inFlightAutoClosePromise) {
    return inFlightAutoClosePromise;
  }

  if (
    !force &&
    lastAutoCloseSummary?.todayKey === todayKey &&
    now - lastAutoCloseAt < AUTO_CLOSE_THROTTLE_MS
  ) {
    return lastAutoCloseSummary;
  }

  const task = runAppointmentAutoClose(todayKey)
    .then((summary) => {
      lastAutoCloseSummary = summary;
      lastAutoCloseAt = Date.now();
      return summary;
    })
    .finally(() => {
      if (inFlightAutoClosePromise === task) {
        inFlightAutoClosePromise = null;
      }
    });

  inFlightAutoClosePromise = task;
  return task;
}
