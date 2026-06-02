import type { InternalRole } from "@/features/internal/internal-workspace-config";
import { getInternalAppointmentStatusLabel } from "@/features/internal/internal-appointment-status";

export type MonitoringRole = Extract<
  InternalRole,
  "supervisor-monitoring" | "humas-monitoring" | "humas-admin"
>;

export type MonitoringPriorityRow = {
  id: string;
  queueNumber: string;
  serviceTitle: string;
  unitLabel: string;
  waitLabel: string;
  status: string;
  note: string;
};

export type MonitoringUnitSignal = {
  label: string;
  queueCount: number;
  avgWait: string;
  status: string;
  note: string;
};

export type MonitoringServiceRank = {
  label: string;
  volume: number;
  trend: string;
};

export type MonitoringExportRow = {
  id: string;
  queueNumber: string;
  visitorName: string;
  dateLabel: string;
  timeLabel: string;
  serviceCode: string;
  serviceTitle: string;
  unitLabel: string;
  complaint: string;
  note: string;
  status: string;
  rawStatus?: string;
  autoCancelled?: boolean;
  checkedIn: boolean;
  isWalkIn: boolean;
};

export type MonitoringPersonaConfig = {
  label: string;
  scopeLabel: string;
  unitFilterLocked: boolean;
  exportPrefix: string;
  focusNote: string;
  profileName: string;
  profileEmail: string;
  profileUnit: string;
  profileHighlights: string[];
  unitOptions: string[];
};

export type MonitoringMetric = {
  label: string;
  value: number;
};

export type MonitoringQuickAction = {
  label: string;
  icon: "eye" | "download" | "sheet";
};

export type MonitoringPageAction = {
  label: string;
  icon: "filter" | "refresh" | "download";
  variant?: "default" | "outline";
};

const sharedPriorities: MonitoringPriorityRow[] = [
  {
    id: "MON-1101",
    queueNumber: "D11-01-018",
    serviceTitle: "Penafsiran Peraturan PBJ",
    unitLabel: "Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Umum",
    waitLabel: "24 menit",
    status: "Perlu Tinjau",
    note: "Antrean sudah check-in dan menunggu lebih lama dari rata-rata unit.",
  },
  {
    id: "MON-1102",
    queueNumber: "D22-01-006",
    serviceTitle: "Konsultasi INAPROC, SPSE, dan SIKaP",
    unitLabel: "Direktorat Sistem Pengadaan Digital",
    waitLabel: "18 menit",
    status: "Diproses",
    note: "Supervisor perlu memastikan eskalasi teknis tetap bergerak ke meja layanan.",
  },
  {
    id: "MON-1103",
    queueNumber: "D17-01-004",
    serviceTitle: "Pelayanan Advokasi dan Permasalahan Pengadaan",
    unitLabel: "Direktorat Advokasi Pemerintah Pusat",
    waitLabel: "12 menit",
    status: "Normal",
    note: "Masih dalam ritme normal, namun volume layanan naik menjelang siang.",
  },
];

const sharedUnitSignals: MonitoringUnitSignal[] = [
  {
    label: "Sistem Pengadaan Digital",
    queueCount: 8,
    avgWait: "18 mnt",
    status: "Perlu Tinjau",
    note: "Kenaikan pertanyaan akun dan kendala sistem membuat ritme meja melambat.",
  },
  {
    label: "Advokasi Pemerintah Pusat",
    queueCount: 5,
    avgWait: "11 mnt",
    status: "Normal",
    note: "Masih sesuai SLA dan distribusi petugas relatif stabil.",
  },
  {
    label: "PPSDM PBJ",
    queueCount: 4,
    avgWait: "9 mnt",
    status: "Stabil",
    note: "Permintaan pelatihan bergerak rapi dan tidak menumpuk di satu jam.",
  },
  {
    label: "Pengembangan Strategi Umum",
    queueCount: 6,
    avgWait: "16 mnt",
    status: "Perlu Tinjau",
    note: "Dua layanan regulasi berjalan rapat dan perlu penyeimbang kapasitas.",
  },
];

const sharedServiceRanks: MonitoringServiceRank[] = [
  { label: "Penafsiran Peraturan PBJ", volume: 12, trend: "+2 hari ini" },
  { label: "Konsultasi INAPROC, SPSE, dan SIKaP", volume: 9, trend: "+1 hari ini" },
  { label: "Kebijakan PBJ di Desa", volume: 7, trend: "stabil" },
  { label: "Pelatihan Teknis PBJ", volume: 5, trend: "-1 dari kemarin" },
];

