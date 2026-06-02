import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  ChartColumn,
  ClipboardList,
  Download,
  FileBarChart2,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";

import {
  type InternalStaffRole,
  getInternalRoleBasePath,
} from "@/lib/internal-role-policy";

export type InternalRole = InternalStaffRole;
export type InternalPageKey =
  | "dashboard"
  | "riwayat"
  | "profil"
  | "pengaturan"
  | "data-antrean"
  | "inbox-eskalasi"
  | "analitik-unit"
  | "monitoring"
  | "data-ekspor"
  | "layanan"
  | "login-penugasan"
  | "pengguna-umum"
  | "unit-organisasi"
  | "pengumuman"
  | "operasional"
  | "faq-bantuan"
  | "hak-akses-role"
  | "ekspor-data"
  | "data-referensi"
  | "aktivitas";

export type WorkspaceRow = {
  id: string;
  title: string;
  status: string;
  note: string;
};

export type WorkspaceStat = {
  label: string;
  value: string;
  description: string;
  tone?: "role" | "info" | "warning" | "success" | "danger" | "neutral";
};

export type WorkspacePoint = {
  icon: LucideIcon;
  text: string;
};

export type WorkspacePageConfig = {
  title: string;
  description: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroPrimaryAction: string;
  heroSecondaryAction?: string;
  stats: WorkspaceStat[];
  tableEyebrow: string;
  insightEyebrow: string;
  insightTitle: string;
  insightDescription: string;
  insightPoints: WorkspacePoint[];
  rows: WorkspaceRow[];
  workspaceNote?: string;
  actionPills?: string[];
};

type RolePageRegistry = Partial<
  Record<InternalRole, Partial<Record<InternalPageKey, WorkspacePageConfig>>>
>;

function createSettingsPageConfig({
  title,
  description,
  heroEyebrow,
  heroTitle,
  heroDescription,
  heroPrimaryAction = "Simpan Pengaturan",
  heroSecondaryAction = "Reset Default",
  stats,
  rows,
  insightPoints,
  actionPills,
}: {
  title: string;
  description: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroPrimaryAction?: string;
  heroSecondaryAction?: string;
  stats: WorkspaceStat[];
  rows: WorkspaceRow[];
  insightPoints: WorkspacePoint[];
  actionPills?: string[];
}): WorkspacePageConfig {
  return {
    title,
    description,
    heroEyebrow,
    heroTitle,
    heroDescription,
    heroPrimaryAction,
    heroSecondaryAction,
    stats,
    tableEyebrow: "Preferensi kerja",
    insightEyebrow: "Kontrol sistem",
    insightTitle: "Pengaturan perlu konsisten agar pengalaman kerja tertib",
    insightDescription:
      "Halaman ini mengatur preferensi tampilan, notifikasi, dan ketentuan kerja ringan agar setiap peran bekerja dengan pola yang konsisten dan mudah diaudit.",
    insightPoints,
    rows,
    workspaceNote:
      "Pengaturan yang rapi menjaga pengalaman kerja tetap konsisten di seluruh peran.",
    actionPills: actionPills ?? ["Simpan Pengaturan", "Reset Default"],
  };
}

const humasAdminServiceRows: WorkspaceRow[] = [
  {
    id: "KL-01",
    title: "Penafsiran Peraturan PBJ",
    status: "Aktif",
    note: "Loket Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Umum",
  },
  {
    id: "KL-02",
    title: "Diseminasi Peraturan PBJ",
    status: "Aktif",
    note: "Luring, tatap muka, dan daring untuk layanan peraturan",
  },
  {
    id: "KL-03",
    title: "Konsultasi Akun INAPROC, SPSE, SIKaP, dan SPSE ICB",
    status: "Aktif",
    note: "Loket Direktorat Sistem Pengadaan Digital",
  },
  {
    id: "KL-04",
    title: "Sosialisasi Katalog Elektronik dan Toko Daring",
    status: "Aktif",
    note: "Loket Direktorat Pasar Pengadaan Digital",
  },
  {
    id: "KL-05",
    title: "Pelatihan Teknis, Fungsional, dan Akreditasi LPPBJ",
    status: "Aktif",
    note: "PPSDM Pengadaan Barang/Jasa",
  },
  {
    id: "KL-06",
    title: "Verifikasi LPSE dan Bimtek Standarisasi LPSE",
    status: "Perlu Review",
    note: "BHU dan LPSE LKPP perlu sinkronisasi deskripsi publik",
  },
];

const humasAdminFaqRows: WorkspaceRow[] = [
  {
    id: "FAQ-01",
    title: "FAQ check-in, antrean, dan jadwal kunjungan",
    status: "Aktif",
    note: "Dipakai di landing, dashboard pengguna, dan bantuan publik",
  },
  {
    id: "FAQ-02",
    title: "Panduan kendala akun INAPROC, SPSE, SIKaP, dan SPSE ICB",
    status: "Aktif",
    note: "Harus sinkron dengan layanan Direktorat Sistem Pengadaan Digital",
  },
  {
    id: "FAQ-03",
    title: "Panduan Katalog Elektronik dan Toko Daring",
    status: "Perlu Review",
    note: "Kategori keluhan K/L/PD dan penyedia perlu dipisah lebih jelas",
  },
  {
    id: "FAQ-04",
    title: "Bantuan publikasi pengumuman dan perubahan jadwal",
    status: "Aktif",
    note: "Terhubung ke banner publik dan notifikasi sistem",
  },
];

