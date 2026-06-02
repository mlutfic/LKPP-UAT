import { getPublicEnv, getServerEnv } from "@/lib/env";
import {
  getStaffResetAccessState,
  listStaffResetAccessStatesByStaffIds,
} from "@/lib/server/staff-reset-access";
import {
  listStaffCounterAssignmentsByStaffIds,
  listUnitCounters,
} from "@/lib/server/unit-counter-storage";

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

type UserRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  pin_code?: string | null;
  asal_instansi?: string | null;
  nama_instansi?: string | null;
  nik?: string | null;
  provinsi?: string | null;
  kabupaten_kota?: string | null;
  auth_user_id?: string | null;
  email_verified?: boolean | null;
  phone_verified?: boolean | null;
  verified_at?: string | null;
  photo_url?: string | null;
};

type StaffRow = {
  id: string;
  name?: string | null;
  login_name?: string | null;
  pin_code?: string | null;
  role?: string | null;
  unit_id?: string | null;
  unor_id?: string | null;
  is_active?: boolean | null;
  photo_url?: string | null;
};

type StaffAssignmentRow = {
  staff_id?: string | null;
  service_id?: string | null;
};

type StaffScheduleRow = {
  staff_id?: string | null;
  day_of_week?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  is_off?: boolean | null;
};

type UnitRow = {
  id?: string | null;
  name?: string | null;
  short_name?: string | null;
};

export type LegacyStaffDirectoryItem = {
  id: string;
  name: string;
  loginName: string;
  role: string;
  unitId: string;
  unitName: string;
  active: boolean;
  mustChangePassword: boolean;
  assignedServiceCount: number;
  serviceIds: string[];
  counterIds: string[];
  counterLabels: string[];
};

export type LegacyUnitStaffDirectoryItem = LegacyStaffDirectoryItem & {
  roleLabel: string;
  scheduledToday: boolean;
  hasSchedule: boolean;
  todayShiftLabel: string | null;
};

function getSupabaseRestHeaders() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey || !serverEnv.serviceRoleKey) {
    throw new Error("Konfigurasi Supabase server lokal belum lengkap.");
  }

  return {
    supabaseUrl: publicEnv.supabaseUrl,
    anonKey: publicEnv.supabaseAnonKey,
    serviceRoleKey: serverEnv.serviceRoleKey,
  };
}

