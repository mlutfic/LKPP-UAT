import nodemailer from "nodemailer";

import { getBookingServiceById } from "@/content/service-booking-content";
import {
  AUTO_COMPLETE_PERSISTED_APPOINTMENT_STATUS_VALUES,
  getJakartaTodayDateKey,
} from "@/lib/appointment-auto-close";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";
import { resolvePublicBaseUrl } from "@/lib/server/public-base-url";
import { getLegacyStaffDirectory } from "@/lib/server/local-auth-bridge";
import { buildUnitCounterId } from "@/lib/server/unit-counter-storage";

type AppointmentWarningRow = {
  id?: string | null;
  appointment_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  queue_number?: string | null;
  status?: string | null;
  checked_in?: boolean | null;
  service_id?: string | null;
  service_name?: string | null;
  unit_id?: string | null;
  unit_short_name?: string | null;
  counter_id?: number | string | null;
};

type KvRow = {
  key?: string | null;
  value?: unknown;
};

type AppointmentAutoCloseWarningState = {
  kind: "appointment-staff-closing-reminder";
  appointmentId: string;
  recipientEmails: string[];
  appointmentDate: string;
  sentAt: string;
};

type StaffRecipient = {
  staffId: string;
  name: string;
  email: string;
};

export type AppointmentAutoCloseWarningSummary = {
  todayKey: string;
  currentHourWib: number;
  warningWindowOpen: boolean;
  skippedOutsideWindow: boolean;
  matchedCount: number;
  alreadySentCount: number;
  missingEmailCount: number;
  sentCount: number;
  failedCount: number;
};

const APPOINTMENT_WARNING_SELECT =
  "id,appointment_date,start_time,end_time,queue_number,status,checked_in,service_id,service_name,unit_id,unit_short_name,counter_id";
const STAFF_REMINDER_STATUS_FILTER = `in.(${AUTO_COMPLETE_PERSISTED_APPOINTMENT_STATUS_VALUES.join(",")})`;
const APPOINTMENT_WARNING_HOUR_WIB = 23;
const APPOINTMENT_WARNING_KEY_PREFIX = "appointment:staff-closing-reminder:";
const APPOINTMENT_WARNING_THROTTLE_MS = 30_000;

let lastWarningSummary: AppointmentAutoCloseWarningSummary | null = null;
let lastWarningAt = 0;
let inFlightWarningPromise: Promise<AppointmentAutoCloseWarningSummary> | null = null;
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

function getSupabaseServerConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    throw new Error("Konfigurasi server warning auto-close belum lengkap.");
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

async function fetchRestRows<T>(path: string, params?: Record<string, string>) {
  const response = await fetch(buildRestUrl(path, params), {
    method: "GET",
    headers: buildRestHeaders(),
    cache: "no-store",
  });

  const rows = (await response.json().catch(() => [])) as T[];
  if (!response.ok) {
    const message =
      typeof rows === "object" && rows && !Array.isArray(rows)
        ? JSON.stringify(rows)
        : String(response.status);
    throw new Error(`Gagal membaca data warning auto-close: ${message}`);
  }

  return Array.isArray(rows) ? rows : [];
}