const sharedExportRows: MonitoringExportRow[] = [
  {
    id: "EXP-01",
    queueNumber: "D11-01-018",
    visitorName: "Rama Setiawan",
    dateLabel: "Sabtu, 12 April 2026",
    timeLabel: "09:30 - 10:00 WIB",
    serviceCode: "D11-01",
    serviceTitle: "Penafsiran Peraturan PBJ",
    unitLabel: "Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Umum",
    complaint: "Permintaan penafsiran pasal pada regulasi PBJ.",
    note: "Menunggu arahan akhir dari unit.",
    status: getInternalAppointmentStatusLabel({ status: "calling", checkedIn: true }),
    rawStatus: "calling",
    autoCancelled: false,
    checkedIn: true,
    isWalkIn: false,
  },
  {
    id: "EXP-02",
    queueNumber: "D22-01-006",
    visitorName: "Dewi Lestari",
    dateLabel: "Sabtu, 12 April 2026",
    timeLabel: "10:00 - 10:20 WIB",
    serviceCode: "D22-01",
    serviceTitle: "Konsultasi INAPROC, SPSE, dan SIKaP",
    unitLabel: "Direktorat Sistem Pengadaan Digital",
    complaint: "Kendala akun INAPROC untuk penyedia.",
    note: "Perlu pendampingan lanjutan dari tim teknis.",
    status: getInternalAppointmentStatusLabel({ status: "in-service", checkedIn: true }),
    rawStatus: "in-service",
    autoCancelled: false,
    checkedIn: true,
    isWalkIn: true,
  },
  {
    id: "EXP-03",
    queueNumber: "D17-01-004",
    visitorName: "Ferry Maulana",
    dateLabel: "Sabtu, 12 April 2026",
    timeLabel: "11:00 - 11:30 WIB",
    serviceCode: "D17-01",
    serviceTitle: "Pelayanan Advokasi dan Permasalahan Pengadaan",
    unitLabel: "Direktorat Advokasi Pemerintah Pusat",
    complaint: "Konsultasi permasalahan kontrak pengadaan.",
    note: "Selesai, catatan penutupan sudah lengkap.",
    status: getInternalAppointmentStatusLabel({ status: "completed", checkedIn: true }),
    rawStatus: "completed",
    autoCancelled: false,
    checkedIn: true,
    isWalkIn: false,
  },
  {
    id: "EXP-04",
    queueNumber: "D12-03-003",
    visitorName: "Nita Permata",
    dateLabel: "Sabtu, 12 April 2026",
    timeLabel: "13:00 - 13:30 WIB",
    serviceCode: "D12-03",
    serviceTitle: "Pendampingan Kebijakan BLU, BLUD, dan Desa",
    unitLabel: "Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Khusus",
    complaint: "Pendampingan review kebijakan BLUD.",
    note: "Belum check-in ulang setelah perubahan jam.",
    status: getInternalAppointmentStatusLabel({ status: "confirmed", checkedIn: false }),
    rawStatus: "confirmed",
    autoCancelled: false,
    checkedIn: false,
    isWalkIn: false,
  },
  {
    id: "EXP-05",
    queueNumber: "PPSDM-02-007",
    visitorName: "Dimas Akbar",
    dateLabel: "Sabtu, 12 April 2026",
    timeLabel: "14:00 - 14:30 WIB",
    serviceCode: "PPSDM-02",
    serviceTitle: "Pelatihan Fungsional PBJ",
    unitLabel: "Pusat Pelatihan SDM Pengadaan Barang/Jasa",
    complaint: "Permintaan pelatihan fungsional tingkat dasar.",
    note: "Jadwal ulang karena pengunjung datang di luar slot.",
    status: getInternalAppointmentStatusLabel({ status: "no-show", checkedIn: false }),
    rawStatus: "no-show",
    autoCancelled: false,
    checkedIn: false,
    isWalkIn: false,
  },
  {
    id: "EXP-06",
    queueNumber: "D15-01-002",
    visitorName: "Ayu Purnamasari",
    dateLabel: "Sabtu, 12 April 2026",
    timeLabel: "15:00 - 15:20 WIB",
    serviceCode: "D15-01",
    serviceTitle: "Pelayanan Advokasi dan Permasalahan Pengadaan Daerah",
    unitLabel: "Direktorat Advokasi Pemerintah Daerah",
    complaint: "Konsultasi pengadaan daerah.",
    note: "Siap dipanggil, menunggu giliran meja unit.",
    status: getInternalAppointmentStatusLabel({ status: "confirmed", checkedIn: true }),
    rawStatus: "confirmed",
    autoCancelled: false,
    checkedIn: true,
    isWalkIn: false,
  },
];

