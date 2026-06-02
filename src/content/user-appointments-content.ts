import { getBookingServiceById } from "@/content/service-booking-content";

export type UserAppointmentStatus =
  | "booked"
  | "confirmed"
  | "escalated"
  | "calling"
  | "in-service"
  | "completed"
  | "unprocessed"
  | "cancelled"
  | "no-show";

export type UserAppointmentRecord = {
  id: string;
  qrToken?: string;
  createdAt?: string;
  autoCancelled?: boolean;
  queueNumber: string;
  rawQueueNumber?: string;
  counterId?: number;
  serviceId: string;
  applicantCategory?: string;
  institutionName?: string;
  serviceTopic?: string;
  date: string;
  dateLabel: string;
  timeRange: string;
  status: UserAppointmentStatus;
  complaint: string;
  guestCount: number;
  asalInstansi: string;
  location: string;
  checkedIn?: boolean;
  callCount?: number;
  canCancel?: boolean;
  summaryNote: string;
  activityLog: string[];
  preparationChecklist: string[];
};

export type UserAppointmentPresentation = UserAppointmentRecord & {
  serviceTitle: string;
  serviceOfficialName: string;
  serviceGroupLabel: string;
  unitLabel: string;
};

export const userAppointmentStatusMeta: Record<
  UserAppointmentStatus,
  {
    label: string;
    badgeStatus:
      | "aktif"
      | "menunggu"
      | "selesai"
      | "dipanggil"
      | "diproses"
      | "warning"
      | "danger"
      | "dijadwalkan"
      | "dibatalkan"
      | "tidak-hadir";
    note: string;
  }
> = {
  booked: {
    label: "Terjadwal",
    badgeStatus: "dijadwalkan",
    note: "Antrian tersimpan dan menunggu jadwal.",
  },
  confirmed: {
    label: "Sudah Hadir",
    badgeStatus: "aktif",
    note: "Kehadiran sudah dikonfirmasi.",
  },
  escalated: {
    label: "Dieskalasi Level 2",
    badgeStatus: "warning",
    note: "Antrian sedang diteruskan ke layanan lanjutan level 2.",
  },
  calling: {
    label: "Dipanggil Unit",
    badgeStatus: "dipanggil",
    note: "Unit tujuan sedang memanggil antrian Anda.",
  },
  "in-service": {
    label: "Sedang Dilayani",
    badgeStatus: "diproses",
    note: "Sesi layanan sedang berlangsung.",
  },
  completed: {
    label: "Selesai",
    badgeStatus: "selesai",
    note: "Layanan sudah selesai.",
  },
  unprocessed: {
    label: "Tidak Diproses",
    badgeStatus: "warning",
    note: "Antrean ditutup otomatis karena hari layanan telah berganti dan belum selesai diproses.",
  },
  cancelled: {
    label: "Dibatalkan",
    badgeStatus: "dibatalkan",
    note: "Antrian dibatalkan.",
  },
  "no-show": {
    label: "Tidak Hadir",
    badgeStatus: "tidak-hadir",
    note: "Antrian tercatat tidak hadir.",
  },
};

