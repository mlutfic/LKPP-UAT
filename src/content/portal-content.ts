import {
  Clock3,
  Gavel,
  HeadphonesIcon,
  Layers3,
  LifeBuoy,
  MapPin,
  MonitorCog,
  ShieldCheck,
  Ticket,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type ContentCard = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type StatCardContent = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

export const landingHero = {
  eyebrow: "Sistem Pelayanan Terpadu",
  title: "Portal Antrean dan Layanan Publik Digital LKPP",
  description:
    "Transformasi layanan pengadaan yang transparan, akuntabel, dan efisien untuk mewujudkan ekosistem pengadaan pemerintah yang kredibel.",
  primaryCta: "Ambil Antrean",
  secondaryCta: "Pelajari Layanan",
  staffCta: "Login Petugas",
} as const;

export const landingAnnouncement =
  "Layanan tatap muka dialihkan ke lantai 2 mulai 1 Mei 2026 dan pemeliharaan sistem rutin dilakukan setiap Sabtu pukul 22:00 WIB.";

export const landingServiceHighlights: ContentCard[] = [
  {
    icon: Gavel,
    title: "Peraturan dan Kebijakan PBJ",
    description:
      "Layanan penafsiran peraturan, diseminasi ketentuan PBJ, dan konsultasi kebijakan pengadaan.",
  },
  {
    icon: MonitorCog,
    title: "Sistem Pengadaan Digital",
    description:
      "Bantuan akun INAPROC, SPSE, SIKaP, SPSE ICB, serta kebutuhan teknis layanan pengadaan digital.",
  },
  {
    icon: Layers3,
    title: "Katalog Elektronik dan Toko Daring",
    description:
      "Pendampingan katalog elektronik, toko daring, e-purchasing, dan tata kelola pasar pengadaan digital.",
  },
  {
    icon: HeadphonesIcon,
    title: "Bantuan dan Koordinasi Layanan",
    description:
      "Panduan layanan, perubahan jadwal, FAQ, dan bantuan awal sebelum pengunjung datang ke LKPP.",
  },
];

export const landingStats: StatCardContent[] = [
  {
    label: "Rata-rata layanan",
    value: "12 menit",
    description: "Durasi rata-rata sejak check-in sampai mulai dilayani.",
    icon: Clock3,
  },
  {
    label: "Slot tersedia hari ini",
    value: "156",
    description: "Slot tatap muka yang masih bisa dipilih hari ini.",
    icon: Ticket,
  },
  {
    label: "Unit aktif",
    value: "14",
    description: "Unit yang sedang membuka layanan publik terjadwal.",
    icon: Layers3,
  },
];

export const landingServiceSteps = [
  {
    title: "Pilih layanan",
    description: "Pilih direktorat atau unit kerja yang paling sesuai dengan kebutuhan konsultasi Anda.",
  },
  {
    title: "Isi data dan jadwal",
    description: "Lengkapi informasi kunjungan, pilih slot waktu, lalu simpan antrean digital Anda.",
  },
  {
    title: "Check-in saat tiba",
    description: "Datang sesuai slot dan lakukan check-in agar resepsionis bisa mengarahkan layanan.",
  },
  {
    title: "Dilayani unit terkait",
    description: "Petugas unit akan memanggil antrean Anda dan proses layanan dilanjutkan sampai selesai.",
  },
] as const;

export const landingFaqs = [
  {
    question: "Apakah semua layanan LKPP wajib melalui antrean digital?",
    answer:
      "Untuk layanan konsultasi dan kunjungan tatap muka, antrean digital menjadi jalur utama agar jadwal, kapasitas, dan rekam layanan tetap tertata.",
  },
  {
    question: "Bagaimana cara mengecek status antrean saya?",
    answer:
      "Gunakan fitur cek antrean di landing page untuk masuk lewat email atau nomor antrean, lalu buka jadwal pengguna agar status detail antrean terbaca dengan benar.",
  },
  {
    question: "Apakah saya bisa menjadwalkan ulang layanan?",
    answer:
      "Bisa, selama slot layanan masih tersedia dan kebijakan unit terkait mengizinkan perubahan jadwal.",
  },
  {
    question: "Bagaimana jika saya datang ke layanan yang salah?",
    answer:
      "Petugas resepsionis atau unit akan membantu mengarahkan Anda ke layanan yang sesuai melalui alur eskalasi atau pindah layanan.",
  },
] as const;

export const landingVisitInfo = [
  {
    icon: MapPin,
    title: "Kompleks Rasuna Epicentrum",
    description: "Jl. Epicentrum Tengah Lot 11B, Jakarta Selatan.",
  },
  {
    icon: Clock3,
    title: "Jam layanan",
    description: "Senin - Jumat, 09:00 sampai 14:00 WIB.",
  },
  {
    icon: Ticket,
    title: "Check-in digital",
    description: "Tunjukkan QR atau nomor antrean di frontdesk agar diarahkan ke unit tujuan.",
  },
] as const;

export const serviceCatalogIntro = {
  eyebrow: "Katalog Layanan",
  title: "Pilih layanan konsultasi yang paling relevan.",
  description: "Pilih layanan sesuai kebutuhan Anda, lalu lanjutkan ke jadwal dan antrean yang tersedia.",
} as const;

export const serviceCatalogCards: ContentCard[] = [
  {
    icon: Gavel,
    title: "Peraturan dan Kebijakan PBJ",
    description:
      "Penafsiran peraturan, diseminasi regulasi, dan konsultasi kebijakan pengadaan barang dan jasa pemerintah.",
  },
  {
    icon: MonitorCog,
    title: "Sistem Pengadaan Digital",
    description:
      "Konsultasi akun INAPROC, SPSE, SIKaP, SPSE ICB, dan kendala teknis layanan pengadaan digital.",
  },
  {
    icon: Layers3,
    title: "Katalog Elektronik dan Toko Daring",
    description:
      "Sosialisasi, bimbingan teknis, dan penanganan kebutuhan katalog elektronik serta toko daring pemerintah.",
  },
  {
    icon: UsersRound,
    title: "Pelatihan dan Bimbingan Teknis",
    description:
      "Pelatihan teknis, pelatihan fungsional, akreditasi LPPBJ, dan penguatan kapasitas pelaku pengadaan.",
  },
  {
    icon: ShieldCheck,
    title: "Advokasi dan Permasalahan Pengadaan",
    description:
      "Pendampingan advokasi pemerintah pusat, pemerintah daerah, dan penanganan permasalahan pengadaan.",
  },
  {
    icon: LifeBuoy,
    title: "LPSE dan Bantuan Layanan",
    description:
      "Verifikasi LPSE, bimbingan standarisasi, FAQ layanan, dan bantuan awal sebelum datang ke lokasi.",
  },
];