const rolePageConfigs: RolePageRegistry = {
  resepsionis: {
    dashboard: {
      title: "Dashboard Resepsionis",
      description: "Check-in tamu hari ini dan pantau antrean yang sudah hadir.",
      heroEyebrow: "Area Resepsionis",
      heroTitle: "Check-in tamu hari ini",
      heroDescription:
        "Resepsionis hanya mencatat kehadiran dan menyiapkan antrean untuk unit tujuan.",
      heroPrimaryAction: "Check-in Tamu",
      heroSecondaryAction: "Riwayat",
      stats: [
        { label: "Belum Check-in", value: "6", description: "Belum hadir di loket layanan." },
        { label: "Sudah Hadir", value: "4", description: "Siap diarahkan ke unit.", tone: "info" },
        { label: "Dipanggil Unit", value: "2", description: "Sedang ditangani unit.", tone: "warning" },
        { label: "Selesai", value: "18", description: "Layanan tuntas hari ini.", tone: "success" },
      ],
      tableEyebrow: "Antrean hari ini",
      insightEyebrow: "Fokus kerja",
      insightTitle: "Resepsionis hanya check-in dan membaca antrean yang hadir",
      insightDescription:
        "Resepsionis perlu melihat siapa yang hadir dan siapa yang harus diteruskan ke unit. Jika hak akses panggil antrean diaktifkan, aksi panggil juga muncul di dashboard resepsionis.",
      insightPoints: [
        { icon: ClipboardList, text: "Check-in menjadi pintu masuk semua layanan tatap muka." },
        { icon: Bell, text: "Tamu yang siap dipanggil harus langsung terlihat jelas." },
        { icon: AlertTriangle, text: "Hak akses panggil antrean bisa diaktifkan khusus bila resepsionis ikut memanggil tamu." },
      ],
      rows: [
        { id: "D11-02002", title: "Diseminasi Peraturan", status: "Dipanggil Unit", note: "Sudah diteruskan ke unit" },
        { id: "D23-01004", title: "Pelatihan Teknis", status: "Sudah Hadir", note: "Menunggu panggilan unit" },
        { id: "D23-01001", title: "Bimbingan Teknis", status: "Belum Check-in", note: "Perlu konfirmasi kehadiran" },
      ],
      workspaceNote:
        "Resepsionis mencatat check-in dan, bila diizinkan admin, bisa memanggil antrean yang sudah hadir.",
      actionPills: ["Check-in Tamu", "Riwayat", "Hari Ini"],
    },
    riwayat: {
      title: "Riwayat Resepsionis",
      description: "Telusuri antrean selesai, batal, dan tidak hadir untuk evaluasi layanan resepsionis.",
      heroEyebrow: "Riwayat Layanan",
      heroTitle: "Jejak antrean yang sudah diproses",
      heroDescription:
        "Gunakan riwayat untuk membaca pola kehadiran, membandingkan hasil check-in, dan melihat kasus yang perlu ditindaklanjuti.",
      heroPrimaryAction: "Ekspor Riwayat",
      heroSecondaryAction: "Filter",
      stats: [
        { label: "Total", value: "42", description: "Seluruh antrean yang tercatat hari ini." },
        { label: "Selesai", value: "34", description: "Ditutup tanpa kendala.", tone: "success" },
        {
          label: "Tidak Diproses",
          value: "2",
          description: "Hari layanan berganti sebelum antrean selesai diproses.",
          tone: "warning",
        },
        { label: "Batal", value: "3", description: "Tidak dilanjutkan ke unit.", tone: "warning" },
        { label: "Tidak Hadir", value: "5", description: "Lewat slot kehadiran.", tone: "neutral" },
      ],
      tableEyebrow: "Riwayat resepsionis",
      insightEyebrow: "Audit resepsionis",
      insightTitle: "Riwayat membantu membaca kualitas layanan loket",
      insightDescription:
        "Dari sini tim dapat melihat pola keterlambatan, antrean yang salah tujuan, dan layanan yang kerap memerlukan bantuan resepsionis.",
      insightPoints: [
        { icon: ScrollText, text: "Catatan keputusan loket perlu mudah ditelusuri." },
        { icon: TrendingUp, text: "Pola keterlambatan membantu atur ulang slot layanan." },
        { icon: AlertTriangle, text: "Kasus batal atau tidak hadir harus mudah dipisahkan." },
      ],
      rows: [
        { id: "RH-101", title: "Konsultasi Strategi PBJ", status: "Selesai", note: "Ditutup 10:40 WIB" },
        { id: "RH-102", title: "Pendampingan LPSE", status: "Batal", note: "Pengunjung menjadwalkan ulang" },
        { id: "RH-103", title: "Sosialisasi Katalog", status: "Tidak Check-in", note: "Melewati batas hadir" },
      ],
      actionPills: ["Ekspor Riwayat", "Filter", "Lihat Hari Ini"],
    },
    profil: {
      title: "Profil Resepsionis",
      description: "Ringkasan akun, penugasan loket, dan akses resepsionis.",
      heroEyebrow: "Profil & Penugasan",
      heroTitle: "Akun dan area kerja resepsionis",
      heroDescription: "Lihat identitas petugas, shift aktif, dan akses resepsionis yang sedang dipakai.",
      heroPrimaryAction: "Perbarui Profil",
      heroSecondaryAction: "Lihat Shift",
      stats: [
        { label: "Shift Aktif", value: "Pagi", description: "Sesi kerja hari ini." },
        { label: "Meja Layanan", value: "2", description: "Titik loket yang diawasi.", tone: "info" },
        { label: "Layanan Aktif", value: "8", description: "Kategori layanan yang dipahami.", tone: "role" },
        { label: "Akses", value: "Resepsionis", description: "Hak akses operasional utama.", tone: "success" },
      ],
      tableEyebrow: "Detail akun",
      insightEyebrow: "Konteks akun",
      insightTitle: "Profil dipakai sebagai ringkasan penugasan",
      insightDescription:
        "Tim resepsionis perlu cepat mengetahui peran, cakupan tugas, dan kontak yang dipakai selama jam layanan berlangsung.",
      insightPoints: [
        { icon: UserRound, text: "Data akun harus mudah diverifikasi sebelum mulai shift." },
        { icon: CalendarClock, text: "Shift dan penugasan harian perlu terlihat ringkas." },
        { icon: ShieldCheck, text: "Hak akses harus jelas agar perubahan peran mudah ditelusuri." },
      ],
      rows: [
        { id: "PF-01", title: "Nama Petugas", status: "Aktif", note: "Rina Kurniasih" },
        { id: "PF-02", title: "Nomor Internal", status: "Terverifikasi", note: "Ext. 112" },
        { id: "PF-03", title: "Penugasan", status: "Resepsionis", note: "Loket utama lantai 1" },
      ],
    },
    pengaturan: createSettingsPageConfig({
      title: "Pengaturan Resepsionis",
      description: "Atur preferensi resepsionis, notifikasi panggilan, dan tampilan antrean agar alur layanan tetap konsisten.",
      heroEyebrow: "Preferensi Resepsionis",
      heroTitle: "Kontrol layanan loket",
      heroDescription: "Atur tampilan check-in, notifikasi panggilan unit, dan keterbacaan antrean.",
      stats: [
        { label: "Preset Resepsionis", value: "Aktif", description: "Tampilan utama sedang digunakan.", tone: "success" },
        { label: "Notifikasi", value: "3", description: "Jenis notifikasi operasional aktif.", tone: "info" },
        { label: "Antrian Cepat", value: "On", description: "Prioritas antrean siap tampil.", tone: "role" },
        { label: "Perlu Cek", value: "1", description: "Ada preferensi yang belum disimpan.", tone: "warning" },
      ],
      rows: [
        { id: "SET-R01", title: "Mode tampilan resepsionis", status: "Aktif", note: "Layout standar loket utama" },
        { id: "SET-R02", title: "Notifikasi panggilan unit", status: "Aktif", note: "Muncul langsung di halaman resepsionis" },
        { id: "SET-R03", title: "Prioritas antrean hadir", status: "Siap", note: "Urutan hadir tampil lebih dulu" },
      ],
      insightPoints: [
        { icon: SlidersHorizontal, text: "Preferensi tampilan harus membantu baca antrean lebih cepat." },
        { icon: Bell, text: "Notifikasi panggilan unit perlu tetap tenang tapi terlihat." },
        { icon: ShieldCheck, text: "Perubahan pengaturan harus bisa ditelusuri saat ada komplain operasional." },
      ],
    }),
  },
  "unit-organisasi": {
    dashboard: {
      title: "Dashboard Unit Organisasi",
      description: "Ringkasan antrean dan akses cepat unit.",
      heroEyebrow: "Ringkasan Hari Ini",
      heroTitle: "Antrean unit hari ini",
      heroDescription: "Buka antrean berikutnya dan fitur utama unit dari satu halaman ringkas.",
      heroPrimaryAction: "Data Antrean",
      heroSecondaryAction: "Analitik Unit",
      stats: [
        { label: "Menunggu", value: "9", description: "Belum check-in.", tone: "neutral" },
        { label: "Siap Dipanggil", value: "3", description: "Sudah hadir.", tone: "info" },
        { label: "Sedang Dilayani", value: "2", description: "Aktif di meja.", tone: "warning" },
        { label: "Selesai", value: "15", description: "Selesai hari ini.", tone: "success" },
      ],
      tableEyebrow: "Antrean unit",
      insightEyebrow: "Aturan kerja",
      insightTitle: "Unit hanya memproses antrean yang sudah check-in",
      insightDescription: "Jaga ritme panggilan dan pastikan layanan ditutup dengan catatan.",
      insightPoints: [
        { icon: TrendingUp, text: "Lihat antrean berikutnya dengan cepat." },
        { icon: SlidersHorizontal, text: "Jaga urutan antrean dan perpindahan layanan tetap rapi." },
        { icon: ClipboardList, text: "Tutup layanan dengan catatan minimum." },
      ],
      rows: [
        { id: "U01-1001", title: "Layanan Konsultasi Strategis", status: "Siap Dipanggil", note: "Tamu sudah check-in" },
        { id: "U01-1002", title: "Bimtek Perencanaan", status: "Sedang Dilayani", note: "Sedang diproses petugas" },
        { id: "U01-1003", title: "Diseminasi Katalog", status: "Selesai", note: "Ditutup pukul 10:12" },
      ],
      workspaceNote:
        "Hanya antrean yang sudah check-in yang boleh dipanggil.",
      actionPills: ["Data Antrean", "Analitik Unit", "Segarkan"],
    },
    "data-antrean": {
      title: "Data Antrean Unit",
      description: "Daftar antrean aktif unit untuk hari ini.",
      heroEyebrow: "Data Antrean",
      heroTitle: "Data antrean",
      heroDescription:
        "Fokus pada antrean aktif, status, dan aksi kerja unit.",
      heroPrimaryAction: "Segarkan Antrean",
      heroSecondaryAction: "Analitik Unit",
      stats: [
        { label: "Belum Check-in", value: "9", description: "Menunggu loket layanan.", tone: "neutral" },
        { label: "Menunggu Panggilan", value: "7", description: "Sudah check-in.", tone: "info" },
        { label: "Dipanggil / Dilayani", value: "3", description: "Sedang berjalan.", tone: "warning" },
        { label: "Selesai", value: "17", description: "Ditutup hari ini.", tone: "success" },
      ],
      tableEyebrow: "Kelompok antrean",
      insightEyebrow: "Aturan kerja",
      insightTitle: "Hanya antrean yang sudah check-in yang boleh dipanggil",
      insightDescription:
        "Petugas unit menggunakan halaman ini untuk memilih antrean berikutnya, membaca catatan layanan, dan menindaklanjuti perpindahan layanan. Tamu yang belum check-in tidak dapat dipanggil.",
      insightPoints: [
        { icon: ClipboardList, text: "Nomor antrean, layanan, dan catatan layanan harus terbaca cepat." },
        { icon: AlertTriangle, text: "Antrean tertahan dan perpindahan layanan perlu dibedakan jelas." },
        { icon: Bell, text: "Perubahan status harus langsung tampak pada daftar utama." },
      ],
      rows: [
        { id: "AN-201", title: "Konsultasi Strategi Pengadaan", status: "Siap Dipanggil", note: "Sudah check-in" },
        { id: "AN-202", title: "Pendampingan Katalog", status: "Sedang Dilayani", note: "Catatan layanan aktif" },
        { id: "AN-203", title: "Validasi Bimtek", status: "Selesai", note: "Ditutup oleh petugas unit" },
      ],
      workspaceNote:
        "Aksi kerja unit: Panggil, Panggil Ulang, Melayani, Selesai, Lewati dulu, Catatan, dan Ganti layanan.",
      actionPills: ["Panggil", "Panggil Ulang", "Melayani", "Selesai", "Lewati dulu", "Catatan", "Ganti layanan"],
    },
    "analitik-unit": {
      title: "Analitik Unit",
      description: "Baca volume layanan, ritme antrean, dan titik padat unit.",
      heroEyebrow: "Analitik Harian",
      heroTitle: "Analitik unit",
      heroDescription:
        "Fokus pada layanan terpadat, komposisi antrean, dan jam ramai unit.",
      heroPrimaryAction: "Buka Data Antrean",
      heroSecondaryAction: "Dashboard Unit",
      stats: [
        { label: "Rata-rata Tunggu", value: "12m", description: "Masih dalam target layanan." },
        { label: "Selesai Hari Ini", value: "21", description: "Layanan yang ditutup hari ini.", tone: "success" },
        { label: "Puncak Antrean", value: "10:00", description: "Jam terpadat unit.", tone: "warning" },
        { label: "SLA", value: "92%", description: "Antrean selesai tepat waktu.", tone: "info" },
      ],
      tableEyebrow: "Indikator kinerja",
      insightEyebrow: "Bacaan pimpinan",
      insightTitle: "Analitik harus menjawab ritme operasional",
      insightDescription:
        "Analitik unit perlu menunjukkan kapan antrean menumpuk, layanan mana yang dominan, dan kapan meja layanan mulai padat.",
      insightPoints: [
        { icon: TrendingUp, text: "Rata-rata tunggu menjadi indikator kualitas pelayanan." },
        { icon: ChartColumn, text: "Layanan paling padat membantu penataan kapasitas." },
        { icon: FileBarChart2, text: "Pola harian harus mudah dibaca tanpa bergantung ke file ekspor." },
      ],
      rows: [
        { id: "AL-01", title: "Waktu tunggu rata-rata", status: "Normal", note: "12 menit" },
        { id: "AL-02", title: "Layanan tersibuk", status: "Katalog", note: "7 antrean hari ini" },
        { id: "AL-03", title: "Antrean melewati SLA", status: "Perlu review", note: "2 antrean di atas 20 menit" },
      ],
      actionPills: ["Rentang Waktu", "Layanan", "Buka Data Antrean"],
    },
    profil: {
      title: "Profil Unit",
      description: "Ringkasan identitas unit, layanan aktif, dan akses operasional.",
      heroEyebrow: "Profil Unit",
      heroTitle: "Identitas unit dan layanan aktif",
      heroDescription: "Lihat unit aktif, PIC, dan layanan yang berada di bawah unit ini.",
      heroPrimaryAction: "Perbarui Unit",
      heroSecondaryAction: "Lihat PIC",
      stats: [
        { label: "PIC Aktif", value: "4", description: "Petugas yang bertugas hari ini." },
        { label: "Layanan Dikelola", value: "6", description: "Jenis layanan milik unit.", tone: "info" },
        { label: "Kapasitas Harian", value: "32", description: "Slot layanan aktif.", tone: "role" },
        { label: "Status", value: "Aktif", description: "Unit tersedia untuk layanan.", tone: "success" },
      ],
      tableEyebrow: "Ringkasan unit",
      insightEyebrow: "Konteks struktur",
      insightTitle: "Profil unit harus menyatukan identitas dan kapasitas",
      insightDescription:
        "Saat kapasitas berubah, petugas perlu tahu siapa PIC, layanan apa saja yang aktif, dan jalur koordinasi unit.",
      insightPoints: [
        { icon: BriefcaseBusiness, text: "Identitas unit perlu jelas untuk pengunjung dan admin." },
        { icon: Users, text: "PIC aktif membantu koordinasi layanan harian." },
        { icon: ShieldCheck, text: "Status unit harus sinkron dengan hak akses dashboard." },
      ],
      rows: [
        { id: "UP-01", title: "Nama Unit", status: "Aktif", note: "Direktorat Strategi Pengadaan" },
        { id: "UP-02", title: "PIC Hari Ini", status: "Terverifikasi", note: "2 petugas pagi, 2 petugas siang" },
        { id: "UP-03", title: "Nomor Internal", status: "Siap", note: "Ext. 214 / 215" },
      ],
    },
    pengaturan: createSettingsPageConfig({
      title: "Pengaturan Unit",
      description: "Atur preferensi antrean, kapasitas kerja, dan pola tampilan unit agar keputusan layanan tetap konsisten.",
      heroEyebrow: "Preferensi Unit",
      heroTitle: "Kontrol unit untuk tampilan dan ritme layanan",
      heroDescription: "Atur cara antrean dibaca, disegarkan, dan disorot di ruang kerja unit.",
      stats: [
        { label: "Kapasitas Aktif", value: "32", description: "Slot layanan default unit hari ini.", tone: "success" },
        { label: "Preset Antrean", value: "2", description: "Aturan pengurutan antrean aktif.", tone: "info" },
        { label: "Notifikasi Meja", value: "On", description: "Panggilan internal sedang aktif.", tone: "role" },
        { label: "Perlu Review", value: "1", description: "Aturan SLA unit belum diperbarui.", tone: "warning" },
      ],
      rows: [
        { id: "SET-U01", title: "Urutan antrean layanan", status: "Aktif", note: "Mengutamakan antrean siap dan antrean panggil ulang" },
        { id: "SET-U02", title: "Batas kapasitas per sesi", status: "Aktif", note: "32 slot layanan per hari" },
        { id: "SET-U03", title: "Notifikasi panggilan meja", status: "Siap", note: "Suara dan indikator visual aktif" },
      ],
      insightPoints: [
        { icon: SlidersHorizontal, text: "Pengaturan unit harus memudahkan penataan ritme kerja." },
        { icon: TrendingUp, text: "Kapasitas dan SLA perlu mudah ditinjau saat antrean menumpuk." },
        { icon: ShieldCheck, text: "Aturan kerja unit harus konsisten dengan dashboard publik dan monitoring." },
      ],
      actionPills: ["Simpan Pengaturan", "Reset Default"],
    }),
  },
  "petugas-level-2": {
    dashboard: {
      title: "Dashboard Petugas Level 2",
      description: "Ringkasan antrean eskalasi hari ini.",
      heroEyebrow: "Level 2",
      heroTitle: "Inbox eskalasi",
      heroDescription: "Petugas level 2 menangani eskalasi dari layanan sebelumnya.",
      heroPrimaryAction: "Buka Inbox",
      heroSecondaryAction: "Profil Petugas",
      stats: [
        { label: "Inbox Aktif", value: "6", description: "Perlu tindak lanjut.", tone: "info" },
        { label: "Siap Ditangani", value: "3", description: "Sudah bisa diambil.", tone: "warning" },
        { label: "Sedang Dilayani", value: "2", description: "Masih berjalan.", tone: "role" },
        { label: "Selesai", value: "9", description: "Ditutup hari ini.", tone: "success" },
      ],
      tableEyebrow: "Antrean level 2",
      insightEyebrow: "Ritme kerja",
      insightTitle: "Fokus pada eskalasi siap tindak",
      insightDescription:
        "Baca asal eskalasi, tujuan layanan, dan catatan.",
      insightPoints: [
        { icon: AlertTriangle, text: "Asal eskalasi harus jelas." },
        { icon: ClipboardList, text: "Bedakan antrean siap dan aktif." },
        { icon: ShieldCheck, text: "Penutupan perlu catatan." },
      ],
      rows: [
        { id: "D11-02-001", title: "Pendalaman Penafsiran PBJ Level 2", status: "Siap Dipanggil", note: "Eskalasi dari layanan regulasi." },
        { id: "D22-02-004", title: "Investigasi Kendala SPSE Level 2", status: "Sedang Dilayani", note: "Perlu verifikasi lanjutan." },
        { id: "D31-02-002", title: "Pendampingan JF PBJ Level 2", status: "Selesai", note: "Sudah ditutup dengan catatan." },
      ],
      workspaceNote: "Level 2 menangani eskalasi dan penutupan.",
      actionPills: ["Inbox", "Melayani", "Selesaikan", "Catatan"],
    },
    "inbox-eskalasi": {
      title: "Inbox Eskalasi",
      description: "Daftar antrean level 2 untuk ditindaklanjuti.",
      heroEyebrow: "Level 2",
      heroTitle: "Antrean yang perlu ditangani",
      heroDescription: "Gunakan halaman ini untuk memulai, mencatat, dan menutup layanan.",
      heroPrimaryAction: "Muat Ulang",
      heroSecondaryAction: "Dashboard",
      stats: [
        { label: "Inbox Aktif", value: "6", description: "Antrean terbaca.", tone: "info" },
        { label: "Siap Ditangani", value: "3", description: "Sudah bisa diambil.", tone: "warning" },
        { label: "Sedang Dilayani", value: "2", description: "Masih berjalan.", tone: "role" },
        { label: "Selesai", value: "9", description: "Sudah ditutup hari ini.", tone: "success" },
      ],
      tableEyebrow: "Inbox level 2",
      insightEyebrow: "Aturan kerja",
      insightTitle: "Eskalasi masuk, ditangani, lalu ditutup",
      insightDescription: "Baca asal eskalasi dan tujuan layanan.",
      insightPoints: [
        { icon: ClipboardList, text: "Nomor, alasan, dan tujuan harus cepat terbaca." },
        { icon: TrendingUp, text: "Pisahkan antrean siap dan aktif." },
        { icon: ShieldCheck, text: "Penutupan perlu catatan." },
      ],
      rows: [
        { id: "D11-02-001", title: "Pendalaman Penafsiran PBJ Level 2", status: "Siap Dipanggil", note: "Asal eskalasi dari meja level 1." },
        { id: "D22-02-004", title: "Investigasi Kendala SPSE Level 2", status: "Sedang Dilayani", note: "Sedang ditangani petugas digital." },
        { id: "D31-02-002", title: "Pendampingan JF PBJ Level 2", status: "Selesai", note: "Ringkasan sudah dikirim ke unit asal." },
      ],
      workspaceNote: "Aksi utama: Melayani, Catatan, Selesaikan.",
      actionPills: ["Melayani", "Catatan", "Selesaikan", "Muat Ulang"],
    },
    profil: {
      title: "Profil Petugas Level 2",
      description: "Ringkasan akun dan cakupan layanan level 2.",
      heroEyebrow: "Profil Petugas",
      heroTitle: "Akun dan cakupan level 2",
      heroDescription: "Lihat petugas aktif, unit, dan layanan terkait.",
      heroPrimaryAction: "Perbarui Profil",
      heroSecondaryAction: "Lihat Inbox",
      stats: [
        { label: "Layanan Level 2", value: "4", description: "Layanan aktif.", tone: "info" },
        { label: "Unit Terkait", value: "1", description: "Unit penugasan.", tone: "role" },
        { label: "Status Petugas", value: "Aktif", description: "Siap menerima eskalasi.", tone: "success" },
        { label: "Catatan Harian", value: "6", description: "Jejak tindak lanjut.", tone: "warning" },
      ],
      tableEyebrow: "Ringkasan petugas",
      insightEyebrow: "Konteks layanan",
      insightTitle: "Profil yang jelas menjaga eskalasi tetap terarah",
      insightDescription: "Identitas, unit, dan kanal koordinasi harus cepat terbaca.",
      insightPoints: [
        { icon: Users, text: "Petugas harus jelas bagi unit asal." },
        { icon: BriefcaseBusiness, text: "Daftar layanan membantu membaca cakupan." },
        { icon: ShieldCheck, text: "Profil yang rapi membantu audit." },
      ],
      rows: [
        { id: "L2-01", title: "Nama Petugas", status: "Aktif", note: "Petugas level 2 aktif" },
        { id: "L2-02", title: "Cakupan Layanan", status: "Terverifikasi", note: "Layanan level 2 dan eskalasi" },
        { id: "L2-03", title: "Kontak Internal", status: "Siap", note: "Kanal koordinasi aktif" },
      ],
    },
    pengaturan: createSettingsPageConfig({
      title: "Pengaturan Petugas Level 2",
      description: "Atur tampilan inbox, alert, dan catatan penutupan.",
      heroEyebrow: "Preferensi Level 2",
      heroTitle: "Kontrol inbox",
      heroDescription: "Atur tampilan, notifikasi, dan catatan.",
      stats: [
        { label: "Preset Inbox", value: "Aktif", description: "Tampilan utama dipakai.", tone: "success" },
        { label: "Notifikasi", value: "2", description: "Alert tindak lanjut aktif.", tone: "info" },
        { label: "Sorotan Eskalasi", value: "On", description: "Eskalasi ditonjolkan.", tone: "role" },
        { label: "Perlu Review", value: "1", description: "Format catatan belum disimpan.", tone: "warning" },
      ],
      rows: [
        { id: "SET-L201", title: "Urutan inbox", status: "Aktif", note: "Mendahulukan antrean siap dan aktif" },
        { id: "SET-L202", title: "Format catatan", status: "Aktif", note: "Template ringkas level 2" },
        { id: "SET-L203", title: "Notifikasi eskalasi", status: "Siap", note: "Alert visual saat antrean baru masuk" },
      ],
      insightPoints: [
        { icon: SlidersHorizontal, text: "Tampilan inbox harus membantu fokus." },
        { icon: AlertTriangle, text: "Notifikasi baru perlu terlihat jelas." },
        { icon: ShieldCheck, text: "Catatan level 2 harus konsisten." },
      ],
    }),
  },
  "supervisor-monitoring": {
    dashboard: {
      title: "Dashboard Supervisor Monitoring",
      description: "Lihat ringkasan kinerja lintas unit, bottleneck, dan layanan yang perlu intervensi.",
      heroEyebrow: "Area Monitoring",
      heroTitle: "Ringkasan lintas unit",
      heroDescription:
        "Supervisor butuh view cepat untuk melihat SLA, antrian rawan eskalasi, dan performa unit paling sibuk.",
      heroPrimaryAction: "Export Ringkasan",
      heroSecondaryAction: "Monitoring",
      stats: [
        { label: "Unit Dipantau", value: "14", description: "Unit aktif dalam monitoring." },
        { label: "Perlu Review", value: "3", description: "Butuh keputusan supervisor.", tone: "warning" },
        { label: "Dalam SLA", value: "11", description: "Masih sesuai target waktu.", tone: "info" },
        { label: "Terselesaikan", value: "29", description: "Kasus selesai hari ini.", tone: "success" },
      ],
      tableEyebrow: "Monitoring lintas unit",
      insightEyebrow: "Keputusan cepat",
      insightTitle: "Fokus pada unit yang perlu intervensi",
      insightDescription:
        "Dashboard supervisor harus membantu membedakan isu normal dan isu yang butuh eskalasi atau tindakan cepat.",
      insightPoints: [
        { icon: TrendingUp, text: "Rata-rata waktu tunggu perlu terlihat ringkas." },
        { icon: AlertTriangle, text: "Antrean eskalasi harus muncul sebagai sinyal utama." },
        { icon: Download, text: "Ekspor data dan monitoring harus dekat dengan ringkasan." },
      ],
      rows: [
        { id: "MON-01", title: "Rata-rata waktu tunggu Unit D1", status: "Normal", note: "Masih dalam SLA" },
        { id: "MON-02", title: "Layanan eskalasi lintas unit", status: "Perlu Tinjau", note: "Ada 2 antrean tertunda" },
        { id: "MON-03", title: "Distribusi antrean puncak", status: "Stabil", note: "Lonjakan terkendali" },
      ],
    },
    monitoring: {
      title: "Monitoring Supervisor",
      description: "Pantau antrean lintas unit, SLA, dan sinyal operasional yang perlu tindakan cepat.",
      heroEyebrow: "Monitoring Aktif",
      heroTitle: "Panel kontrol untuk membaca bottleneck",
      heroDescription:
        "Halaman ini memusatkan daftar unit yang perlu perhatian, antrean kritis, dan perubahan kondisi layanan dari menit ke menit.",
      heroPrimaryAction: "Segarkan Monitoring",
      heroSecondaryAction: "Ekspor",
      stats: [
        { label: "Unit Kritis", value: "2", description: "Melewati batas tunggu.", tone: "warning" },
        { label: "Antrean Eskalasi", value: "5", description: "Perlu intervensi supervisor.", tone: "danger" },
        { label: "Stabil", value: "9", description: "Berjalan sesuai ritme.", tone: "success" },
        { label: "Sinyal Baru", value: "4", description: "Perubahan status 30 menit terakhir.", tone: "info" },
      ],
      tableEyebrow: "Sinyal lintas unit",
      insightEyebrow: "Prioritas intervensi",
      insightTitle: "Monitoring bukan sekadar melihat, tapi memutuskan",
      insightDescription:
        "Supervisor membutuhkan konteks siapa yang perlu dibantu dulu, unit mana yang melambat, dan dampaknya ke antrean publik.",
      insightPoints: [
        { icon: AlertTriangle, text: "Antrean kritis harus muncul di urutan pertama." },
        { icon: Bell, text: "Perubahan SLA perlu dibaca tanpa membuka detail unit." },
        { icon: ChartColumn, text: "Ringkasan kinerja tetap harus siap diekspor." },
      ],
      rows: [
        { id: "SM-01", title: "Unit Katalog Elektronik", status: "Perlu Tinjau", note: "Tunggu rata-rata 27 menit" },
        { id: "SM-02", title: "Unit Advokasi", status: "Normal", note: "SLA aman" },
        { id: "SM-03", title: "Unit Pelatihan", status: "Diproses", note: "Supervisor sudah memberi arahan" },
      ],
    },
    "data-ekspor": {
      title: "Data Ekspor Supervisor",
      description: "Siapkan ringkasan monitoring, SLA, dan performa unit dalam format yang siap dibawa ke rapat.",
      heroEyebrow: "Ekspor Monitoring",
      heroTitle: "Paket data untuk pelaporan dan evaluasi",
      heroDescription:
        "Supervisor dapat menyiapkan laporan periodik, data harian, dan ringkasan eskalasi dari satu halaman.",
      heroPrimaryAction: "Unduh Paket",
      heroSecondaryAction: "Jadwalkan",
      stats: [
        { label: "Paket Siap", value: "6", description: "Template laporan tersedia." },
        { label: "Jadwal Ekspor", value: "2", description: "Laporan otomatis aktif.", tone: "info" },
        { label: "Perlu Validasi", value: "1", description: "Menunggu pemeriksaan supervisor.", tone: "warning" },
        { label: "Terkirim", value: "14", description: "Laporan terkirim minggu ini.", tone: "success" },
      ],
      tableEyebrow: "Paket laporan",
      insightEyebrow: "Tata Kelola Data",
      insightTitle: "Ekspor harus ringkas, akurat, dan siap distribusi",
      insightDescription:
        "Supervisor tidak perlu merangkai laporan manual satu per satu. Paket ekspor harus sudah menyatukan data inti yang dibutuhkan.",
      insightPoints: [
        { icon: Download, text: "Laporan harus bisa dipilih per periode dan unit." },
        { icon: FileBarChart2, text: "Format ringkasan harus siap pakai untuk rapat pimpinan." },
        { icon: ShieldCheck, text: "Validasi akhir penting untuk menjaga akurasi data." },
      ],
      rows: [
        { id: "EX-01", title: "Laporan SLA Harian", status: "Siap", note: "CSV dan PDF tersedia" },
        { id: "EX-02", title: "Rekap Eskalasi Mingguan", status: "Perlu Review", note: "Menunggu catatan supervisor" },
        { id: "EX-03", title: "Distribusi Antrean Bulanan", status: "Terkirim", note: "Dikirim ke pimpinan" },
      ],
    },
    profil: {
      title: "Profil Supervisor",
      description: "Akun, cakupan unit, dan jalur laporan supervisor.",
      heroEyebrow: "Profil Monitoring",
      heroTitle: "Cakupan pengawasan supervisor",
      heroDescription: "Lihat akun aktif, cakupan unit, dan jalur laporan.",
      heroPrimaryAction: "Perbarui Profil",
      heroSecondaryAction: "Lihat Cakupan",
      stats: [
        { label: "Unit Diawasi", value: "14", description: "Cakupan monitoring aktif." },
        { label: "Laporan Tetap", value: "3", description: "Distribusi rutin mingguan.", tone: "info" },
        { label: "Akses", value: "Supervisor", description: "Hak akses lintas unit.", tone: "success" },
        { label: "Kontak", value: "2", description: "Kanal koordinasi aktif.", tone: "role" },
      ],
      tableEyebrow: "Ringkasan akun",
      insightEyebrow: "Konteks pengawas",
      insightTitle: "Profil harus membantu pengawasan lintas unit",
      insightDescription:
        "Saat ada isu, supervisor harus langsung tahu unit cakupan, jalur pelaporan, dan hak akses yang sedang dipakai.",
      insightPoints: [
        { icon: UserRound, text: "Identitas pengawas harus jelas untuk audit internal." },
        { icon: Users, text: "Cakupan unit membantu koordinasi saat eskalasi muncul." },
        { icon: ShieldCheck, text: "Hak akses perlu selalu sinkron dengan peran supervisor." },
      ],
      rows: [
        { id: "SP-01", title: "Nama Supervisor", status: "Aktif", note: "Bima Nurtama" },
        { id: "SP-02", title: "Cakupan Monitoring", status: "Lintas Unit", note: "14 unit layanan" },
        { id: "SP-03", title: "Kontak Pelaporan", status: "Terverifikasi", note: "supervisor@lkpp.go.id" },
      ],
    },
    pengaturan: createSettingsPageConfig({
      title: "Pengaturan Supervisor",
      description: "Atur ambang alert, notifikasi, dan distribusi laporan supervisor.",
      heroEyebrow: "Preferensi Monitoring",
      heroTitle: "Kontrol sinyal monitoring",
      heroDescription: "Atur alert, ambang review, dan distribusi laporan.",
      stats: [
        { label: "Ambang SLA", value: "20 mnt", description: "Batas waktu yang dipakai untuk alert.", tone: "success" },
        { label: "Alert Aktif", value: "4", description: "Jenis eskalasi yang sedang dipantau.", tone: "info" },
        { label: "Distribusi Laporan", value: "3", description: "Paket laporan rutin aktif.", tone: "role" },
        { label: "Perlu Tinjau", value: "1", description: "Aturan notifikasi butuh penyesuaian.", tone: "warning" },
      ],
      rows: [
        { id: "SET-S01", title: "Ambang eskalasi antrean", status: "Aktif", note: "Alert muncul di atas 20 menit" },
        { id: "SET-S02", title: "Distribusi ringkasan harian", status: "Aktif", note: "Terkirim ke pimpinan pukul 15:00 WIB" },
        { id: "SET-S03", title: "Sorotan unit kritis", status: "Siap", note: "Prioritas visual untuk unit dengan anomali" },
      ],
      insightPoints: [
        { icon: AlertTriangle, text: "Threshold alert perlu akurat agar supervisor tidak kewalahan." },
        { icon: Download, text: "Distribusi laporan harus mengikuti kebutuhan rapat dan evaluasi." },
        { icon: ShieldCheck, text: "Perubahan aturan monitoring wajib terlacak dengan rapi." },
      ],
    }),
  },
  "humas-monitoring": {
    dashboard: {
      title: "Dashboard Humas Monitoring",
      description: "Pantau informasi publik, notifikasi layanan, dan hal-hal yang menyentuh pengalaman warga.",
      heroEyebrow: "Humas Monitoring",
      heroTitle: "Komunikasi publik yang tetap sinkron",
      heroDescription:
        "Pantau pengumuman aktif, perubahan jadwal layanan, dan sinyal komunikasi yang harus segera diperbarui.",
      heroPrimaryAction: "Publikasikan",
      heroSecondaryAction: "Monitoring",
      stats: [
        { label: "Pengumuman Aktif", value: "5", description: "Sedang tayang di kanal publik." },
        { label: "Perubahan Jadwal", value: "2", description: "Perlu sinkronisasi halaman.", tone: "warning" },
        { label: "Notifikasi Siap", value: "7", description: "Siap dipublikasikan.", tone: "info" },
        { label: "Selesai Ditangani", value: "14", description: "Update publik hari ini.", tone: "success" },
      ],
      tableEyebrow: "Komunikasi layanan",
      insightEyebrow: "Fokus humas",
      insightTitle: "Pesan publik harus mudah diperbarui",
      insightDescription:
        "Tim humas monitoring perlu melihat apa yang sedang tayang dan apa yang berpotensi membingungkan warga.",
      insightPoints: [
        { icon: Bell, text: "Status pengumuman harus mudah dibedakan." },
        { icon: AlertTriangle, text: "Perubahan layanan perlu diberi perhatian khusus." },
        { icon: Users, text: "Dampak ke warga harus terlihat di ringkasan." },
      ],
      rows: [
        { id: "HUM-01", title: "Pengumuman perpindahan lantai layanan", status: "Aktif", note: "Tayang di landing page" },
        { id: "HUM-02", title: "Notifikasi pemeliharaan sistem", status: "Siap", note: "Menunggu publikasi" },
        { id: "HUM-03", title: "Perubahan slot konsultasi", status: "Perlu Review", note: "Validasi dengan unit terkait" },
      ],
    },
    monitoring: {
      title: "Monitoring Humas",
      description: "Lihat pengumuman publik, perubahan layanan, dan konsistensi informasi yang dibaca warga.",
      heroEyebrow: "Monitoring Publik",
      heroTitle: "Panel pantau komunikasi layanan",
      heroDescription:
        "Pantau apakah informasi di landing, notifikasi jadwal, dan kanal layanan lainnya sudah sinkron dan tidak membingungkan pengguna.",
      heroPrimaryAction: "Publikasikan",
      heroSecondaryAction: "Saring Kanal",
      stats: [
        { label: "Konten Tayang", value: "9", description: "Sedang terlihat publik." },
        { label: "Perlu Sinkron", value: "3", description: "Ada perubahan yang belum seragam.", tone: "warning" },
        { label: "Terverifikasi", value: "5", description: "Sudah dicek tim humas.", tone: "success" },
        { label: "Draft Baru", value: "4", description: "Menunggu publikasi.", tone: "info" },
      ],
      tableEyebrow: "Pantauan kanal",
      insightEyebrow: "Konsistensi publik",
      insightTitle: "Monitoring humas menjaga konteks warga tetap utuh",
      insightDescription:
        "Informasi layanan harus konsisten di semua titik baca. Perubahan kecil pada jam, lokasi, atau slot perlu cepat terlihat.",
      insightPoints: [
        { icon: Bell, text: "Pengumuman aktif harus mudah ditinjau ulang." },
        { icon: AlertTriangle, text: "Perubahan yang berisiko membingungkan harus diutamakan." },
        { icon: ScrollText, text: "Riwayat publikasi membantu audit komunikasi." },
      ],
      rows: [
        { id: "HM-01", title: "Banner pemeliharaan sistem", status: "Aktif", note: "Beranda dan dashboard sinkron" },
        { id: "HM-02", title: "Jadwal layanan hari libur", status: "Perlu Tinjau", note: "Belum tampil di semua kanal" },
        { id: "HM-03", title: "Pemberitahuan antrean penuh", status: "Diproses", note: "Sedang direview tim humas" },
      ],
    },
    "data-ekspor": {
      title: "Data Ekspor Humas Monitoring",
      description: "Siapkan rekap publikasi, perubahan layanan, dan distribusi informasi untuk kebutuhan pelaporan.",
      heroEyebrow: "Ekspor Komunikasi",
      heroTitle: "Rekap informasi publik siap distribusi",
      heroDescription:
        "Gunakan halaman ini untuk menyiapkan laporan pengumuman, notifikasi, dan perubahan layanan yang sudah dipublikasikan.",
      heroPrimaryAction: "Unduh Rekap",
      heroSecondaryAction: "Jadwalkan",
      stats: [
        { label: "Rekap Siap", value: "5", description: "Template laporan aktif." },
        { label: "Distribusi Mingguan", value: "2", description: "Laporan terjadwal.", tone: "info" },
        { label: "Perlu Verifikasi", value: "1", description: "Cek ulang sebelum kirim.", tone: "warning" },
        { label: "Terkirim", value: "12", description: "Rekap terkirim bulan ini.", tone: "success" },
      ],
      tableEyebrow: "Paket humas",
      insightEyebrow: "Pelaporan",
      insightTitle: "Ekspor humas harus mudah dibaca dan mudah dibagikan",
      insightDescription:
        "Humas monitoring sering perlu membawa data cepat ke pimpinan atau unit lain, jadi format ekspornya harus siap pakai.",
      insightPoints: [
        { icon: Download, text: "Rekap publikasi perlu tersedia per periode." },
        { icon: FileBarChart2, text: "Format ringkas memudahkan distribusi internal." },
        { icon: ShieldCheck, text: "Validasi mencegah informasi publik yang salah." },
      ],
      rows: [
        { id: "HE-01", title: "Rekap Pengumuman Tayang", status: "Siap", note: "CSV dan PDF tersedia" },
        { id: "HE-02", title: "Perubahan Jadwal Layanan", status: "Perlu Review", note: "Menunggu verifikasi terakhir" },
        { id: "HE-03", title: "Laporan Notifikasi Mingguan", status: "Terkirim", note: "Dikirim ke humas admin" },
      ],
    },
    profil: {
      title: "Profil Humas Monitoring",
      description: "Akun, kanal pantau, dan konteks monitoring publik.",
      heroEyebrow: "Profil Humas",
      heroTitle: "Cakupan monitoring publik",
      heroDescription: "Lihat akun aktif, kanal pantau, dan konteks kerja humas.",
      heroPrimaryAction: "Perbarui Profil",
      heroSecondaryAction: "Lihat Kanal",
      stats: [
        { label: "Kanal Dipantau", value: "4", description: "Beranda, dashboard, notifikasi, dan FAQ." },
        { label: "Status Akun", value: "Aktif", description: "Akses humas monitoring aktif.", tone: "success" },
        { label: "Distribusi Tetap", value: "2", description: "Rekap mingguan aktif.", tone: "info" },
        { label: "Tugas Hari Ini", value: "5", description: "Item publikasi dan review.", tone: "role" },
      ],
      tableEyebrow: "Ringkasan akun",
      insightEyebrow: "Konteks humas",
      insightTitle: "Profil harus memberi konteks kerja komunikasi",
      insightDescription:
        "Saat menangani pengumuman atau pembaruan layanan, tim perlu tahu cakupan kanal dan kontak koordinasi yang tersedia.",
      insightPoints: [
        { icon: UserRound, text: "Identitas akun memudahkan koordinasi lintas tim." },
        { icon: Bell, text: "Daftar kanal pantauan perlu terlihat jelas." },
        { icon: ShieldCheck, text: "Akses publikasi dan monitoring perlu sinkron." },
      ],
      rows: [
        { id: "HP-01", title: "Nama Petugas", status: "Aktif", note: "Hesti Amalia" },
        { id: "HP-02", title: "Kanal Pantau", status: "Terverifikasi", note: "Beranda, dashboard, notifikasi, dan FAQ" },
        { id: "HP-03", title: "Peran", status: "Monitoring Publik", note: "Koordinasi bersama humas admin" },
      ],
    },
    pengaturan: createSettingsPageConfig({
      title: "Pengaturan Humas Monitoring",
      description: "Atur alert publik, kanal pantau, dan ritme review informasi.",
      heroEyebrow: "Preferensi Humas",
      heroTitle: "Kontrol pantauan publik",
      heroDescription: "Atur alert publik, ritme review, dan distribusi update.",
      stats: [
        { label: "Kanal Pantau", value: "4", description: "Beranda, dashboard, notifikasi, dan FAQ.", tone: "success" },
        { label: "Alert Publik", value: "3", description: "Sinyal perubahan penting yang aktif.", tone: "info" },
        { label: "Distribusi Update", value: "2", description: "Rangkuman publik rutin aktif.", tone: "role" },
        { label: "Perlu Sinkron", value: "1", description: "Ada informasi publik yang perlu diperbarui.", tone: "warning" },
      ],
      rows: [
        { id: "SET-HM01", title: "Alert perubahan jadwal", status: "Aktif", note: "Muncul untuk perubahan layanan publik" },
        { id: "SET-HM02", title: "Review FAQ mingguan", status: "Aktif", note: "Sinkron dengan bantuan publik" },
        { id: "SET-HM03", title: "Distribusi notifikasi internal", status: "Siap", note: "Terkirim ke humas admin dan supervisor" },
      ],
      insightPoints: [
        { icon: Bell, text: "Alert publik harus tepat supaya perubahan penting tidak terlewat." },
        { icon: ScrollText, text: "FAQ dan notifikasi perlu dipantau sebagai satu alur komunikasi." },
        { icon: ShieldCheck, text: "Pengaturan publikasi harus tetap terkontrol dan mudah diaudit." },
      ],
    }),
  },
  "humas-admin": {
    dashboard: {
      title: "Dashboard Humas Admin",
      description: "Pantauan layanan, akun petugas, aktivitas, dan operasional.",
      heroEyebrow: "Area Admin",
      heroTitle: "Panel Humas Admin",
      heroDescription:
        "Pantau modul utama, perubahan data, dan kondisi operasional portal.",
      heroPrimaryAction: "Kelola Modul",
      heroSecondaryAction: "Audit",
      stats: [
        { label: "Modul Aktif", value: "8", description: "Sedang digunakan.", tone: "success" },
        { label: "Peran Aktif", value: "6", description: "Sudah dikonfigurasi.", tone: "info" },
        { label: "Perlu Tindak Lanjut", value: "2", description: "Perlu pemeriksaan admin.", tone: "warning" },
        { label: "Hari Layanan", value: "5", description: "Hari operasional aktif.", tone: "success" },
      ],
      tableEyebrow: "Operasional admin",
      insightEyebrow: "Kontrol admin",
      insightTitle: "Jaga sistem tetap stabil dan terstruktur",
      insightDescription:
        "Admin perlu melihat fitur, audit, pengguna, dan jadwal operasional sebagai satu alur kerja yang saling terkait.",
      insightPoints: [
        { icon: BriefcaseBusiness, text: "Fitur utama harus mudah diprioritaskan." },
        { icon: ShieldCheck, text: "Audit log perlu cepat diakses saat ada anomali." },
        { icon: Users, text: "Peran dan pengguna harus tetap sinkron dengan izin dashboard." },
      ],
      rows: [
        { id: "ADM-01", title: "Akun petugas", status: "Stabil", note: "Akses petugas berjalan normal" },
        { id: "ADM-02", title: "Log aktivitas", status: "Siap", note: "Catatan perubahan 24 jam terakhir tersedia" },
        { id: "ADM-03", title: "Operasional layanan", status: "Aktif", note: "Layanan reguler berjalan Senin sampai Jumat" },
      ],
    },
    layanan: {
      title: "Katalog Layanan",
      description: "Kelola daftar layanan, loket, dan kategori agar selaras dengan pelayanan publik.",
      heroEyebrow: "Katalog Layanan",
      heroTitle: "Daftar layanan",
      heroDescription:
        "Kelola layanan publik, unit penanggung jawab, level layanan, dan status aktif.",
      heroPrimaryAction: "Tambah Layanan",
      heroSecondaryAction: "Segarkan Data",
      stats: [
        { label: "Loket Aktif", value: "14", description: "Tercantum pada form publik.", tone: "success" },
        { label: "Jenis Layanan", value: "17", description: "Digunakan warga saat memilih layanan.", tone: "info" },
        { label: "Kategori Keluhan", value: "2", description: "Untuk penanganan khusus.", tone: "role" },
        { label: "Perlu Sinkron", value: "3", description: "Masih memerlukan penyesuaian.", tone: "warning" },
      ],
      tableEyebrow: "Daftar layanan",
      insightEyebrow: "Konteks layanan",
      insightTitle: "Katalog layanan jadi acuan untuk semua kanal",
      insightDescription:
        "Perubahan nama loket, jenis layanan, atau kategori keluhan harus langsung tercermin pada layanan publik, unit, monitoring, dan bantuan.",
      insightPoints: [
        { icon: BriefcaseBusiness, text: "Nama layanan harus sama pada seluruh kanal." },
        { icon: SlidersHorizontal, text: "Kategori layanan harus tertata dengan rapi." },
        { icon: ShieldCheck, text: "Perubahan data perlu tercatat dalam audit." },
      ],
      rows: humasAdminServiceRows,
    },
    "login-penugasan": {
      title: "Akun & Penugasan",
      description: "Kelola akun resmi, peran, unit kerja, dan penugasan operasional dari satu halaman.",
      heroEyebrow: "Akun Petugas",
      heroTitle: "Kelola akun petugas",
      heroDescription:
        "Atur email login, peran, status akun, dan unit kerja petugas.",
      heroPrimaryAction: "Tambah Akun",
      heroSecondaryAction: "Segarkan Data",
      stats: [],
      tableEyebrow: "Akun dan peran",
      insightEyebrow: "Kontrol akses",
      insightTitle: "Penugasan yang tepat menjaga alur layanan tetap tertib",
      insightDescription:
        "Perubahan akun, peran, atau unit harus langsung tercermin pada dashboard operasional.",
      insightPoints: [
        { icon: Users, text: "Status akun harus mudah dibedakan." },
        { icon: ShieldCheck, text: "Peran dan izin perlu selalu selaras." },
        { icon: ScrollText, text: "Perubahan penugasan harus mudah diaudit." },
      ],
      rows: [
        { id: "LP-01", title: "Rina Kurniasih", status: "Aktif", note: "Resepsionis / Loket utama" },
        { id: "LP-02", title: "Dedi Saputra", status: "Perlu Tinjau", note: "Penugasan perlu ditinjau ulang" },
        { id: "LP-03", title: "Lina Ramadhani", status: "Aktif", note: "Unit Strategi Pengadaan" },
      ],
    },
    "pengguna-umum": {
      title: "Pengguna Umum",
      description: "Pantau akun pengguna portal, kelengkapan profil, dan kesiapan login dari satu menu admin.",
      heroEyebrow: "Pengguna Portal",
      heroTitle: "Kelola akun pengguna umum",
      heroDescription:
        "Pantau akun warga yang terdaftar, lengkapi data dasar bila perlu, dan kendalikan perubahan akun tanpa menyentuh alur petugas.",
      heroPrimaryAction: "Tambah Pengguna",
      heroSecondaryAction: "Muat Ulang",
      stats: [],
      tableEyebrow: "Direktori pengguna",
      insightEyebrow: "Kontrol akun publik",
      insightTitle: "Akun publik perlu mudah dibaca, dicari, dan dibersihkan bila tidak lagi dipakai",
      insightDescription:
        "Admin perlu melihat siapa pengguna yang siap login, siapa yang profilnya belum lengkap, dan kapan akun perlu diperbarui atau dihapus dari sistem.",
      insightPoints: [
        { icon: Users, text: "Daftar pengguna harus mudah dipantau lintas email, WhatsApp, dan instansi." },
        { icon: ShieldCheck, text: "Perubahan akun perlu aman tanpa mengganggu alur login publik yang sudah berjalan." },
        { icon: ScrollText, text: "Jejak pengelolaan akun membantu kontrol layanan publik tetap rapi." },
      ],
      rows: [
        { id: "PU-01", title: "Akun siap login", status: "Aktif", note: "Pengguna terverifikasi dan siap dipakai" },
        { id: "PU-02", title: "Profil belum lengkap", status: "Perlu Tinjau", note: "Sebagian data dasar masih kosong" },
        { id: "PU-03", title: "Kendali admin", status: "Siap", note: "Tambah, ubah, dan hapus akun publik" },
      ],
    },
    "unit-organisasi": {
      title: "Unit Organisasi",
      description: "Atur unit, kapasitas, dan keterhubungan layanan per unit organisasi.",
      heroEyebrow: "Konfigurasi Unit",
      heroTitle: "Kelola unit organisasi",
      heroDescription:
        "Atur unit, kapasitas layanan, kalender, dan relasi layanan dari satu sumber data.",
      heroPrimaryAction: "Tambah Unit",
      heroSecondaryAction: "Atur Kapasitas",
      stats: [
        { label: "Unit Aktif", value: "14", description: "Masih terhubung ke layanan." },
        { label: "PIC Tercatat", value: "29", description: "Petugas unit aktif.", tone: "info" },
        { label: "Kapasitas Perlu Cek", value: "2", description: "Belum sinkron minggu ini.", tone: "warning" },
        { label: "Layanan Terhubung", value: "18", description: "Terdistribusi ke unit.", tone: "success" },
      ],
      tableEyebrow: "Struktur unit",
      insightEyebrow: "Keterhubungan unit",
      insightTitle: "Konfigurasi unit memengaruhi pemesanan dan dashboard",
      insightDescription:
        "Saat unit berubah atau kapasitas diubah, sistem publik dan internal harus tetap membaca struktur yang sama.",
      insightPoints: [
        { icon: BriefcaseBusiness, text: "Unit dan layanan harus saling terhubung jelas." },
        { icon: Users, text: "PIC unit membantu koordinasi operasional." },
        { icon: TrendingUp, text: "Kapasitas unit perlu dipantau dari waktu ke waktu." },
      ],
      rows: [
        { id: "UN-01", title: "Direktorat Strategi Pengadaan", status: "Aktif", note: "3 layanan aktif" },
        { id: "UN-02", title: "Direktorat Katalog", status: "Aktif", note: "Slot harian 24" },
        { id: "UN-03", title: "Pusat Pelatihan", status: "Perlu Review", note: "PIC perlu diperbarui" },
      ],
    },
    pengumuman: {
      title: "Pengumuman",
      description: "Kelola banner publik, jadwal tayang, dan pesan yang dibaca warga di kanal utama.",
      heroEyebrow: "Publikasi Layanan",
      heroTitle: "Kelola pengumuman",
      heroDescription:
        "Atur pesan berjalan, jadwal tayang, dan status publikasi pengumuman.",
      heroPrimaryAction: "Buat Pengumuman",
      heroSecondaryAction: "Pratinjau",
      stats: [
        { label: "Tayang", value: "5", description: "Sedang dilihat publik." },
        { label: "Draft", value: "3", description: "Menunggu finalisasi.", tone: "info" },
        { label: "Perlu Ditutup", value: "1", description: "Melewati jadwal tayang.", tone: "warning" },
        { label: "Diarsipkan", value: "18", description: "Riwayat publikasi selesai.", tone: "success" },
      ],
      tableEyebrow: "Daftar pengumuman",
      insightEyebrow: "Kurasi pesan",
      insightTitle: "Publikasi yang baik mengurangi kebingungan warga",
      insightDescription:
        "Banner dan pengumuman bukan dekorasi. Semuanya harus punya konteks, masa tayang, dan tujuan komunikasi yang jelas.",
      insightPoints: [
        { icon: Bell, text: "Pengumuman aktif harus mudah diprioritaskan." },
        { icon: AlertTriangle, text: "Informasi lama perlu cepat ditutup." },
        { icon: ScrollText, text: "Riwayat publikasi penting untuk audit komunikasi." },
      ],
      rows: [
        { id: "PG-01", title: "Perubahan lokasi layanan tatap muka", status: "Aktif", note: "Beranda + dashboard" },
        { id: "PG-02", title: "Pemeliharaan sistem akhir pekan", status: "Draft", note: "Tayang Sabtu pukul 20:00" },
        { id: "PG-03", title: "Pengumuman cuti bersama", status: "Perlu Review", note: "Perlu cek tanggal akhir" },
      ],
    },
    operasional: {
      title: "Operasional",
      description: "Atur jam buka, hari aktif, kalender layanan, dan parameter operasional lain yang memengaruhi pemesanan.",
      heroEyebrow: "Jam Operasional",
      heroTitle: "Jam dan hari layanan",
      heroDescription:
        "Atur hari aktif, jam layanan, hari libur, dan batas booking.",
      heroPrimaryAction: "Simpan Jadwal",
      heroSecondaryAction: "Lihat Kalender",
      stats: [
        { label: "Hari Aktif", value: "5", description: "Hari layanan reguler." },
        { label: "Slot Hari Ini", value: "156", description: "Kapasitas layanan tersedia.", tone: "info" },
        { label: "Hari Khusus", value: "2", description: "Butuh penyesuaian jam.", tone: "warning" },
        { label: "Sinkron", value: "100%", description: "Publik dan internal sama.", tone: "success" },
      ],
      tableEyebrow: "Aturan operasional",
      insightEyebrow: "Dampak ke layanan",
      insightTitle: "Operasional mengendalikan ritme layanan",
      insightDescription:
        "Jam buka, hari kerja, dan pengecualian kalender perlu satu sumber agar warga dan petugas tidak membaca jadwal yang berbeda.",
      insightPoints: [
        { icon: CalendarClock, text: "Kalender layanan harus mudah diperbarui." },
        { icon: Users, text: "Perubahan jam memengaruhi semua peran internal." },
        { icon: ShieldCheck, text: "Perubahan penting perlu jejak persetujuan." },
      ],
      rows: [
        { id: "OP-01", title: "Senin - Jumat", status: "Aktif", note: "09:00 - 14:00 WIB" },
        { id: "OP-02", title: "Hari Libur Nasional", status: "Siap", note: "Kalender 2026 terpasang" },
        { id: "OP-03", title: "Jam layanan khusus", status: "Perlu Review", note: "Menunggu konfirmasi humas" },
      ],
    },
    "faq-bantuan": {
      title: "FAQ & Bantuan",
      description: "Kelola FAQ publik, panduan kendala layanan, dan konten bantuan agar informasi pengguna tetap konsisten.",
      heroEyebrow: "Pusat Bantuan",
      heroTitle: "FAQ dan bantuan",
      heroDescription:
        "Kelola pertanyaan umum dan panduan layanan publik agar isinya tetap konsisten.",
      heroPrimaryAction: "Tambah FAQ",
      heroSecondaryAction: "Pratinjau Bantuan",
      stats: [
        { label: "FAQ Tayang", value: "18", description: "Pertanyaan aktif di kanal publik.", tone: "success" },
        { label: "Panduan Teknis", value: "6", description: "Topik bantuan akun dan aplikasi.", tone: "info" },
        { label: "Perlu Sinkron", value: "2", description: "Belum sama dengan katalog layanan terbaru.", tone: "warning" },
        { label: "Kanal Bantuan", value: "4", description: "Beranda, bantuan, FAQ, dan notifikasi.", tone: "role" },
      ],
      tableEyebrow: "Konten bantuan",
      insightEyebrow: "Kejelasan publik",
      insightTitle: "Bantuan yang rapi mengurangi antrean salah tujuan",
      insightDescription:
        "FAQ dan panduan bukan pelengkap. Keduanya membantu pengguna memilih layanan yang benar, menyiapkan dokumen, dan memahami kendala akun sebelum datang.",
      insightPoints: [
        { icon: ScrollText, text: "FAQ harus mengikuti bahasa yang sama dengan katalog layanan." },
        { icon: Bell, text: "Perubahan jadwal atau alur check-in perlu cepat masuk ke bantuan publik." },
        { icon: ShieldCheck, text: "Panduan kendala akun harus sinkron dengan loket dan kategori resmi." },
      ],
      rows: humasAdminFaqRows,
    },
    "hak-akses-role": {
      title: "Akses & Peran",
      description: "Atur izin per peran agar setiap dashboard dan fitur hanya dibuka oleh pihak yang tepat.",
      heroEyebrow: "Akses & Peran",
      heroTitle: "Hak akses peran",
      heroDescription:
        "Atur izin akses sesuai peran petugas.",
      heroPrimaryAction: "Perbarui Peran",
      heroSecondaryAction: "Audit Akses",
      stats: [
        { label: "Peran Aktif", value: "6", description: "Peran digunakan sistem." },
        { label: "Izin Ditinjau", value: "2", description: "Perlu evaluasi.", tone: "warning" },
        { label: "Akses Aman", value: "94%", description: "Sudah sesuai standar yang ditetapkan.", tone: "success" },
        { label: "Perubahan Terakhir", value: "Hari Ini", description: "Ada pembaruan izin.", tone: "info" },
      ],
      tableEyebrow: "Kontrol peran",
      insightEyebrow: "Keamanan akses",
      insightTitle: "Peran bukan hanya label, tetapi dasar pembagian akses",
      insightDescription:
        "Hak akses yang tepat menjaga data tetap aman sekaligus memastikan setiap peran hanya melihat konteks yang relevan bagi tugasnya.",
      insightPoints: [
        { icon: ShieldCheck, text: "Peran dan izin harus jelas sampai level fitur." },
        { icon: ScrollText, text: "Riwayat perubahan peran perlu mudah diaudit." },
        { icon: Users, text: "Perubahan peran berdampak langsung ke dashboard internal." },
      ],
      rows: [
        { id: "HA-01", title: "Resepsionis", status: "Aktif", note: "Dashboard + riwayat + profil" },
        { id: "HA-02", title: "Supervisor", status: "Perlu Review", note: "Ekspor perlu pembatasan ulang" },
        { id: "HA-03", title: "Humas Admin", status: "Aktif", note: "Modul pengelolaan lengkap" },
      ],
    },
    "ekspor-data": {
      title: "Ekspor Data",
      description: "Unduh laporan dan data yang dibutuhkan untuk pelaporan internal atau koordinasi lintas tim.",
      heroEyebrow: "Ekspor Sistem",
      heroTitle: "Ekspor data layanan",
      heroDescription:
        "Siapkan rekap dan laporan sesuai kebutuhan pelaporan.",
      heroPrimaryAction: "Unduh Paket",
      heroSecondaryAction: "Jadwalkan Ekspor",
      stats: [
        { label: "Paket Tersedia", value: "8", description: "Jenis laporan yang siap diekspor." },
        { label: "Jadwal Aktif", value: "3", description: "Distribusi otomatis aktif.", tone: "info" },
        { label: "Perlu Review", value: "1", description: "Template belum final.", tone: "warning" },
        { label: "Terkirim", value: "22", description: "Laporan terkirim bulan ini.", tone: "success" },
      ],
      tableEyebrow: "Daftar ekspor",
      insightEyebrow: "Distribusi data",
      insightTitle: "Ekspor harus cepat, ringkas, dan konsisten",
      insightDescription:
        "Pelaporan akan lebih rapi jika format ekspor sudah disiapkan berdasarkan modul yang paling sering diminta.",
      insightPoints: [
        { icon: Download, text: "Template ekspor perlu tersedia per kebutuhan kerja." },
        { icon: FileBarChart2, text: "Ringkasan PDF dan data CSV harus sama konteksnya." },
        { icon: ShieldCheck, text: "Ekspor perlu pembatasan sesuai peran." },
      ],
      rows: [
        { id: "ED-01", title: "Rekap Antrean Harian", status: "Siap", note: "CSV + PDF" },
        { id: "ED-02", title: "Laporan Modul Admin", status: "Terkirim", note: "Dikirim ke pimpinan" },
        { id: "ED-03", title: "Rekap Pengumuman", status: "Perlu Review", note: "Template sedang disesuaikan" },
      ],
    },
    "data-referensi": {
      title: "Master Data",
      description: "Kelola referensi layanan, unit, dan status yang dipakai lintas kanal.",
      heroEyebrow: "Master Data",
      heroTitle: "Data dasar harus seragam di seluruh kanal",
      heroDescription:
        "Panel ini memegang referensi layanan, unit, dan status yang dipakai oleh formulir, dashboard, dan antrean.",
      heroPrimaryAction: "Tambah Data",
      heroSecondaryAction: "Segarkan Data",
      stats: [
        { label: "Kategori Aktif", value: "12", description: "Referensi dipakai saat ini." },
        { label: "Perlu Pembaruan", value: "2", description: "Belum sinkron dengan modul.", tone: "warning" },
        { label: "Digunakan Modul", value: "8", description: "Memakai data referensi ini.", tone: "info" },
        { label: "Sinkron", value: "97%", description: "Konsistensi antar modul.", tone: "success" },
      ],
      tableEyebrow: "Data inti",
      insightEyebrow: "Sumber Data Utama",
      insightTitle: "Data referensi harus dijaga sebagai pusat konsistensi",
      insightDescription:
        "Kesalahan kecil di data referensi bisa merembet ke pemesanan, layanan, unit, dan pelaporan. Karena itu panel ini perlu rapi dan terkendali.",
      insightPoints: [
        { icon: ScrollText, text: "Perubahan referensi perlu mudah dilacak." },
        { icon: BriefcaseBusiness, text: "Data inti harus dipakai lintas modul tanpa duplikasi." },
        { icon: ShieldCheck, text: "Akses ubah referensi perlu dibatasi jelas." },
      ],
      rows: [
        { id: "DR-01", title: "Kategori Layanan", status: "Aktif", note: "12 kategori terdaftar" },
        { id: "DR-02", title: "Kapasitas Dasar Unit", status: "Perlu Review", note: "2 unit belum sinkron" },
        { id: "DR-03", title: "Referensi Status", status: "Aktif", note: "Dipakai lintas dashboard" },
      ],
    },
    aktivitas: {
      title: "Log Aktivitas",
      description: "Catatan perubahan data dan aktivitas admin.",
      heroEyebrow: "Log Aktivitas",
      heroTitle: "Log aktivitas",
      heroDescription:
        "Lihat perubahan data, aktor, dan hasil aktivitas yang tercatat di panel admin.",
      heroPrimaryAction: "Filter Log",
      heroSecondaryAction: "Muat Ulang",
      stats: [
        { label: "Log Terbaca", value: "128", description: "Aktivitas yang tercatat pada 24 jam terakhir." },
        { label: "Perubahan Data", value: "18", description: "Pembaruan di layanan, akun, dan pengumuman.", tone: "info" },
        { label: "Perlu Cek", value: "4", description: "Masih perlu peninjauan singkat.", tone: "warning" },
        { label: "Petugas Aktif", value: "6", description: "Akun yang hari ini melakukan perubahan.", tone: "success" },
      ],
      tableEyebrow: "Daftar log",
      insightEyebrow: "Pemeriksaan",
      insightTitle: "Log membantu menelusuri perubahan tanpa membuka satu per satu modul",
      insightDescription:
        "Setiap pembaruan penting perlu tercatat jelas supaya mudah dibaca oleh admin dan supervisor.",
      insightPoints: [
        { icon: ScrollText, text: "Nama petugas, modul, dan waktu perubahan harus mudah dibaca." },
        { icon: AlertTriangle, text: "Perubahan yang perlu dicek harus langsung terlihat." },
        { icon: ShieldCheck, text: "Log yang rapi memudahkan penelusuran saat ada komplain." },
      ],
      rows: [
        { id: "LG-01", title: "Pembaruan layanan publik", status: "Tercatat", note: "Penafsiran Peraturan PBJ disesuaikan admin humas" },
        { id: "LG-02", title: "Penayangan pengumuman", status: "Tayang", note: "Banner jadwal layanan aktif di halaman utama" },
        { id: "LG-03", title: "Peninjauan akun petugas", status: "Ditinjau", note: "Hak akses level 2 sedang dicek ulang" },
      ],
      actionPills: ["Filter Log", "Muat Ulang", "Unduh CSV"],
    },
    profil: {
      title: "Profil Humas Admin",
      description: "Ringkasan akun admin, modul yang dikelola, dan akses utama sistem.",
      heroEyebrow: "Profil Admin",
      heroTitle: "Profil Humas Admin",
      heroDescription: "Ringkasan akun pengelola dan cakupan modul.",
      heroPrimaryAction: "Perbarui Profil",
      stats: [
        { label: "Modul Dikelola", value: "10", description: "Cakupan pengelolaan aktif." },
        { label: "Peran", value: "Humas Admin", description: "Hak akses pengelolaan sistem.", tone: "success" },
        { label: "Distribusi Laporan", value: "3", description: "Kanal pelaporan aktif.", tone: "info" },
        { label: "Agenda Hari Ini", value: "6", description: "Tugas prioritas admin.", tone: "role" },
      ],
      tableEyebrow: "Ringkasan akun",
      insightEyebrow: "Konteks pengelola",
      insightTitle: "Profil admin memberi pijakan untuk mengelola sistem",
      insightDescription:
        "Admin perlu mengetahui cakupan modul, jalur koordinasi, dan titik risiko utama yang sedang diawasinya hari ini.",
      insightPoints: [
        { icon: UserRound, text: "Identitas akun penting untuk tata kelola yang rapi." },
        { icon: BriefcaseBusiness, text: "Daftar fitur membantu orientasi pengelolaan." },
        { icon: ShieldCheck, text: "Hak akses admin perlu selalu terverifikasi." },
      ],
      rows: [
        { id: "PR-01", title: "Nama Admin", status: "Aktif", note: "Hana Prameswari" },
        { id: "PR-02", title: "Modul Utama", status: "Lengkap", note: "Layanan, peran, audit, operasional" },
        { id: "PR-03", title: "Kontak Internal", status: "Terverifikasi", note: "admin-layanan@lkpp.go.id" },
      ],
    },
    pengaturan: createSettingsPageConfig({
      title: "Status Sistem Humas Admin",
      description: "Pantau status storage, backend, dan koneksi realtime yang dipakai portal.",
      heroEyebrow: "Status Sistem",
      heroTitle: "Status sistem",
      heroDescription: "Pantau backend, storage, dan koneksi realtime portal.",
      heroPrimaryAction: "Muat Ulang Status",
      heroSecondaryAction: "Tampilkan Detail",
      stats: [
        { label: "Pengaturan Utama", value: "Aktif", description: "Konfigurasi utama sistem sedang digunakan.", tone: "success" },
        { label: "Distribusi Laporan", value: "3", description: "Alur kirim laporan aktif.", tone: "info" },
        { label: "Akses Terkendali", value: "94%", description: "Tata kelola saat ini berjalan baik.", tone: "role" },
        { label: "Perlu Tinjau", value: "2", description: "Ada pengaturan fitur yang perlu dicek.", tone: "warning" },
      ],
      rows: [
        { id: "SET-HA01", title: "Pengaturan publikasi layanan", status: "Aktif", note: "Dipakai di landing, dashboard, dan notifikasi" },
        { id: "SET-HA02", title: "Distribusi laporan berkala", status: "Aktif", note: "Harian, mingguan, dan bulanan" },
        { id: "SET-HA03", title: "Aturan audit perubahan fitur", status: "Siap", note: "Jejak perubahan tersimpan otomatis" },
      ],
      insightPoints: [
        { icon: SlidersHorizontal, text: "Pengaturan admin harus menjadi pusat kendali, bukan kumpulan toggle lepas." },
        { icon: ShieldCheck, text: "Akses, audit, dan publikasi perlu selalu sinkron." },
        { icon: Download, text: "Distribusi laporan harus konsisten agar tidak ada data yang terselip." },
      ],
    }),
  },
};

export function getInternalPageConfig(role: InternalRole, page: InternalPageKey) {
  return rolePageConfigs[role]?.[page];
}

export function getInternalFeatureKeys(role: InternalRole): InternalPageKey[] {
  return (Object.keys(rolePageConfigs[role] ?? {}) as InternalPageKey[]).filter(
    (page) => page !== "dashboard",
  );
}

export function isInternalFeatureKey(role: InternalRole, page: string): page is InternalPageKey {
  return page !== "dashboard" && page in (rolePageConfigs[role] ?? {});
}

export function getInternalPagePath(role: InternalRole, page: InternalPageKey = "dashboard") {
  const basePath = getInternalRoleBasePath(role);
  if (role === "humas-admin") {
    if (page === "dashboard") {
      return basePath;
    }

    if (page === "profil") {
      return `${basePath}/profile`;
    }

    return `${basePath}/${page}`;
  }

  return page === "dashboard" ? `${basePath}/dashboard` : `${basePath}/${page}`;
}
