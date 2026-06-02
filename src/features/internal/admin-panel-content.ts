import type { InternalPageKey } from "@/features/internal/internal-workspace-config";

export type AdminPage = Extract<
  InternalPageKey,
  | "dashboard"
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
  | "aktivitas"
  | "profil"
  | "pengaturan"
>;

export type AdminSectionChrome = {
  variant?: "default" | "compact" | "list";
  actionEyebrow?: string;
  actionDescription?: string;
  actionPills?: string[];
};

const adminSectionChrome: Record<AdminPage, AdminSectionChrome> = {
  dashboard: {},
  layanan: {
    actionEyebrow: "Katalog layanan",
    actionDescription: "Kelola layanan publik, unit, dan level layanan.",
    actionPills: ["Loket", "Layanan", "Kategori"],
  },
  "login-penugasan": {
    actionEyebrow: "Akun petugas",
    actionDescription: "Kelola akun resmi, peran, dan unit kerja petugas.",
    actionPills: ["Tambah akun"],
  },
  "pengguna-umum": {
    actionEyebrow: "Pengguna portal",
    actionDescription: "Pantau akun pengguna umum, kelengkapan profil, dan kesiapan login.",
    actionPills: ["Tambah pengguna", "Muat Ulang"],
  },
  "unit-organisasi": {
    variant: "compact",
  },
  pengumuman: {
    variant: "list",
  },
  operasional: {
    variant: "compact",
    actionEyebrow: "Kalender layanan",
    actionDescription: "Atur jam layanan, hari aktif, dan kalender operasional.",
    actionPills: ["Kalender", "Hari khusus", "Jam layanan"],
  },
  "faq-bantuan": {
    variant: "list",
    actionEyebrow: "Konten bantuan",
    actionDescription: "Kelola FAQ dan panduan layanan publik.",
    actionPills: ["Tambah FAQ", "Pratinjau Bantuan", "Segarkan"],
  },
  "hak-akses-role": {
    variant: "compact",
  },
  "ekspor-data": {
    actionEyebrow: "Paket ekspor",
    actionDescription: "Siapkan dan unduh paket data sesuai format pelaporan.",
    actionPills: ["Pratinjau Paket", "Filter Kalender", "CSV", "PDF"],
  },
  "data-referensi": {
    variant: "compact",
    actionEyebrow: "Data Referensi",
    actionDescription:
      "Kelola referensi layanan, unit, dan status agar seragam di seluruh kanal.",
    actionPills: ["Tambah Data", "Segarkan Data", "Saring"],
  },
  aktivitas: {
    variant: "list",
    actionEyebrow: "Log aktivitas",
    actionDescription: "Filter log, muat ulang data, atau unduh CSV.",
    actionPills: ["Filter Log", "Muat Ulang", "Unduh CSV"],
  },
  profil: {
    variant: "list",
    actionEyebrow: "Profil admin",
    actionDescription: "Perbarui identitas admin dan kontak internal.",
    actionPills: ["Perbarui Profil", "Sinkronkan"],
  },
  pengaturan: {
    actionEyebrow: "Status Sistem",
    actionDescription: "Pantau backend, storage, dan realtime portal.",
    actionPills: ["Muat Ulang Status", "Tampilkan Detail"],
  },
};

export function getAdminSectionChrome(page: AdminPage) {
  return adminSectionChrome[page];
}