function buildRestUrl(path: string, params?: Record<string, string>) {
  const { supabaseUrl } = getSupabaseRestHeaders();
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

async function fetchRestRows<T>(path: string, params?: Record<string, string>) {
  const { serviceRoleKey } = getSupabaseRestHeaders();
  const response = await fetch(buildRestUrl(path, params), {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gagal membaca data auth legacy: ${text || response.status}`);
  }

  return (await response.json()) as T[];
}

async function verifySupabaseAuthPassword(email: string, password: string): Promise<{
  ok: boolean;
  code?: string;
  error?: string;
}> {
  const { supabaseUrl, anonKey } = getSupabaseRestHeaders();
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    code: String(payload.error_code || payload.code || payload.error || "").trim() || undefined,
    error:
      String(
        payload.msg || payload.message || payload.error_description || payload.error || "",
      ).trim() || undefined,
  };
}

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function getJakartaDayOfWeek() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "00";

  return new Date(
    `${getPart("year")}-${getPart("month")}-${getPart("day")}T00:00:00+07:00`,
  ).getDay();
}

function formatClock(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  return raw.slice(0, 5);
}

function getLegacyStaffRoleLabel(role: string, unitId?: string | null) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  switch (normalized) {
    case "resepsionis":
      return "Resepsionis";
    case "akun_unit":
    case "unor":
      return "Unit Organisasi";
    case "petugas_level2":
    case "petugas_level_2":
    case "level2":
    case "level_2":
      return "Petugas Level 2";
    case "supervisor":
    case "supervisor_unit":
      return unitId ? "Supervisor Monitoring" : "Humas Monitoring";
    case "humas_monitoring":
      return "Humas Monitoring";
    case "humas_admin":
    case "superadmin":
      return "Humas Admin";
    default:
      return "Petugas";
  }
}

export function isLocalAuthBridgeRequest(request: Request) {
  try {
    const url = new URL(request.url);
    if (LOCAL_DEV_HOSTS.has(url.hostname)) return true;
  } catch {
    // Ignore malformed request url.
  }

  const host = String(request.headers.get("host") || "").trim().split(":")[0];
  if (LOCAL_DEV_HOSTS.has(host)) return true;

  for (const headerName of ["origin", "referer"]) {
    const raw = request.headers.get(headerName);
    if (!raw) continue;
    try {
      const url = new URL(raw);
      if (LOCAL_DEV_HOSTS.has(url.hostname)) return true;
    } catch {
      // Ignore malformed header.
    }
  }

  return false;
}

export async function loginLegacyUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password || "");

  if (!normalizedEmail || !normalizedPassword) {
    return { ok: false as const, status: 400, error: "Email dan kata sandi wajib diisi" };
  }

  const users = await fetchRestRows<UserRow>("lkpp_users", {
    select: "*",
    email: `eq.${normalizedEmail}`,
    limit: "2",
  });

  if (users.length > 1) {
    return {
      ok: false as const,
      status: 409,
      error: "Terdapat duplikasi email pada data pengguna. Hubungi admin LKPP.",
    };
  }

  const user = users[0];
  if (!user) {
    return { ok: false as const, status: 401, error: "Kredensial tidak valid" };
  }

  let passwordMatched = String(user.pin_code || "") === normalizedPassword;
  if (!passwordMatched) {
    const authPasswordCheck = await verifySupabaseAuthPassword(
      normalizedEmail,
      normalizedPassword,
    );
    if (authPasswordCheck.ok) {
      passwordMatched = true;
    } else if (
      authPasswordCheck.code === "email_not_confirmed" ||
      /email[^a-z0-9]*not[^a-z0-9]*confirmed/i.test(String(authPasswordCheck.error || ""))
    ) {
      return {
        ok: false as const,
        status: 403,
        error: "Email akun belum dikonfirmasi. Buka email Anda lalu klik tautan konfirmasi terlebih dahulu.",
      };
    }
  }

  if (!passwordMatched) {
    return { ok: false as const, status: 401, error: "Kredensial tidak valid" };
  }

  return {
    ok: true as const,
    status: 200,
    user: {
      id: user.id,
      name: String(user.name || "").trim(),
      email: normalizedEmail,
      phone: String(user.phone || "").trim(),
      asalInstansi: String(user.asal_instansi || "").trim(),
      namaInstansi: String(user.nama_instansi || "").trim(),
      nik: String(user.nik || "").trim(),
      provinsi: String(user.provinsi || "").trim(),
      kabupatenKota: String(user.kabupaten_kota || "").trim(),
      authUserId: String(user.auth_user_id || "").trim() || null,
      emailVerified: Boolean(user.email_verified),
      phoneVerified: Boolean(user.phone_verified),
      verifiedAt: user.verified_at || null,
      photoUrl: String(user.photo_url || "").trim() || null,
    },
  };
}

export async function loginLegacyStaff(login: string, password: string) {
  const normalizedName = String(login || "").trim();
  const normalizedLoginName = normalizedName.toLowerCase();
  const normalizedPassword = String(password || "");

  if (!normalizedName || !normalizedPassword) {
    return { ok: false as const, status: 400, error: "Login dan kata sandi wajib diisi" };
  }

  let staffRows = await fetchRestRows<StaffRow>("lkpp_staff", {
    select: "*",
    login_name: `eq.${normalizedLoginName}`,
    limit: "2",
  });

  if (!staffRows.length) {
    staffRows = await fetchRestRows<StaffRow>("lkpp_staff", {
      select: "*",
      name: `ilike.${normalizedName}`,
      limit: "2",
    });
  }

  const staff = staffRows[0];
  if (staff && staff.is_active === false) {
    return {
      ok: false as const,
      status: 403,
      error: "Login ini sedang dinonaktifkan oleh Humas Admin",
    };
  }

  if (!staff || String(staff.pin_code || "") !== normalizedPassword) {
    return { ok: false as const, status: 401, error: "Kredensial tidak valid" };
  }

  const mustChangePin = await getStaffResetAccessState(staff.id);

  return {
    ok: true as const,
    status: 200,
    staff: {
      id: staff.id,
      name: String(staff.name || "").trim() || normalizedName,
      loginName: String(staff.login_name || "").trim() || normalizedLoginName,
      role: String(staff.role || "").trim(),
      unorId: String(staff.unit_id || staff.unor_id || "").trim() || null,
      isActive: staff.is_active !== false,
      mustChangePin,
      photoUrl: String(staff.photo_url || "").trim() || null,
    },
  };
}

export async function getLegacyStaffDirectory() {
  const [staffRows, assignmentRows, unitRows] = await Promise.all([
    fetchRestRows<StaffRow>("lkpp_staff", {
      select: "id,name,login_name,role,unit_id,is_active",
      order: "name.asc",
    }),
    fetchRestRows<StaffAssignmentRow>("lkpp_staff_service_assignments", {
      select: "staff_id,service_id",
    }),
    fetchRestRows<UnitRow>("lkpp_units", {
      select: "id,name,short_name",
      order: "name.asc",
    }),
  ]);
  const resetAccessByStaffId = await listStaffResetAccessStatesByStaffIds(
    staffRows.map((row) => String(row.id || "").trim()),
  );
  let allCounters: Awaited<ReturnType<typeof listUnitCounters>> = [];
  let counterAssignmentsByStaffId = new Map<string, string[]>();
  try {
    [allCounters, counterAssignmentsByStaffId] = await Promise.all([
      listUnitCounters(),
      listStaffCounterAssignmentsByStaffIds(
        staffRows.map((row) => String(row.id || "").trim()),
      ),
    ]);
  } catch {
    allCounters = [];
    counterAssignmentsByStaffId = new Map<string, string[]>();
  }
  const counterById = new Map(allCounters.map((counter) => [counter.id, counter]));

  const unitNameById = new Map(
    unitRows.map((row) => [
      String(row.id || "").trim(),
      String(row.name || row.short_name || "").trim(),
    ]),
  );

  const assignedServiceIdsByStaff = new Map<string, Set<string>>();
  for (const row of assignmentRows) {
    const staffId = String(row.staff_id || "").trim();
    const serviceId = String(row.service_id || "").trim().toUpperCase();
    if (!staffId || !serviceId) continue;

    if (!assignedServiceIdsByStaff.has(staffId)) {
      assignedServiceIdsByStaff.set(staffId, new Set());
    }

    assignedServiceIdsByStaff.get(staffId)?.add(serviceId);
  }

  return staffRows
    .map((row) => {
      const unitId = String(row.unit_id || row.unor_id || "").trim();
      const staffId = String(row.id || "").trim();
      const serviceIds = Array.from(
        assignedServiceIdsByStaff.get(staffId) ?? [],
      ).sort();
      const counterIds = Array.from(
        new Set(counterAssignmentsByStaffId.get(staffId) ?? []),
      ).sort();
      const counterLabels = counterIds
        .map((counterId) => {
          const counter = counterById.get(counterId);
          if (!counter) {
            return counterId;
          }

          return `${counter.label} (${counter.id})`;
        })
        .sort();

      return {
        id: staffId,
        name: String(row.name || "").trim(),
        loginName: String(row.login_name || "").trim(),
        role: String(row.role || "").trim(),
        unitId,
        unitName: unitNameById.get(unitId) || "",
        active: row.is_active !== false,
        mustChangePassword: Boolean(resetAccessByStaffId.get(staffId)),
        assignedServiceCount: serviceIds.length,
        serviceIds,
        counterIds,
        counterLabels,
      } satisfies LegacyStaffDirectoryItem;
    })
    .filter((row) => row.id && row.name);
}

export async function getLegacyUnitStaffDirectory(unitId: string) {
  const normalizedUnitId = String(unitId || "").trim();
  if (!normalizedUnitId) {
    return [] as LegacyUnitStaffDirectoryItem[];
  }

  const [staffRows, assignmentRows, unitRows, scheduleRows] = await Promise.all([
    fetchRestRows<StaffRow>("lkpp_staff", {
      select: "*",
      order: "name.asc",
    }),
    fetchRestRows<StaffAssignmentRow>("lkpp_staff_service_assignments", {
      select: "staff_id,service_id",
    }),
    fetchRestRows<UnitRow>("lkpp_units", {
      select: "id,name,short_name",
      order: "name.asc",
    }),
    fetchRestRows<StaffScheduleRow>("lkpp_staff_schedules", {
      select: "staff_id,day_of_week,start_time,end_time,is_off",
    }),
  ]);
  const resetAccessByStaffId = await listStaffResetAccessStatesByStaffIds(
    staffRows.map((row) => String(row.id || "").trim()),
  );
  let allCounters: Awaited<ReturnType<typeof listUnitCounters>> = [];
  let counterAssignmentsByStaffId = new Map<string, string[]>();
  try {
    [allCounters, counterAssignmentsByStaffId] = await Promise.all([
      listUnitCounters(),
      listStaffCounterAssignmentsByStaffIds(
        staffRows.map((row) => String(row.id || "").trim()),
      ),
    ]);
  } catch {
    allCounters = [];
    counterAssignmentsByStaffId = new Map<string, string[]>();
  }
  const counterById = new Map(allCounters.map((counter) => [counter.id, counter]));

  const unitNameById = new Map(
    unitRows.map((row) => [
      String(row.id || "").trim(),
      String(row.name || row.short_name || "").trim(),
    ]),
  );

  const assignedServiceIdsByStaff = new Map<string, Set<string>>();
  for (const row of assignmentRows) {
    const staffId = String(row.staff_id || "").trim();
    const serviceId = String(row.service_id || "").trim().toUpperCase();
    if (!staffId || !serviceId) continue;

    if (!assignedServiceIdsByStaff.has(staffId)) {
      assignedServiceIdsByStaff.set(staffId, new Set());
    }

    assignedServiceIdsByStaff.get(staffId)?.add(serviceId);
  }

  const scheduleByStaff = new Map<string, StaffScheduleRow[]>();
  for (const row of scheduleRows) {
    const staffId = String(row.staff_id || "").trim();
    if (!staffId) continue;
    if (!scheduleByStaff.has(staffId)) {
      scheduleByStaff.set(staffId, []);
    }
    scheduleByStaff.get(staffId)?.push(row);
  }

  const todayDayOfWeek = getJakartaDayOfWeek();

  return staffRows
    .map((row) => {
      const rowUnitId = String(row.unit_id || row.unor_id || "").trim();
      const staffId = String(row.id || "").trim();
      const serviceIds = Array.from(
        assignedServiceIdsByStaff.get(staffId) ?? [],
      ).sort();
      const counterIds = Array.from(
        new Set(counterAssignmentsByStaffId.get(staffId) ?? []),
      ).sort();
      const counterLabels = counterIds
        .map((counterId) => {
          const counter = counterById.get(counterId);
          if (!counter) {
            return counterId;
          }

          return `${counter.label} (${counter.id})`;
        })
        .sort();
      const assignedServiceCount = serviceIds.length;
      const schedules = scheduleByStaff.get(staffId) ?? [];
      const todaySchedule = schedules.find(
        (entry) => Number(entry.day_of_week ?? -1) === todayDayOfWeek,
      );
      const scheduledToday = Boolean(todaySchedule && todaySchedule.is_off !== true);
      const startTime = formatClock(todaySchedule?.start_time);
      const endTime = formatClock(todaySchedule?.end_time);

      return {
        id: staffId,
        name: String(row.name || "").trim(),
        loginName: String(row.login_name || "").trim(),
        role: String(row.role || "").trim(),
        roleLabel: getLegacyStaffRoleLabel(row.role || "", rowUnitId),
        unitId: rowUnitId,
        unitName: unitNameById.get(rowUnitId) || "",
        active: row.is_active !== false,
        mustChangePassword: Boolean(resetAccessByStaffId.get(staffId)),
        assignedServiceCount,
        serviceIds,
        counterIds,
        counterLabels,
        scheduledToday,
        hasSchedule: schedules.length > 0,
        todayShiftLabel:
          scheduledToday && startTime && endTime ? `${startTime} - ${endTime}` : null,
      } satisfies LegacyUnitStaffDirectoryItem;
    })
    .filter((row) => row.id && row.name && row.unitId === normalizedUnitId)
    .sort(
      (left, right) =>
        Number(right.scheduledToday) - Number(left.scheduledToday) ||
        Number(right.active) - Number(left.active) ||
        left.name.localeCompare(right.name),
    );
}