export const userAppointments: UserAppointmentRecord[] = [
  {
    id: "D23-01-001",
    queueNumber: "D23-01-001",
    counterId: 2,
    serviceId: "D23-01",
    applicantCategory: "Penyedia / Pengusaha",
    institutionName: "PT Sumber Perangkat Nusantara",
    date: "2026-04-14",
    dateLabel: "Senin, 14 April 2026",
    timeRange: "09:15 - 09:45 WIB",
    status: "calling",
    serviceTopic: "Penyedia — Kendala produk tayang",
    complaint: "Perlu konsultasi mengenai pelaksanaan e-purchasing dan produk yang belum tampil di katalog.",
    guestCount: 1,
    asalInstansi: "Mitra layanan publik",
    location: "Frontdesk LKPP → Direktorat Pasar Digital Pengadaan",
    checkedIn: true,
    callCount: 1,
    summaryNote: "Segera menuju unit tujuan karena antrian sedang dipanggil.",
    activityLog: [
      "Antrian tersimpan melalui portal layanan.",
      "Kehadiran dikonfirmasi di frontdesk.",
      "Unit tujuan sedang memanggil antrian ini.",
    ],
    preparationChecklist: [
      "Bawa detail kendala transaksi e-purchasing.",
      "Siapkan identitas akun penyedia atau K/L/PD yang terkait.",
      "Pastikan perangkat komunikasi aktif jika petugas perlu tindak lanjut.",
    ],
  },
  {
    id: "D22-01-001",
    queueNumber: "D22-01-001",
    counterId: 4,
    serviceId: "D22-01",
    applicantCategory: "Penyedia / Pengusaha",
    institutionName: "CV Mitra Konsultansi Digital",
    date: "2026-04-18",
    dateLabel: "Kamis, 18 April 2026",
    timeRange: "13:30 - 13:50 WIB",
    status: "confirmed",
    serviceTopic: "Kendala akun INAPROC",
    complaint: "Kendala akun INAPROC dan perlu verifikasi perubahan data akun.",
    guestCount: 1,
    asalInstansi: "Penyedia jasa konsultansi",
    location: "Frontdesk LKPP → Direktorat Sistem Pengadaan Digital",
    checkedIn: true,
    summaryNote: "Kehadiran sudah dikonfirmasi.",
    activityLog: [
      "Antrian layanan tersimpan.",
      "Dokumen akun diverifikasi awal.",
      "Kehadiran ditandai oleh resepsionis.",
    ],
    preparationChecklist: [
      "Siapkan email akun, NIK, atau NPWP yang terkait.",
      "Catat pesan error terakhir yang muncul di sistem.",
    ],
  },
  {
    id: "D11-02-001",
    queueNumber: "D11-02-001",
    counterId: 1,
    serviceId: "D11-02",
    applicantCategory: "ASN / TNI / Polri",
    institutionName: "Bagian Pengadaan Pemerintah Kabupaten Sukamaju",
    date: "2026-04-23",
    dateLabel: "Selasa, 23 April 2026",
    timeRange: "10:00 - 10:30 WIB",
    status: "booked",
    complaint: "Permohonan diseminasi peraturan PBJ untuk tim pengadaan internal.",
    guestCount: 3,
    asalInstansi: "Pemerintah Kabupaten",
    location: "Frontdesk LKPP → Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Umum",
    canCancel: true,
    summaryNote: "Antrian aktif dan masih bisa disesuaikan.",
    activityLog: [
      "Antrian dibuat oleh pengguna.",
      "Belum ada perubahan jadwal.",
      "Menunggu hari kunjungan.",
    ],
    preparationChecklist: [
      "Bawa daftar peserta atau unit yang membutuhkan diseminasi.",
      "Siapkan poin regulasi yang ingin diperdalam.",
    ],
  },
  {
    id: "D31-01-001",
    queueNumber: "D31-01-001",
    serviceId: "D31-01",
    date: "2026-04-07",
    dateLabel: "Senin, 7 April 2026",
    timeRange: "11:00 - 11:30 WIB",
    status: "completed",
    complaint: "Permohonan pembinaan UKPBJ untuk penguatan tata kelola pengadaan daerah.",
    guestCount: 2,
    asalInstansi: "Pemerintah Kota",
    location: "Direktorat Pengembangan Profesi dan Kelembagaan",
    summaryNote: "Layanan telah selesai.",
    activityLog: [
      "Antrian disetujui oleh sistem.",
      "Kehadiran terkonfirmasi di frontdesk.",
      "Sesi layanan selesai.",
    ],
    preparationChecklist: [
      "Simpan ringkasan hasil konsultasi untuk tindak lanjut.",
      "Gunakan halaman bantuan jika butuh eskalasi lanjutan.",
    ],
  },
  {
    id: "D42-01-001",
    queueNumber: "D42-01-001",
    serviceId: "D42-01",
    date: "2026-04-03",
    dateLabel: "Kamis, 3 April 2026",
    timeRange: "09:30 - 10:00 WIB",
    status: "cancelled",
    complaint: "Konsultasi advokasi pengadaan untuk instansi daerah.",
    guestCount: 1,
    asalInstansi: "Sekretariat Daerah",
    location: "Direktorat Advokasi Pemerintah Daerah",
    summaryNote: "Antrian dibatalkan sebelum sesi dimulai.",
    activityLog: [
      "Antrian dibuat pengguna.",
      "Permintaan pembatalan diterima sistem.",
      "Antrian dipindahkan ke status batal.",
    ],
    preparationChecklist: [
      "Ambil antrian baru jika kebutuhan layanan masih berjalan.",
      "Gunakan bantuan untuk koordinasi perubahan jadwal.",
    ],
  },
  {
    id: "PPSDM-02-001",
    queueNumber: "PPSDM-02-001",
    serviceId: "PPSDM-02",
    date: "2026-03-28",
    dateLabel: "Jumat, 28 Maret 2026",
    timeRange: "14:00 - 14:30 WIB",
    status: "no-show",
    complaint: "Konsultasi pelatihan fungsional PBJ.",
    guestCount: 1,
    asalInstansi: "Perguruan Tinggi",
    location: "PPSDM PBJ",
    summaryNote: "Pengguna tidak hadir pada jadwal yang ditetapkan.",
    activityLog: [
      "Antrian tersimpan di sistem.",
      "Pengguna tidak check-in di frontdesk.",
      "Antrian ditutup dengan status tidak hadir.",
    ],
    preparationChecklist: [
      "Buat jadwal baru jika masih memerlukan layanan pelatihan.",
      "Pastikan kontak dan pengingat aktif agar tidak melewatkan slot.",
    ],
  },
];

export function getUserAppointmentById(id: string) {
  return userAppointments.find((appointment) => appointment.id === id);
}

export function getUserAppointmentsByState(state: "active" | "history") {
  return userAppointments.filter((appointment) =>
    state === "active"
      ? ["booked", "confirmed", "escalated", "calling", "in-service"].includes(appointment.status)
      : ["completed", "unprocessed", "cancelled", "no-show"].includes(
          appointment.status,
        ),
  );
}

export function getUserAppointmentPresentation(
  id: string,
): UserAppointmentPresentation | null {
  const appointment = getUserAppointmentById(id);

  if (!appointment) {
    return null;
  }

  const service = getBookingServiceById(appointment.serviceId);

  return {
    ...appointment,
    serviceTitle: service?.title ?? appointment.serviceId,
    serviceOfficialName: service?.officialName ?? appointment.serviceId,
    serviceGroupLabel: service?.groupLabel ?? "Layanan LKPP",
    unitLabel: service?.unitLabel ?? "Unit layanan LKPP",
  };
}
