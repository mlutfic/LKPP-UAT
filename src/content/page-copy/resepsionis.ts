import type { PageCopyEntry } from "@/content/page-copy/types";

export const resepsionisPageCopy: PageCopyEntry[] = [
  {
    route: "/resepsionis/dashboard",
    title: "Dashboard Resepsionis",
    description: "Check-in tamu hari ini dan pantau antrean yang sudah hadir.",
    heroEyebrow: "Area Frontdesk",
    heroTitle: "Check-in lobby hari ini",
    heroDescription: "Resepsionis hanya mencatat kehadiran dan menyiapkan antrean untuk unit tujuan.",
    primaryAction: { label: "Check-in Lobby", variant: "primary" },
    secondaryAction: { label: "Riwayat", href: "/resepsionis/riwayat", variant: "secondary" },
  },
  {
    route: "/resepsionis/riwayat",
    title: "Riwayat Frontdesk",
    description: "Jejak antrean yang selesai, batal, atau tidak hadir.",
    heroEyebrow: "Riwayat Frontdesk",
    heroTitle: "Riwayat antrean resepsionis",
    heroDescription: "Baca hasil check-in, pembatalan, dan no-show dari meja frontdesk.",
    primaryAction: { label: "Ekspor", variant: "primary" },
    secondaryAction: { label: "Kembali ke Dashboard", href: "/resepsionis/dashboard", variant: "secondary" },
  },
  {
    route: "/resepsionis/profil",
    title: "Profil Resepsionis",
    description: "Ringkasan akun, identitas petugas, dan penugasan lobby.",
    heroEyebrow: "Profil Petugas",
    heroTitle: "Profil resepsionis",
    heroDescription: "Identitas petugas, shift aktif, dan cakupan kerja selama jam layanan.",
    primaryAction: { label: "Perbarui Profil", variant: "primary" },
    secondaryAction: { label: "Pengaturan", href: "/resepsionis/pengaturan", variant: "secondary" },
  },
  {
    route: "/resepsionis/pengaturan",
    title: "Pengaturan Resepsionis",
    description: "Atur preferensi frontdesk dan notifikasi operasional.",
    heroEyebrow: "Preferensi Frontdesk",
    heroTitle: "Pengaturan meja layanan depan",
    heroDescription: "Sesuaikan tampilan antrean dan notifikasi agar kerja frontdesk tetap cepat dibaca.",
    primaryAction: { label: "Simpan Pengaturan", variant: "primary" },
    secondaryAction: { label: "Dashboard", href: "/resepsionis/dashboard", variant: "secondary" },
  },
];
