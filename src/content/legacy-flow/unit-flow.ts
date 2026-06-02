import type { LegacyRoleFlow } from "@/content/legacy-flow/types";

export const unitFlow: LegacyRoleFlow = {
  role: "unit-organisasi",
  label: "Unit Organisasi",
  loginEntry: "/petugas",
  dashboardEntry: "/unor/dashboard",
  legacySources: [
    "src/app/views/UnorDashboard.tsx",
    "src/app/views/unor/unorDashboardConfig.ts",
    "src/app/context/AppContext.tsx",
  ],
  summary:
    "Flow unit organisasi berpusat pada workspace antrean: memanggil, memulai layanan, menyelesaikan, menandai no-show, menulis catatan, memprioritaskan, memindahkan layanan, dan membaca analitik unit.",
  parityStatus: "partial",
  featureFlows: [
    {
      key: "unit-dashboard",
      label: "Dashboard Unit",
      legacyView: "src/app/views/UnorDashboard.tsx",
      legacyRoutes: ["/unor/dashboard"],
      targetRoutes: ["/unit/dashboard"],
      businessGoal:
        "Memberi ringkasan operasional harian unit dan pintu masuk ke workspace antrean serta analitik unit.",
      primaryActor: "Akun Unit",
      parityStatus: "partial",
      apiContracts: [{ name: "refreshData" }],
      steps: [
        {
          id: "unit-dashboard-1",
          title: "Baca fokus antrean",
          description:
            "Unit melihat antrean berikutnya, ritme layanan saat ini, dan CTA menuju data antrean atau analitik.",
        },
      ],
    },
    {
      key: "unit-queue-workspace",
      label: "Data Antrean Unit",
      legacyView: "src/app/views/UnorDashboard.tsx",
      legacyRoutes: ["/unor/dashboard/data-antrean"],
      targetRoutes: ["/unit/data-antrean"],
      businessGoal:
        "Workspace inti untuk memproses antrean di level unit sampai layanan selesai atau dialihkan.",
      primaryActor: "Akun Unit",
      parityStatus: "partial",
      apiContracts: [
        { name: "updateAppointmentStatus", method: "PUT", path: "/appointments/:id", note: "action=status" },
        { name: "addStaffNote", method: "PUT", path: "/appointments/:id", note: "action=note" },
        { name: "overrideAppointmentPriority", method: "PUT", path: "/appointments/:id", note: "action=priority-override" },
        { name: "reassignAppointmentService", method: "PUT", path: "/appointments/:id", note: "action=reassign-service" },
      ],
      steps: [
        {
          id: "unit-queue-1",
          title: "Panggil antrean",
          description:
            "Petugas unit mengubah status appointment ke calling saat siap mengambil tamu.",
          apiContracts: [
            { name: "updateAppointmentStatus", method: "PUT", path: "/appointments/:id", note: "action=status, status=calling" },
          ],
        },
        {
          id: "unit-queue-2",
          title: "Mulai layanan",
          description:
            "Saat tamu masuk proses layanan, status berpindah ke in-service.",
          apiContracts: [
            { name: "updateAppointmentStatus", method: "PUT", path: "/appointments/:id", note: "action=status, status=in-service" },
          ],
        },
        {
          id: "unit-queue-3",
          title: "Tandai selesai atau no-show",
          description:
            "Petugas menutup antrean menjadi completed atau no-show sesuai kondisi lapangan.",
          apiContracts: [
            { name: "updateAppointmentStatus", method: "PUT", path: "/appointments/:id", note: "action=status, status=completed / no-show" },
          ],
        },
        {
          id: "unit-queue-4",
          title: "Tambahkan catatan atau prioritas",
          description:
            "Catatan petugas dan alasan prioritas dipakai untuk konteks operasional dan audit.",
          apiContracts: [
            { name: "addStaffNote", method: "PUT", path: "/appointments/:id", note: "action=note" },
            { name: "overrideAppointmentPriority", method: "PUT", path: "/appointments/:id", note: "action=priority-override" },
          ],
        },
        {
          id: "unit-queue-5",
          title: "Pindah layanan atau eskalasi level 2",
          description:
            "Jika layanan yang dipilih tidak tepat atau perlu diteruskan ke level lebih tinggi, appointment dapat dipindah ke layanan tujuan. Saat eskalasi dilakukan dari fase melayani, ownership operasional Level 1 dianggap selesai dan antrean kembali siap dipanggil di layanan tujuan.",
          apiContracts: [
            {
              name: "reassignAppointmentService",
              method: "PUT",
              path: "/appointments/:id",
              note: "action=reassign-service, serviceId, reason?, mode=reassign|escalation",
            },
          ],
        },
      ],
    },
    {
      key: "unit-analytics",
      label: "Analitik Unit",
      legacyView: "src/app/views/UnorDashboard.tsx",
      legacyRoutes: ["/unor/dashboard/analitik-unit", "/unor/dashboard/laporan-ekspor"],
      targetRoutes: ["/unit/analitik-unit"],
      businessGoal:
        "Membaca statistik volume, penyelesaian, rasio layanan, dan insight performa di level unit.",
      primaryActor: "Akun Unit",
      parityStatus: "partial",
      apiContracts: [{ name: "refreshData" }],
      steps: [
        {
          id: "unit-analytics-1",
          title: "Pilih rentang dan layanan",
          description:
            "Analitik unit membaca data appointment scoped ke unit dan layanan aktif.",
        },
        {
          id: "unit-analytics-2",
          title: "Baca insight layanan",
          description:
            "Panel menunjukkan volume, ritme layanan, dan titik perhatian untuk pengelolaan unit.",
        },
      ],
    },
  ],
};
