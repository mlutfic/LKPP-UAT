import type { LegacyRoleFlow } from "@/content/legacy-flow/types";

export const resepsionisFlow: LegacyRoleFlow = {
  role: "resepsionis",
  label: "Resepsionis / Frontdesk",
  loginEntry: "/petugas",
  dashboardEntry: "/resepsionis/dashboard",
  legacySources: [
    "src/app/views/StaffLogin.tsx",
    "src/app/views/StaffDashboard.tsx",
    "src/app/views/staff/staffDashboardConfig.ts",
    "src/app/views/LobbyCheckin.tsx",
    "src/app/views/OfflineVisitorKiosk.tsx",
    "src/app/context/AppContext.tsx",
  ],
  summary:
    "Resepsionis menjadi titik check-in semua tamu. Flow utamanya adalah login petugas, baca antrean hari ini, cari tamu, check-in, lalu audit riwayat bila perlu.",
  parityStatus: "partial",
  featureFlows: [
    {
      key: "staff-login",
      label: "Login Petugas",
      legacyView: "src/app/views/StaffLogin.tsx",
      legacyRoutes: ["/petugas"],
      targetRoutes: ["/login/petugas"],
      businessGoal:
        "Satu pintu login untuk role petugas operasional sebelum diarahkan ke dashboard sesuai role.",
      primaryActor: "Resepsionis",
      parityStatus: "partial",
      apiContracts: [
        { name: "loginStaff", method: "POST", path: "/auth/staff-login" },
      ],
      steps: [
        {
          id: "staff-login-1",
          title: "Masuk dengan nama login dan password",
          description: "Petugas mengisi nama login dan password internal.",
          legacyRoute: "/petugas",
          targetRoute: "/login/petugas",
        },
        {
          id: "staff-login-2",
          title: "Arahkan ke dashboard role",
          description:
            "Setelah login berhasil, app membaca role dan membuka dashboard yang tepat.",
          output: "Resepsionis diarahkan ke dashboard frontdesk.",
        },
      ],
    },
    {
      key: "frontdesk-dashboard",
      label: "Dashboard Frontdesk",
      legacyView: "src/app/views/StaffDashboard.tsx",
      legacyRoutes: ["/resepsionis/dashboard"],
      targetRoutes: ["/resepsionis/dashboard"],
      businessGoal:
        "Membaca antrean semua layanan hari ini, memfilter per unit/layanan, dan memproses check-in tamu yang hadir.",
      primaryActor: "Resepsionis",
      parityStatus: "partial",
      apiContracts: [
        { name: "refreshData", note: "Memuat ulang data appointment global." },
        { name: "checkinAppointment", method: "PUT", path: "/appointments/:id", note: "action=checkin" },
      ],
      steps: [
        {
          id: "frontdesk-1",
          title: "Lihat antrean hari ini",
          description:
            "Dashboard memuat appointment hari ini dan mengelompokkan status hadir, aktif, dan selesai.",
        },
        {
          id: "frontdesk-2",
          title: "Filter atau cari",
          description:
            "Petugas bisa menyaring berdasarkan tanggal, unit, layanan, atau kata kunci nama/nomor antrean.",
        },
        {
          id: "frontdesk-3",
          title: "Check-in pengunjung",
          description:
            "Saat tamu hadir, status checked-in dikonfirmasi dari frontdesk agar unit bisa menindaklanjuti.",
          apiContracts: [
            { name: "checkinAppointment", method: "PUT", path: "/appointments/:id", note: "action=checkin" },
          ],
          output: "Appointment siap dilihat unit.",
        },
      ],
    },
    {
      key: "frontdesk-history",
      label: "Riwayat Frontdesk",
      legacyView: "src/app/views/StaffDashboard.tsx",
      legacyRoutes: ["/resepsionis/dashboard/riwayat"],
      targetRoutes: ["/resepsionis/riwayat"],
      businessGoal:
        "Membaca jejak antrean selesai, batal, dan tidak hadir dari perspektif meja frontdesk.",
      primaryActor: "Resepsionis",
      parityStatus: "partial",
      apiContracts: [{ name: "refreshData" }],
      steps: [
        {
          id: "frontdesk-history-1",
          title: "Buka riwayat",
          description:
            "Daftar riwayat menampilkan appointment yang sudah tidak aktif lagi.",
          legacyRoute: "/resepsionis/dashboard/riwayat",
          targetRoute: "/resepsionis/riwayat",
        },
      ],
    },
    {
      key: "frontdesk-profile",
      label: "Profil Resepsionis",
      legacyView: "src/app/views/StaffDashboard.tsx",
      legacyRoutes: ["/resepsionis/dashboard/profil"],
      targetRoutes: ["/resepsionis/profil"],
      businessGoal:
        "Membaca identitas petugas, penugasan frontdesk, dan konteks kerja yang aktif.",
      primaryActor: "Resepsionis",
      parityStatus: "partial",
      apiContracts: [{ name: "refreshData" }],
      steps: [
        {
          id: "frontdesk-profile-1",
          title: "Buka profil petugas",
          description:
            "Petugas melihat ringkasan identitas, shift, dan akses kerja frontdesk.",
          legacyRoute: "/resepsionis/dashboard/profil",
          targetRoute: "/resepsionis/profil",
        },
      ],
    },
    {
      key: "frontdesk-settings",
      label: "Pengaturan Resepsionis",
      legacyView: "src/app/views/StaffDashboard.tsx",
      legacyRoutes: ["/resepsionis/dashboard/pengaturan"],
      targetRoutes: ["/resepsionis/pengaturan"],
      businessGoal:
        "Mengelola preferensi tampilan dan perilaku operasional frontdesk tanpa keluar dari area kerja resepsionis.",
      primaryActor: "Resepsionis",
      parityStatus: "partial",
      apiContracts: [{ name: "saveFrontdeskSettings", note: "Preferensi lokal/frontdesk setting." }],
      steps: [
        {
          id: "frontdesk-settings-1",
          title: "Buka pengaturan frontdesk",
          description:
            "Petugas menyesuaikan preferensi notifikasi, scanner, dan kerapatan tampilan antrean.",
          legacyRoute: "/resepsionis/dashboard/pengaturan",
          targetRoute: "/resepsionis/pengaturan",
        },
      ],
    },
    {
      key: "lobby-checkin",
      label: "Lobby Check-in",
      legacyView: "src/app/views/LobbyCheckin.tsx",
      legacyRoutes: ["/lobby"],
      targetRoutes: ["/lobby"],
      businessGoal:
        "Menyediakan alur check-in cepat dari lobby untuk scan atau input nomor antrean hari ini.",
      primaryActor: "Resepsionis / Petugas Lobby",
      parityStatus: "partial",
      apiContracts: [
        { name: "lobbyCheckin", method: "POST", path: "/lobby/checkin" },
      ],
      steps: [
        {
          id: "lobby-1",
          title: "Scan atau input referensi antrean",
          description:
            "Petugas lobby memverifikasi appointment dari QR atau identitas antrean hari ini.",
        },
        {
          id: "lobby-2",
          title: "Konfirmasi hadir",
          description:
            "Setelah lolos verifikasi, sistem menandai appointment sebagai hadir / checked-in.",
          apiContracts: [
            { name: "lobbyCheckin", method: "POST", path: "/lobby/checkin" },
          ],
        },
      ],
    },
    {
      key: "offline-visitor",
      label: "Offline Visitor / Walk-in",
      legacyView: "src/app/views/OfflineVisitorKiosk.tsx",
      legacyRoutes: ["/offline-visitor", "/resepsionis/offline-visitor"],
      targetRoutes: ["/offline-visitor"],
      businessGoal:
        "Mendaftarkan pengunjung walk-in dan membuat appointment walk-in secara langsung.",
      primaryActor: "Petugas Lobby",
      parityStatus: "todo",
      apiContracts: [
        { name: "lobbyWalkin", method: "POST", path: "/lobby/walkin" },
        { name: "bookWalkinAppointment", method: "POST", path: "/appointments" },
      ],
      steps: [
        {
          id: "walkin-1",
          title: "Daftarkan tamu walk-in",
          description:
            "Petugas membuat identitas pengunjung dan memilih layanan yang dituju.",
        },
        {
          id: "walkin-2",
          title: "Buat appointment walk-in",
          description:
            "Sistem mencari slot yang tersedia lalu membuat antrean dengan tanda walk-in.",
          apiContracts: [
            { name: "bookWalkinAppointment", method: "POST", path: "/appointments" },
          ],
        },
      ],
    },
  ],
};
