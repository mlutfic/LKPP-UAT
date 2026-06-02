import type { LegacyParityStatus } from "@/content/legacy-flow/types";

type ApiAdapterMapEntry = {
  key: string;
  domain:
    | "bootstrap"
    | "auth"
    | "appointments"
    | "lobby"
    | "help-faq"
    | "settings"
    | "admin-overview"
    | "admin-resource"
    | "export";
  label: string;
  status: LegacyParityStatus;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  legacyFunction: string;
  adapterFile: string;
  actor: "public" | "user" | "staff" | "mixed";
  note?: string;
};

export const legacyApiAdapterMap: ApiAdapterMapEntry[] = [
  {
    key: "bootstrap-init",
    domain: "bootstrap",
    label: "Bootstrap awal aplikasi",
    status: "done",
    method: "GET",
    path: "/init",
    legacyFunction: "init",
    adapterFile: "src/lib/api/services.ts",
    actor: "public",
  },
  {
    key: "bootstrap-data",
    domain: "bootstrap",
    label: "Data scoped setelah login",
    status: "partial",
    method: "GET",
    path: "/data",
    legacyFunction: "getData",
    adapterFile: "src/lib/api/services.ts",
    actor: "mixed",
    note:
      "Endpoint sudah benar, wiring X-User-Id/X-Staff-Id di call site masih perlu dikunci saat integrasi live.",
  },
  {
    key: "auth-login-user",
    domain: "auth",
    label: "Login pengguna",
    status: "done",
    method: "POST",
    path: "/auth/login",
    legacyFunction: "loginUser",
    adapterFile: "src/lib/api/auth.ts",
    actor: "public",
  },
  {
    key: "auth-register-user",
    domain: "auth",
    label: "Registrasi pengguna",
    status: "done",
    method: "POST",
    path: "/auth/register",
    legacyFunction: "registerUser",
    adapterFile: "src/lib/api/auth.ts",
    actor: "public",
  },
  {
    key: "auth-register-verification",
    domain: "auth",
    label: "Verifikasi registrasi",
    status: "done",
    method: "POST",
    path: "/auth/register/*",
    legacyFunction:
      "sendRegisterVerification / verifyRegisterVerification / verifyRegisterVerificationLink / getRegisterVerificationStatus",
    adapterFile: "src/lib/api/auth.ts",
    actor: "public",
  },
  {
    key: "auth-user-reset",
    domain: "auth",
    label: "Reset PIN pengguna",
    status: "done",
    method: "POST",
    path: "/auth/user-password-reset/*",
    legacyFunction:
      "requestUserPasswordReset / getUserPasswordResetStatus / verifyUserPasswordResetLink / confirmUserPasswordReset",
    adapterFile: "src/lib/api/auth.ts",
    actor: "public",
  },
  {
    key: "auth-user-profile",
    domain: "auth",
    label: "Profil dan keamanan pengguna",
    status: "done",
    method: "PUT",
    path: "/users/:id/profile + related endpoints",
    legacyFunction:
      "updateUserProfile / uploadUserPhoto / sendUserVerification / verifyUserVerificationLink / changeUserPassword",
    adapterFile: "src/lib/api/auth.ts",
    actor: "user",
  },
  {
    key: "auth-login-staff",
    domain: "auth",
    label: "Login petugas",
    status: "done",
    method: "POST",
    path: "/auth/staff-login",
    legacyFunction: "loginStaff",
    adapterFile: "src/lib/api/auth.ts",
    actor: "public",
  },
  {
    key: "appointment-create",
    domain: "appointments",
    label: "Buat antrean",
    status: "done",
    method: "POST",
    path: "/appointments",
    legacyFunction: "createAppointment",
    adapterFile: "src/lib/api/appointments.ts",
    actor: "user",
  },
  {
    key: "appointment-actions",
    domain: "appointments",
    label: "Mutasi aksi antrean",
    status: "done",
    method: "PUT",
    path: "/appointments/:id",
    legacyFunction:
      "updateAppointmentStatus / cancelAppointment / checkinAppointment / addStaffNote / rateAppointment / reassignAppointmentService / overrideAppointmentPriority",
    adapterFile: "src/lib/api/appointments.ts",
    actor: "mixed",
    note: "Seluruh aksi dimultiplex lewat body.action.",
  },
  {
    key: "lobby-checkin",
    domain: "lobby",
    label: "Check-in resepsionis",
    status: "done",
    method: "POST",
    path: "/lobby/checkin",
    legacyFunction: "lobbyCheckin",
    adapterFile: "src/lib/api/appointments.ts",
    actor: "staff",
  },
  {
    key: "lobby-walkin",
    domain: "lobby",
    label: "Walk-in frontdesk",
    status: "done",
    method: "POST",
    path: "/lobby/walkin",
    legacyFunction: "lobbyWalkin",
    adapterFile: "src/lib/api/appointments.ts",
    actor: "staff",
  },
  {
    key: "help-faq-public",
    domain: "help-faq",
    label: "FAQ publik",
    status: "done",
    method: "GET",
    path: "/help-faqs/public",
    legacyFunction: "getPublicHelpFaqs",
    adapterFile: "src/lib/api/help-faq.ts",
    actor: "public",
  },
  {
    key: "help-faq-admin",
    domain: "help-faq",
    label: "CRUD FAQ",
    status: "done",
    method: "POST",
    path: "/help-faqs",
    legacyFunction: "getHelpFaqs / createHelpFaq / updateHelpFaq / deleteHelpFaq",
    adapterFile: "src/lib/api/help-faq.ts",
    actor: "staff",
  },
  {
    key: "settings-core",
    domain: "settings",
    label: "Pengaturan sistem",
    status: "done",
    method: "PUT",
    path: "/settings",
    legacyFunction: "getSettings / updateSettings",
    adapterFile: "src/lib/api/admin-settings.ts",
    actor: "staff",
  },
  {
    key: "settings-role-permissions",
    domain: "settings",
    label: "Hak akses role",
    status: "done",
    method: "PUT",
    path: "/settings",
    legacyFunction: "rolePermissions via settings",
    adapterFile: "src/lib/api/admin-roles.ts",
    actor: "staff",
    note: "Backend lama tidak punya endpoint /admin/role-permissions terpisah.",
  },
  {
    key: "admin-overview",
    domain: "admin-overview",
    label: "Overview admin dan audit",
    status: "done",
    method: "GET",
    path: "/admin/*/overview + /audit-logs + /admin/capacity",
    legacyFunction:
      "getAdminDashboardOverview / getAdminServicesOverview / getAdminStaffOverview / getAuditLogs / getSystemCapacity",
    adapterFile: "src/lib/api/admin-audit.ts + src/lib/api/admin-settings.ts",
    actor: "staff",
  },
  {
    key: "admin-services",
    domain: "admin-resource",
    label: "CRUD layanan",
    status: "done",
    method: "POST",
    path: "/services",
    legacyFunction: "createService / updateService / deleteService",
    adapterFile: "src/lib/api/admin-services.ts",
    actor: "staff",
  },
  {
    key: "admin-staff",
    domain: "admin-resource",
    label: "CRUD petugas",
    status: "done",
    method: "POST",
    path: "/staff",
    legacyFunction: "createStaff / updateStaff / deleteStaff",
    adapterFile: "src/lib/api/admin-staff.ts",
    actor: "staff",
  },
  {
    key: "admin-unor",
    domain: "admin-resource",
    label: "Konfigurasi unit organisasi",
    status: "done",
    method: "PUT",
    path: "/unor-configs/:unorId",
    legacyFunction: "getUnorConfigs / updateUnorConfig / deleteUnorConfig",
    adapterFile: "src/lib/api/admin-unor.ts",
    actor: "staff",
  },
  {
    key: "admin-announcements",
    domain: "admin-resource",
    label: "CRUD pengumuman",
    status: "done",
    method: "POST",
    path: "/announcements",
    legacyFunction: "createAnnouncement / updateAnnouncement / deleteAnnouncement",
    adapterFile: "src/lib/api/admin-announcements.ts",
    actor: "staff",
  },
  {
    key: "export-suite",
    domain: "export",
    label: "Ekspor data",
    status: "done",
    method: "POST",
    path: "/export",
    legacyFunction: "exportData",
    adapterFile: "src/lib/api/export.ts + src/lib/api/monitoring.ts",
    actor: "staff",
  },
];

export const legacyApiActorRules = [
  {
    scope: "public",
    note: "Request publik tidak memerlukan X-User-Id atau X-Staff-Id.",
  },
  {
    scope: "user",
    note: "Request user harus siap mengirim X-User-Id dari sesi aktif.",
  },
  {
    scope: "staff",
    note: "Request petugas/admin harus siap mengirim X-Staff-Id dari sesi aktif.",
  },
];