const monitoringPersonaConfig: Record<MonitoringRole, MonitoringPersonaConfig> = {
  "supervisor-monitoring": {
    label: "Supervisor Monitoring",
    scopeLabel: "Cakupan unit penugasan",
    unitFilterLocked: true,
    exportPrefix: "laporan-supervisor-unit",
    focusNote: "Pantau bottleneck unit dan kebutuhan intervensi cepat.",
    profileName: "Bima Nurtama",
    profileEmail: "supervisor@lkpp.go.id",
    profileUnit: "Unit penugasan sesuai role aktif",
    profileHighlights: [
      "Filter unit dikunci ke area penugasan.",
      "Ekspor dipakai untuk ringkasan harian dan mingguan.",
      "Fokus pada intervensi, bukan operasi meja layanan.",
    ],
    unitOptions: ["Unit penugasan aktif"],
  },
  "humas-monitoring": {
    label: "Humas Monitoring",
    scopeLabel: "Lintas unit layanan",
    unitFilterLocked: false,
    exportPrefix: "laporan-humas-monitoring",
    focusNote: "Pantau dampak ke warga dan kebutuhan sinkronisasi informasi.",
    profileName: "Humas Monitoring LKPP",
    profileEmail: "humas.monitoring@lkpp.go.id",
    profileUnit: "Lintas unit layanan publik",
    profileHighlights: [
      "Filter unit terbuka untuk baca ritme lintas layanan.",
      "Ekspor dipakai untuk rekap komunikasi publik.",
      "Fokus pada dampak ke warga dan konsistensi informasi.",
    ],
    unitOptions: [
      "Semua unit",
      "Direktorat Sistem Pengadaan Digital",
      "Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Umum",
      "Direktorat Advokasi Pemerintah Pusat",
      "PPSDM Pengadaan Barang/Jasa",
    ],
  },
  "humas-admin": {
    label: "Humas Admin",
    scopeLabel: "Lintas modul dan administrasi",
    unitFilterLocked: false,
    exportPrefix: "laporan-humas-admin",
    focusNote: "Pantau dampak operasional, ekspor data, dan sinkronisasi modul administrasi.",
    profileName: "Humas Admin LKPP",
    profileEmail: "humas.admin@lkpp.go.id",
    profileUnit: "Pengelola lintas modul",
    profileHighlights: [
      "Export dipakai lintas modul untuk audit, operasional, dan pelaporan cepat.",
      "Filter diperkaya agar pengambilan data siap untuk validasi dan pelaporan.",
      "Fokus pada ketertelusuran perubahan layanan, antrean, dan pengumuman.",
    ],
    unitOptions: [
      "Semua unit",
      "Direktorat Sistem Pengadaan Digital",
      "Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Umum",
      "Direktorat Advokasi Pemerintah Pusat",
      "PPSDM Pengadaan Barang/Jasa",
    ],
  },
};

export const monitoringFilterPresets = [
  { value: "today", label: "Hari ini" },
  { value: "last7", label: "7 hari" },
  { value: "month", label: "Bulan ini" },
  { value: "custom", label: "Kustom" },
];

export const monitoringServiceOptions = [
  "Semua layanan",
  "Penafsiran Peraturan PBJ",
  "Konsultasi INAPROC, SPSE, dan SIKaP",
  "Kebijakan PBJ di Desa",
  "Pelatihan Teknis PBJ",
];

export const monitoringQualityMetrics: MonitoringMetric[] = [
  { label: "Tingkat selesai", value: 84 },
  { label: "Kehadiran", value: 78 },
  { label: "Kunjungan langsung", value: 22 },
  { label: "No-show", value: 11 },
];

export const monitoringQuickActions: MonitoringQuickAction[] = [
  { label: "Buka data", icon: "eye" },
  { label: "Ekspor CSV", icon: "download" },
  { label: "JSON", icon: "sheet" },
];

export const monitoringPageActions: MonitoringPageAction[] = [
  { label: "Filter", icon: "filter", variant: "outline" },
  { label: "Muat Ulang", icon: "refresh", variant: "outline" },
  { label: "Ekspor", icon: "download" },
];

export function getMonitoringPersonaConfig(role: MonitoringRole) {
  return monitoringPersonaConfig[role];
}

export function getMonitoringPriorityRows(role: MonitoringRole) {
  if (role === "supervisor-monitoring") {
    return sharedPriorities.filter((row) => row.unitLabel !== "Pusat Pelatihan SDM Pengadaan Barang/Jasa");
  }

  return sharedPriorities;
}

export function getMonitoringUnitSignals(role: MonitoringRole) {
  if (role === "supervisor-monitoring") {
    return sharedUnitSignals.slice(0, 3);
  }

  return sharedUnitSignals;
}

export function getMonitoringServiceRanks(role: MonitoringRole) {
  if (role === "supervisor-monitoring") {
    return sharedServiceRanks.slice(0, 3);
  }

  return sharedServiceRanks;
}

export function getMonitoringExportRows(role: MonitoringRole) {
  if (role === "supervisor-monitoring") {
    return sharedExportRows.filter(
      (row) =>
        row.unitLabel !== "Pusat Pelatihan SDM Pengadaan Barang/Jasa" &&
        row.unitLabel !== "Direktorat Advokasi Pemerintah Daerah",
    );
  }

  return sharedExportRows;
}

export function getMonitoringPersonaBadges(role: MonitoringRole) {
  const persona = getMonitoringPersonaConfig(role);

  return [
    { label: persona.scopeLabel, icon: "eye" as const },
    { label: persona.exportPrefix, icon: "sheet" as const },
    {
      label: role === "humas-monitoring" ? "Lintas unit" : "Unit penugasan",
      icon: "bell" as const,
    },
  ];
}