async function upsertKvRow(key: string, value: unknown) {
  const response = await fetch(
    buildRestUrl("kv_store_f08d97a1", { on_conflict: "key" }),
    {
      method: "POST",
      headers: {
        ...buildRestHeaders(),
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ key, value }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Gagal menyimpan jejak warning auto-close.");
  }
}

async function getKvRow(key: string) {
  const rows = await fetchRestRows<KvRow>("kv_store_f08d97a1", {
    select: "key,value",
    key: `eq.${key}`,
    limit: "1",
  });

  return rows[0] ?? null;
}

function getStablePublicEmailBaseUrl() {
  return resolvePublicBaseUrl();
}

function buildPublicUrl(pathname: string) {
  return new URL(pathname, `${getStablePublicEmailBaseUrl()}/`).toString();
}

function buildSmtpTransport() {
  if (smtpTransport) {
    return smtpTransport;
  }

  const serverEnv = getServerEnv();
  if (
    !serverEnv.brevoSmtpHost ||
    !serverEnv.brevoSmtpPort ||
    !serverEnv.brevoSmtpUser ||
    !serverEnv.brevoSmtpPass ||
    !serverEnv.smtpFromEmail
  ) {
    throw new Error("Konfigurasi email warning auto-close belum lengkap.");
  }

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

function buildAppointmentWarningKey(appointmentId: string) {
  return `${APPOINTMENT_WARNING_KEY_PREFIX}${appointmentId}`;
}

function getJakartaCurrentHour() {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    hour12: false,
  });
  const hourValue = formatter.format(new Date());
  const parsedHour = Number.parseInt(hourValue, 10);
  return Number.isFinite(parsedHour) ? parsedHour : -1;
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

function resolveServiceTitle(row: AppointmentWarningRow) {
  const serviceId = asString(row.service_id).toUpperCase();
  const service = getBookingServiceById(serviceId);
  return service?.title || asString(row.service_name) || serviceId || "Layanan LKPP";
}

function resolveUnitLabel(row: AppointmentWarningRow) {
  const serviceId = asString(row.service_id).toUpperCase();
  const service = getBookingServiceById(serviceId);
  return service?.unitLabel || asString(row.unit_short_name) || "unit layanan LKPP";
}

function buildWarningEmailMessage(
  row: AppointmentWarningRow,
  recipientName: string,
) {
  const queueNumberRaw = asString(row.queue_number).toUpperCase();
  const queueNumber = formatQueueNumberForDisplay(queueNumberRaw) || queueNumberRaw || "-";
  const serviceTitle = resolveServiceTitle(row);
  const unitLabel = resolveUnitLabel(row);
  const dateLabel = formatAppointmentDateLabel(asString(row.appointment_date));
  const timeRange = formatAppointmentTimeRange(
    asString(row.start_time),
    asString(row.end_time),
  );
  const actionUrl = buildPublicUrl("/login/petugas");
  const title = `Peringatan penutupan otomatis antrean ${queueNumber}`;
  const introLines = [
    `Antrean ${queueNumber} untuk ${serviceTitle} di ${unitLabel} pada ${dateLabel}${timeRange ? ` pukul ${timeRange}` : ""} sudah masuk status dilayani tetapi belum ditutup.`,
    "Jika layanan sudah selesai, silakan masuk sebagai petugas dan lakukan closing sebelum pukul 00.00 WIB.",
    "Reminder ini dikirim agar antrean yang sudah dilayani tidak tertinggal dalam status aktif saat hari berganti.",
  ];
  const outroLines = [
    "Email ini dikirim ke login petugas yang terhubung dengan loket atau layanan terkait.",
    "Jika antrean sudah ditutup sebelum pesan ini dibuka, abaikan reminder ini.",
  ];
  const introHtml = introLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const outroHtml = outroLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const safeName = escapeHtml(recipientName || "Petugas LKPP");
  const safeButtonLabel = "Masuk Petugas";
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <p>Halo <strong>${safeName}</strong>,</p>
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
          ${safeButtonLabel}
        </a>
      </p>
      <p>Jika tombol tidak terbuka, gunakan tautan berikut:</p>
      <p><a href="${escapeHtml(actionUrl)}">${escapeHtml(actionUrl)}</a></p>
      ${outroHtml}
      <p>Salam,<br />Portal Antrean LKPP</p>
    </div>
  `;
  const text = [
    `Halo ${recipientName || "Petugas LKPP"},`,
    "",
    ...introLines,
    "",
    "Ringkasan antrean:",
    `Nomor antrean: ${queueNumber}`,
    `Layanan: ${serviceTitle}`,
    `Jadwal: ${dateLabel}${timeRange ? `, ${timeRange}` : ""}`,
    "",
    `${safeButtonLabel}:`,
    actionUrl,
    "",
    ...outroLines,
    "",
    "Salam,",
    "Portal Antrean LKPP",
  ].join("\n");

  return {
    subject: title,
    html,
    text,
  };
}

async function resolveStaffRecipientsByAppointment(appointments: AppointmentWarningRow[]) {
  const staffDirectory = await getLegacyStaffDirectory();
  const recipientsByCounterId = new Map<string, StaffRecipient[]>();
  const recipientsByServiceId = new Map<string, StaffRecipient[]>();

  for (const staff of staffDirectory) {
    if (!staff.active) {
      continue;
    }

    const recipientEmail = normalizeEmail(staff.loginName);
    if (!isValidEmail(recipientEmail)) {
      continue;
    }

    const recipient = {
      staffId: staff.id,
      name: asString(staff.name) || "Petugas LKPP",
      email: recipientEmail,
    } satisfies StaffRecipient;

    for (const counterId of staff.counterIds) {
      const normalizedCounterId = asString(counterId).toUpperCase();
      if (!normalizedCounterId) {
        continue;
      }

      if (!recipientsByCounterId.has(normalizedCounterId)) {
        recipientsByCounterId.set(normalizedCounterId, []);
      }

      recipientsByCounterId.get(normalizedCounterId)?.push(recipient);
    }

    for (const serviceId of staff.serviceIds) {
      const normalizedServiceId = asString(serviceId).toUpperCase();
      if (!normalizedServiceId) {
        continue;
      }

      if (!recipientsByServiceId.has(normalizedServiceId)) {
        recipientsByServiceId.set(normalizedServiceId, []);
      }

      recipientsByServiceId.get(normalizedServiceId)?.push(recipient);
    }
  }

  const result = new Map<string, StaffRecipient[]>();

  for (const appointment of appointments) {
    const appointmentId = asString(appointment.id);
    if (!appointmentId) {
      continue;
    }

    const unitId = asString(appointment.unit_id).toUpperCase();
    const serviceId = asString(appointment.service_id).toUpperCase();
    const counterNumberRaw = asString(appointment.counter_id);
    const counterNumber = Number.parseInt(counterNumberRaw, 10);
    const resolvedCounterId =
      unitId && Number.isFinite(counterNumber) && counterNumber > 0
        ? buildUnitCounterId(unitId, counterNumber)
        : "";

    const staffRecipients =
      (resolvedCounterId ? recipientsByCounterId.get(resolvedCounterId) : undefined) ||
      (serviceId ? recipientsByServiceId.get(serviceId) : undefined) ||
      [];

    result.set(
      appointmentId,
      Array.from(
        new Map(staffRecipients.map((recipient) => [recipient.email, recipient] as const)).values(),
      ),
    );
  }

  return result;
}

async function runAppointmentAutoCloseWarnings(force: boolean) {
  const todayKey = getJakartaTodayDateKey();
  const currentHourWib = getJakartaCurrentHour();
  const warningWindowOpen = currentHourWib === APPOINTMENT_WARNING_HOUR_WIB;

  const baseSummary = {
    todayKey,
    currentHourWib,
    warningWindowOpen,
    skippedOutsideWindow: !force && !warningWindowOpen,
    matchedCount: 0,
    alreadySentCount: 0,
    missingEmailCount: 0,
    sentCount: 0,
    failedCount: 0,
  } satisfies AppointmentAutoCloseWarningSummary;

  if (!force && !warningWindowOpen) {
    return baseSummary;
  }

  const appointments = await fetchRestRows<AppointmentWarningRow>(
    "v_lkpp_appointments_enriched",
    {
      select: APPOINTMENT_WARNING_SELECT,
      appointment_date: `eq.${todayKey}`,
      checked_in: "is.true",
      status: STAFF_REMINDER_STATUS_FILTER,
      order: "start_time.asc,queue_number.asc",
      limit: "5000",
    },
  );
  const recipientsByAppointmentId = await resolveStaffRecipientsByAppointment(appointments);

  const summary = {
    ...baseSummary,
    matchedCount: appointments.length,
  };

  for (const appointment of appointments) {
    const appointmentId = asString(appointment.id);
    if (!appointmentId) {
      continue;
    }

    const warningKey = buildAppointmentWarningKey(appointmentId);
    const existingWarning = await getKvRow(warningKey);
    if (existingWarning) {
      summary.alreadySentCount += 1;
      continue;
    }

    const recipients = recipientsByAppointmentId.get(appointmentId) ?? [];
    if (recipients.length < 1) {
      summary.missingEmailCount += 1;
      console.warn(
        "[auto-close-warning] skip missing email",
        JSON.stringify({
          appointmentId,
          appointmentDate: asString(appointment.appointment_date),
        }),
      );
      continue;
    }

    let sentAny = false;

    try {
      for (const recipient of recipients) {
        const message = buildWarningEmailMessage(appointment, recipient.name);
        await sendEmail({
          to: recipient.email,
          subject: message.subject,
          text: message.text,
          html: message.html,
        });
        sentAny = true;
      }

      if (sentAny) {
        await upsertKvRow(warningKey, {
          kind: "appointment-staff-closing-reminder",
          appointmentId,
          recipientEmails: recipients.map((recipient) => recipient.email),
          appointmentDate: asString(appointment.appointment_date),
          sentAt: new Date().toISOString(),
        } satisfies AppointmentAutoCloseWarningState);

        summary.sentCount += 1;
      }
    } catch (error) {
      summary.failedCount += 1;
      console.error(
        "[auto-close-warning] send failed",
        JSON.stringify({
          appointmentId,
          emails: recipients.map((recipient) => recipient.email),
          error: error instanceof Error ? error.message : String(error ?? ""),
        }),
      );
    }
  }

  return summary;
}

export async function ensureAppointmentAutoCloseWarningsSent(options?: {
  force?: boolean;
}) {
  const force = options?.force === true;
  const now = Date.now();

  if (inFlightWarningPromise) {
    return inFlightWarningPromise;
  }

  if (
    !force &&
    lastWarningSummary &&
    now - lastWarningAt < APPOINTMENT_WARNING_THROTTLE_MS
  ) {
    return lastWarningSummary;
  }

  const task = runAppointmentAutoCloseWarnings(force)
    .then((summary) => {
      lastWarningSummary = summary;
      lastWarningAt = Date.now();
      return summary;
    })
    .finally(() => {
      if (inFlightWarningPromise === task) {
        inFlightWarningPromise = null;
      }
    });

  inFlightWarningPromise = task;
  return task;
}
