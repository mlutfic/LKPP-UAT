import type { LegacyRoleFlow } from "@/content/legacy-flow/types";

export const monitoringFlow: LegacyRoleFlow = {
  role: "monitoring",
  label: "Supervisor Monitoring dan Humas Monitoring",
  loginEntry: "/petugas",
  dashboardEntry: "/supervisor/dashboard",
  legacySources: [
    "src/app/views/SupervisorDashboard.tsx",
    "src/app/views/supervisor/supervisorDashboardConfig.ts",
    "src/app/views/supervisor/supervisorDashboardPersona.ts",
    "src/app/context/AppContext.tsx",
  ],
  summary:
    "Supervisor unit, Humas Monitoring, dan persona monitoring lainnya memakai mesin dashboard yang sama: filter periode, unit, layanan, membaca KPI, memeriksa anomali, dan mengekspor data.",
  parityStatus: "partial",
  featureFlows: [
    {
      key: "monitoring-dashboard",
      label: "Dashboard Monitoring",
      legacyView: "src/app/views/SupervisorDashboard.tsx",
      legacyRoutes: ["/supervisor/dashboard"],
      targetRoutes: ["/supervisor/dashboard", "/humas-monitoring/dashboard"],
      businessGoal:
        "Memberi ringkasan lintas unit atau unit sendiri sebelum masuk ke workspace monitoring detail.",
      primaryActor: "Supervisor / Humas Monitoring",
      parityStatus: "partial",
      apiContracts: [{ name: "refreshData" }],
      steps: [
        {
          id: "monitoring-dashboard-1",
          title: "Baca KPI dan health status",
          description:
            "Role monitoring melihat volume antrean, selesai, no-show, kehadiran, dan anomali yang perlu perhatian.",
        },
        {
          id: "monitoring-dashboard-2",
          title: "Masuk ke monitoring atau ekspor",
          description:
            "CTA utama membawa user ke workspace grafik/monitoring atau ke pusat ekspor data.",
        },
      ],
    },
    {
      key: "monitoring-workspace",
      label: "Monitoring Detail",
      legacyView: "src/app/views/SupervisorDashboard.tsx",
      legacyRoutes: ["/supervisor/dashboard/monitoring"],
      targetRoutes: ["/supervisor/monitoring", "/humas-monitoring/monitoring"],
      businessGoal:
        "Menganalisis data antrean berdasarkan periode, unit, layanan, dan status untuk pengawasan operasional.",
      primaryActor: "Supervisor / Humas Monitoring",
      parityStatus: "todo",
      apiContracts: [
        { name: "refreshData" },
      ],
      steps: [
        {
          id: "monitoring-1",
          title: "Atur filter",
          description:
            "Filter periode, unit, dan layanan menentukan cakupan data yang dianalisis.",
        },
        {
          id: "monitoring-2",
          title: "Baca grafik dan tabel",
          description:
            "Halaman menampilkan tren harian, jam sibuk, distribusi status, serta daftar antrean prioritas.",
        },
      ],
    },
    {
      key: "monitoring-export",
      label: "Ekspor Data Monitoring",
      legacyView: "src/app/views/SupervisorDashboard.tsx",
      legacyRoutes: ["/supervisor/dashboard/data-ekspor"],
      targetRoutes: ["/supervisor/data-ekspor", "/humas-monitoring/data-ekspor"],
      businessGoal:
        "Mengekspor hasil pengawasan dalam format CSV, JSON, atau SQL berdasarkan filter aktif.",
      primaryActor: "Supervisor / Humas Monitoring",
      parityStatus: "todo",
      apiContracts: [
        { name: "exportData", method: "POST", path: "/export" },
      ],
      steps: [
        {
          id: "monitoring-export-1",
          title: "Tentukan filter data",
          description:
            "Filter aktif di dashboard menjadi dasar ekspor.",
        },
        {
          id: "monitoring-export-2",
          title: "Unduh file",
          description:
            "User memilih format CSV, JSON, atau SQL lalu sistem mengunduh hasil ekspor.",
          apiContracts: [
            { name: "exportData", method: "POST", path: "/export" },
          ],
        },
      ],
    },
    {
      key: "monitoring-profile",
      label: "Profil Monitoring",
      legacyView: "src/app/views/SupervisorDashboard.tsx",
      legacyRoutes: ["/supervisor/dashboard/profil"],
      targetRoutes: ["/supervisor/profil", "/humas-monitoring/profil"],
      businessGoal:
        "Melihat cakupan penugasan, foto, identitas akun, dan jalur logout role monitoring.",
      primaryActor: "Supervisor / Humas Monitoring",
      parityStatus: "partial",
      apiContracts: [
        { name: "uploadCurrentStaffPhoto", method: "POST", path: "/staff/:id/photo" },
      ],
      steps: [
        {
          id: "monitoring-profile-1",
          title: "Baca cakupan akses",
          description:
            "Profil menunjukkan apakah akun bersifat scoped ke unit tertentu atau lintas unit.",
        },
        {
          id: "monitoring-profile-2",
          title: "Perbarui foto",
          description:
            "Petugas monitoring dapat mengganti foto profil bila perlu.",
          apiContracts: [
            { name: "uploadCurrentStaffPhoto", method: "POST", path: "/staff/:id/photo" },
          ],
        },
      ],
    },
  ],
};
