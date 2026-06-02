import type { LegacyRoleFlow } from "@/content/legacy-flow/types";

export const adminFlow: LegacyRoleFlow = {
  role: "humas-admin",
  label: "Humas Admin",
  loginEntry: "/admin",
  dashboardEntry: "/admin/panel",
  legacySources: [
    "src/app/views/AdminLogin.tsx",
    "src/app/views/AdminPanel.tsx",
    "src/app/views/admin/adminPanelConfig.ts",
    "src/app/context/AppContext.tsx",
    "src/app/utils/rolePermissions.ts",
  ],
  summary:
    "Humas Admin adalah workspace administrasi pusat: mengelola layanan, login dan penugasan, unit organisasi, operasional, pengumuman, FAQ, role, ekspor, master data, dan audit.",
  parityStatus: "partial",
  featureFlows: [
    {
      key: "admin-login",
      label: "Login Humas Admin",
      legacyView: "src/app/views/AdminLogin.tsx",
      legacyRoutes: ["/admin"],
      targetRoutes: ["/admin"],
      businessGoal:
        "Memastikan hanya akun Humas Admin yang dapat masuk ke panel administrasi pusat.",
      primaryActor: "Humas Admin",
      parityStatus: "partial",
      apiContracts: [
        { name: "loginStaff", method: "POST", path: "/auth/staff-login" },
      ],
      steps: [
        {
          id: "admin-login-1",
          title: "Masuk sebagai admin",
          description:
            "Form login admin memvalidasi kredensial dan memastikan role yang masuk adalah humas_admin.",
        },
        {
          id: "admin-login-2",
          title: "Blok role non-admin",
          description:
            "Jika yang masuk bukan Humas Admin, app menampilkan peringatan dan meminta logout.",
          gate: "Role harus humas_admin",
        },
      ],
    },
    {
      key: "admin-dashboard",
      label: "Dashboard Admin",
      legacyView: "src/app/views/AdminPanel.tsx",
      legacyRoutes: ["/admin/panel"],
      targetRoutes: ["/admin/panel"],
      businessGoal:
        "Menjadi ringkasan kesehatan sistem dan pintu masuk ke seluruh area administrasi.",
      primaryActor: "Humas Admin",
      parityStatus: "partial",
      apiContracts: [
        { name: "fetchAdminDashboardOverview", method: "GET", path: "/admin/dashboard/overview" },
        { name: "fetchSystemCapacity", method: "GET", path: "/admin/capacity" },
        { name: "refreshData" },
      ],
      steps: [
        {
          id: "admin-dashboard-1",
          title: "Lihat overview",
          description:
            "Humas Admin membaca KPI lintas sistem, notifikasi, dan shortcut ke section panel.",
        },
      ],
    },
    {
      key: "admin-services",
      label: "Katalog Layanan",
      legacyView: "src/app/views/AdminPanel.tsx",
      legacyRoutes: ["/admin/panel/services"],
      targetRoutes: ["/admin/panel/layanan"],
      businessGoal:
        "Mengelola katalog layanan, prefix, status aktif, dan parameter dasar layanan.",
      primaryActor: "Humas Admin",
      parityStatus: "todo",
      apiContracts: [
        { name: "createService", method: "POST", path: "/services" },
        { name: "updateService", method: "PUT", path: "/services/:id" },
        { name: "deleteService", method: "DELETE", path: "/services/:id" },
      ],
      steps: [
        {
          id: "admin-services-1",
          title: "Tambah atau ubah layanan",
          description:
            "Admin menambah katalog layanan baru atau memperbarui layanan yang sudah ada.",
        },
        {
          id: "admin-services-2",
          title: "Nonaktifkan layanan",
          description:
            "Layanan yang tidak dipakai lagi dapat dihapus atau dinonaktifkan.",
        },
      ],
    },
    {
      key: "admin-staff-assignment",
      label: "Login & Penugasan",
      legacyView: "src/app/views/AdminPanel.tsx",
      legacyRoutes: ["/admin/panel/staff"],
      targetRoutes: ["/admin/panel/login-penugasan"],
      businessGoal:
        "Mengelola akun petugas, role, unit, layanan yang ditangani, dan reset password/PIN.",
      primaryActor: "Humas Admin",
      parityStatus: "todo",
      apiContracts: [
        { name: "createStaff", method: "POST", path: "/staff" },
        { name: "updateStaff", method: "PUT", path: "/staff/:id" },
        { name: "deleteStaff", method: "DELETE", path: "/staff/:id" },
        { name: "requestAdminUserPasswordReset", method: "POST", path: "/admin/users/:id/password-reset" },
      ],
      steps: [
        {
          id: "admin-staff-1",
          title: "Kelola akun petugas",
          description:
            "Tambah, ubah, hapus, dan atur role petugas yang masuk ke sistem.",
        },
        {
          id: "admin-staff-2",
          title: "Atur penugasan dan reset akses",
          description:
            "Cakupan unit, layanan, dan reset password/PIN dikelola dari section ini.",
        },
      ],
    },
    {
      key: "admin-unor",
      label: "Unit Organisasi",
      legacyView: "src/app/views/AdminPanel.tsx",
      legacyRoutes: ["/admin/panel/unor"],
      targetRoutes: ["/admin/panel/unit-organisasi"],
      businessGoal:
        "Mengatur layanan per unit, kuota harian, holiday, dan konfigurasi organisasi.",
      primaryActor: "Humas Admin",
      parityStatus: "todo",
      apiContracts: [
        { name: "updateUnorConfig", method: "PUT", path: "/unor-configs/:unorId" },
        { name: "deleteUnorConfig", method: "DELETE", path: "/unor-configs/:unorId" },
      ],
      steps: [
        {
          id: "admin-unor-1",
          title: "Pilih unit organisasi",
          description:
            "Admin mengelola layanan dan kuota per unit.",
        },
        {
          id: "admin-unor-2",
          title: "Simpan konfigurasi unit",
          description:
            "Perubahan kuota, holiday, dan relasi service disimpan ke backend.",
        },
      ],
    },
    {
      key: "admin-communication",
      label: "Pengumuman dan FAQ",
      legacyView: "src/app/views/AdminPanel.tsx",
      legacyRoutes: ["/admin/panel/announcements", "/admin/panel/helpfaq"],
      targetRoutes: ["/admin/panel/pengumuman", "/admin/panel/faq-bantuan"],
      businessGoal:
        "Mengelola komunikasi publik: banner/pengumuman dan FAQ bantuan pengguna.",
      primaryActor: "Humas Admin",
      parityStatus: "todo",
      apiContracts: [
        { name: "createAnnouncement", method: "POST", path: "/announcements" },
        { name: "updateAnnouncement", method: "PUT", path: "/announcements/:id" },
        { name: "deleteAnnouncement", method: "DELETE", path: "/announcements/:id" },
        { name: "createHelpFaq", method: "POST", path: "/help-faqs" },
        { name: "updateHelpFaq", method: "PUT", path: "/help-faqs/:id" },
        { name: "deleteHelpFaq", method: "DELETE", path: "/help-faqs/:id" },
      ],
      steps: [
        {
          id: "admin-comm-1",
          title: "Kelola pengumuman",
          description:
            "Banner publik dan jadwal tayang diatur dari halaman pengumuman.",
        },
        {
          id: "admin-comm-2",
          title: "Kelola FAQ bantuan",
          description:
            "FAQ yang dibaca user di halaman bantuan harus konsisten dengan kebijakan layanan terbaru.",
        },
      ],
    },
    {
      key: "admin-operations-governance",
      label: "Operasional, Hak Akses, Ekspor, Master Data, Audit",
      legacyView: "src/app/views/AdminPanel.tsx",
      legacyRoutes: [
        "/admin/panel/hours",
        "/admin/panel/roles",
        "/admin/panel/export",
        "/admin/panel/masterdata",
        "/admin/panel/audit",
      ],
      targetRoutes: [
        "/admin/panel/operasional",
        "/admin/panel/hak-akses-role",
        "/admin/panel/ekspor-data",
        "/admin/panel/data-referensi",
        "/admin/panel/aktivitas",
      ],
      businessGoal:
        "Menjaga tata kelola sistem: jam operasional, permission role, ekspor data, kapasitas/master data, dan audit aktivitas.",
      primaryActor: "Humas Admin",
      parityStatus: "todo",
      apiContracts: [
        { name: "updateAdminSettings", method: "PUT", path: "/settings" },
        { name: "updateRolePermissions", method: "PUT", path: "/settings" },
        { name: "exportData", method: "POST", path: "/export" },
        { name: "fetchAuditLogs", method: "GET", path: "/audit-logs" },
        { name: "fetchSystemCapacity", method: "GET", path: "/admin/capacity" },
      ],
      steps: [
        {
          id: "admin-gov-1",
          title: "Atur jam operasional",
          description:
            "Jam layanan, hari kerja, hari libur, dan batas booking diatur dari section operasional.",
        },
        {
          id: "admin-gov-2",
          title: "Kelola role dan permission",
          description:
            "Hak akses role petugas dibaca dan disesuaikan dari pusat kontrol role.",
        },
        {
          id: "admin-gov-3",
          title: "Ekspor dan audit",
          description:
            "Admin mengambil data lintas sistem dan membaca log aktivitas untuk audit.",
        },
      ],
    },
  ],
};
