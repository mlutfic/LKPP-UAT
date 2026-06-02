export type BookingApplicantCategory =
  | "ASN / TNI / Polri"
  | "Penyedia / Pengusaha"
  | "Mahasiswa"
  | "Organisasi Masyarakat"
  | "Lainnya";

export type BookingServiceEntry = {
  id: string;
  slug: string;
  title: string;
  officialName: string;
  serviceLevel: 1 | 2;
  unitId: string;
  unitLabel: string;
  groupLabel: string;
  description: string;
  audience: string;
  durationMinutes: number;
  dailyQuota: number;
  exampleNeeds: string[];
  preparationNotes: string[];
  topicLabel?: string;
  topicOptions?: string[];
};

export type BookingUnitEntry = {
  id: string;
  label: string;
  groupLabel: string;
  description: string;
};

export type BookingServiceSection = BookingUnitEntry & {
  services: BookingServiceEntry[];
};

export type BookingCatalogUnitGroup = {
  unitId: string;
  unitLabel: string;
  unitDescription: string;
  services: BookingServiceEntry[];
};

export type BookingCatalogCategoryGroup = {
  category: string;
  description: string;
  units: BookingCatalogUnitGroup[];
  serviceCount: number;
};

export const bookingUnitEntries: BookingUnitEntry[] = [
  {
    id: "D11",
    label: "Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Umum",
    groupLabel: "Regulasi & Peraturan PBJ",
    description: "Konsultasi penafsiran aturan dan diseminasi regulasi PBJ.",
  },
  {
    id: "D12",
    label: "Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Khusus",
    groupLabel: "Kebijakan Khusus & KPBU",
    description: "Kebijakan khusus, BLU/BLUD, desa, dan proyek KPBU.",
  },
  {
    id: "D13",
    label: "Direktorat Pengembangan Iklim Usaha dan Kerjasama Internasional",
    groupLabel: "Pelaku Usaha",
    description: "Pendampingan pelaku usaha dan penguatan kapasitas pasar pengadaan.",
  },
  {
    id: "D21",
    label: "Direktorat Perencanaan Transformasi, Pemantauan dan Evaluasi Pengadaan",
    groupLabel: "Perencanaan & Monev",
    description: "RUP, monitoring evaluasi, dan pembahasan daftar hitam.",
  },
  {
    id: "D22",
    label: "Direktorat Sistem Pengadaan Digital",
    groupLabel: "SPSE & LPSE",
    description: "Akun INAPROC, SPSE, SIKaP, SPSE ICB, dan LPSE.",
  },
  {
    id: "D23",
    label: "Direktorat Pasar Digital Pengadaan",
    groupLabel: "Katalog & Pasar Digital",
    description: "Katalog elektronik, toko daring, dan e-purchasing.",
  },
  {
    id: "D31",
    label: "Direktorat Pengembangan Profesi dan Kelembagaan",
    groupLabel: "Kelembagaan & JF PBJ",
    description: "Pembinaan UKPBJ, kematangan, dan angka kredit JF PBJ.",
  },
  {
    id: "D33",
    label: "Direktorat Sertifikasi Profesi",
    groupLabel: "Sertifikasi PBJ",
    description: "Sertifikasi kompetensi PBJ.",
  },
  {
    id: "D41",
    label: "Direktorat Advokasi Pemerintah Pusat",
    groupLabel: "Advokasi Instansi Pusat",
    description: "Advokasi dan penanganan masalah pengadaan instansi pusat.",
  },
  {
    id: "D42",
    label: "Direktorat Advokasi Pemerintah Daerah",
    groupLabel: "Advokasi Instansi Daerah",
    description: "Advokasi dan penanganan masalah pengadaan instansi daerah.",
  },
  {
    id: "D43",
    label: "Direktorat Penanganan Permasalahan Hukum",
    groupLabel: "Hukum PBJ",
    description: "Keterangan ahli dan dukungan hukum PBJ.",
  },
  {
    id: "PPSDM",
    label: "Pusat Pelatihan Sumber Daya Manusia Pengadaan Barang/Jasa",
    groupLabel: "Pelatihan & Akreditasi",
    description: "Pelatihan teknis, fungsional, dan akreditasi LPPBJ.",
  },
  {
    id: "BHU",
    label: "Biro Hubungan Masyarakat dan Umum",
    groupLabel: "Humas & LPSE LKPP",
    description: "Verifikasi LPSE LKPP dan bantuan standarisasi.",
  },
];

export function getBookingUnitEntryById(unitId: string) {
  return bookingUnitEntries.find((entry) => entry.id === unitId) ?? null;
}

export const bookingApplicantCategories: BookingApplicantCategory[] = [
  "ASN / TNI / Polri",
  "Penyedia / Pengusaha",
  "Mahasiswa",
  "Organisasi Masyarakat",
  "Lainnya",
];

export const bookingFlowSteps = [
  {
    title: "Pilih layanan",
    description: "Tentukan unit dan layanan yang paling sesuai dengan kebutuhan Anda.",
  },
  {
    title: "Isi konteks kunjungan",
    description: "Tuliskan keluhan, jumlah peserta, dan asal instansi agar petugas siap menerima.",
  },
  {
    title: "Pilih tanggal",
    description: "Pilih slot kunjungan yang masih tersedia sesuai kapasitas harian unit.",
  },
  {
    title: "Konfirmasi booking",
    description: "Periksa kembali ringkasan layanan sebelum nomor antrean diterbitkan.",
  },
] as const;

export const bookingReadinessChecklist = [
  "Pastikan profil pengguna sudah lengkap dan kontak aktif.",
  "Siapkan ringkasan masalah atau topik konsultasi secara singkat.",
  "Pilih layanan yang benar agar frontdesk tidak perlu memindahkan antrean saat Anda datang.",
] as const;

const bookingServiceLevelOverrides: Partial<Record<string, 1 | 2>> = {};

const bookingServiceEntriesBase: Array<Omit<BookingServiceEntry, "serviceLevel">> = [
  {
    id: "D11-01",
    slug: "d11-01",
    title: "Penafsiran Peraturan PBJ",
    officialName:
      "Pelayanan Penafsiran Peraturan Perundang-Undangan di Bidang Pengadaan Barang/Jasa Pemerintah",
    unitId: "D11",
    unitLabel: "Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Umum",
    groupLabel: "Regulasi & Peraturan PBJ",
    description:
      "Konsultasi penafsiran aturan pengadaan barang/jasa pemerintah untuk kebutuhan implementasi dan klarifikasi lapangan.",
    audience: "K/L/PD, UKPBJ, dan pemangku kepentingan yang memerlukan klarifikasi regulasi PBJ.",
    durationMinutes: 10,
    dailyQuota: 15,
    exampleNeeds: [
      "Meminta penafsiran pasal tertentu pada regulasi PBJ.",
      "Membahas penerapan aturan PBJ dalam kasus pengadaan konkret.",
    ],
    preparationNotes: [
      "Siapkan regulasi atau pasal yang ingin dibahas.",
      "Tuliskan konteks pengadaan agar sesi konsultasi lebih fokus.",
    ],
  },
  {
    id: "D11-02",
    slug: "d11-02",
    title: "Diseminasi Peraturan PBJ",
    officialName:
      "Pelayanan Diseminasi Peraturan Perundang-Undangan di Bidang Pengadaan Barang/Jasa Pemerintah secara Luring/Tatap Muka dan Daring",
    unitId: "D11",
    unitLabel: "Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Umum",
    groupLabel: "Regulasi & Peraturan PBJ",
    description:
      "Permohonan sosialisasi dan diseminasi regulasi PBJ secara luring, tatap muka, maupun daring.",
    audience: "Unit kerja yang membutuhkan penyebarluasan informasi regulasi PBJ.",
    durationMinutes: 30,
    dailyQuota: 15,
    exampleNeeds: [
      "Permintaan sosialisasi peraturan PBJ untuk pegawai internal.",
      "Koordinasi diseminasi regulasi terbaru ke pemangku kepentingan.",
    ],
    preparationNotes: [
      "Cantumkan target peserta dan format kegiatan yang diinginkan.",
      "Siapkan daftar isu yang perlu ditekankan dalam diseminasi.",
    ],
  },
  {
    id: "D12-01",
    slug: "d12-01",
    title: "Kebijakan PBJ di Desa",
    officialName: "Penyusunan Kebijakan Pengadaan Barang/Jasa di Desa",
    unitId: "D12",
    unitLabel: "Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Khusus",
    groupLabel: "Kebijakan Khusus & KPBU",
    description:
      "Pendampingan penyusunan kebijakan pengadaan barang/jasa di desa dan kebutuhan turunannya.",
    audience: "Pemerintah daerah dan pemangku kebijakan pengadaan di desa.",
    durationMinutes: 30,
    dailyQuota: 10,
    exampleNeeds: [
      "Menyusun kebijakan PBJ di desa sesuai kebutuhan daerah.",
      "Mengklarifikasi pembagian kewenangan pada PBJ desa.",
    ],
    preparationNotes: [
      "Bawa draft kebijakan atau bahan diskusi yang sudah ada.",
      "Tuliskan permasalahan utama agar pembahasan lebih cepat.",
    ],
  },
  {
    id: "D12-02",
    slug: "d12-02",
    title: "Konsultasi Kebijakan BLU, BLUD, dan KPBU",
    officialName:
      "Pemberian Pendapat Penyusunan Kebijakan Pengadaan untuk BLU/BLUD, Badan Usaha dan Badan Hukum Publik dengan Sumber Pendanaan Khusus dan Pemerintah Kabupaten/Kota dalam penyusunan kebijakan PBJ di Desa dan KPBU",
    unitId: "D12",
    unitLabel: "Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Khusus",
    groupLabel: "Kebijakan Khusus & KPBU",
    description:
      "Pemberian pendapat atas penyusunan kebijakan pengadaan untuk BLU/BLUD, badan usaha, badan hukum publik, dan KPBU.",
    audience: "BLU/BLUD, badan usaha, badan hukum publik, dan pemerintah daerah.",
    durationMinutes: 30,
    dailyQuota: 10,
    exampleNeeds: [
      "Konsultasi kebijakan PBJ dengan sumber pendanaan khusus.",
      "Permintaan pendapat untuk penyusunan kebijakan KPBU.",
    ],
    preparationNotes: [
      "Lampirkan konteks badan usaha atau pendanaan khusus.",
      "Siapkan pertanyaan kebijakan yang paling mendesak.",
    ],
  },
  {
    id: "D12-03",
    slug: "d12-03",
    title: "Pendampingan Kebijakan BLU, BLUD, dan Desa",
    officialName:
      "Pendampingan Penyusunan Kebijakan Pengadaan untuk BLU/BLUD, Badan Usaha dan Badan Hukum Publik dengan Sumber Pendanaan Khusus, dan Pemerintah Kabupaten/Kota dalam penyusunan kebijakan barang/jasa di Desa",
    unitId: "D12",
    unitLabel: "Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Khusus",
    groupLabel: "Kebijakan Khusus & KPBU",
    description:
      "Pendampingan intensif untuk penyusunan kebijakan PBJ pada BLU/BLUD, badan usaha, dan pemerintah daerah.",
    audience: "Unit yang memerlukan sesi pendampingan berkelanjutan, bukan konsultasi satu kali.",
    durationMinutes: 30,
    dailyQuota: 10,
    exampleNeeds: [
      "Pendampingan review kebijakan PBJ internal.",
      "Pendalaman rancangan kebijakan untuk badan hukum publik.",
    ],
    preparationNotes: [
      "Bawa draft kebijakan versi terbaru.",
      "Cantumkan target keluaran yang diinginkan dari sesi pendampingan.",
    ],
  },
  {
    id: "D12-04",
    slug: "d12-04",
    title: "Pendampingan Proyek KPBU",
    officialName: "Pendampingan Pelaksanaan Proyek KPBU",
    unitId: "D12",
    unitLabel: "Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Khusus",
    groupLabel: "Kebijakan Khusus & KPBU",
    description:
      "Pendampingan pelaksanaan proyek kerja sama pemerintah dengan badan usaha dan tahapan pengadaannya.",
    audience: "Tim proyek KPBU dan instansi yang sedang menyiapkan pengadaan berbasis KPBU.",
    durationMinutes: 30,
    dailyQuota: 10,
    exampleNeeds: [
      "Review langkah pengadaan dalam proyek KPBU.",
      "Diskusi kendala implementasi KPBU di lapangan.",
    ],
    preparationNotes: [
      "Siapkan garis besar proyek dan fase saat ini.",
      "Tuliskan risiko atau bottleneck yang sedang terjadi.",
    ],
  },
  {
    id: "D13-01",
    slug: "d13-01",
    title: "Kapasitas Pelaku Usaha PBJ",
    officialName:
      "Pengembangan Kapasitas Pelaku Usaha dalam Pengadaan Barang/Jasa Pemerintah (PBJP)",
    unitId: "D13",
    unitLabel: "Direktorat Pengembangan Iklim Usaha dan Kerjasama Internasional",
    groupLabel: "Pelaku Usaha",
    description:
      "Penguatan kapasitas pelaku usaha agar lebih siap berpartisipasi dalam pengadaan pemerintah.",
    audience: "Pelaku usaha, asosiasi, dan pihak yang ingin meningkatkan kesiapan bisnis di PBJ.",
    durationMinutes: 30,
    dailyQuota: 15,
    exampleNeeds: [
      "Pendampingan kesiapan ikut pengadaan pemerintah.",
      "Diskusi pengembangan kapasitas bisnis untuk PBJP.",
    ],
    preparationNotes: [
      "Cantumkan profil usaha dan kebutuhan pembinaan utama.",
      "Siapkan pertanyaan seputar partisipasi di pengadaan pemerintah.",
    ],
  },
  {
    id: "D21-01",
    slug: "d21-01",
    title: "RUP, Monitoring, dan Daftar Hitam",
    officialName:
      "Pelayanan Sosialisasi/Bimbingan Teknis Rencana Umum Pengadaan, Monitoring Evaluasi Pengadaan, dan Sanksi Daftar Hitam",
    unitId: "D21",
    unitLabel: "Direktorat Perencanaan Transformasi, Pemantauan dan Evaluasi Pengadaan",
    groupLabel: "Perencanaan & Monev",
    description:
      "Sosialisasi dan bimbingan teknis terkait RUP, monitoring evaluasi, dan sanksi daftar hitam.",
    audience: "K/L/PD dan unit yang menjalankan fungsi perencanaan serta evaluasi pengadaan.",
    durationMinutes: 30,
    dailyQuota: 15,
    exampleNeeds: [
      "Konsultasi penyusunan dan evaluasi RUP.",
      "Pembahasan kebijakan daftar hitam dan monitoring pengadaan.",
    ],
    preparationNotes: [
      "Bawa data RUP atau hasil monitoring jika tersedia.",
      "Tuliskan fokus evaluasi yang ingin dibahas.",
    ],
  },
  {
    id: "D22-01",
    slug: "d22-01",
    title: "Konsultasi INAPROC, SPSE, dan SIKaP",
    officialName: "Konsultasi Tatap Muka (Akun INAPROC, SPSE, SIKaP, SPSE ICB)",
    unitId: "D22",
    unitLabel: "Direktorat Sistem Pengadaan Digital",
    groupLabel: "SPSE & LPSE",
    description:
      "Konsultasi tatap muka untuk kendala akun INAPROC, SPSE, SIKaP, dan SPSE ICB.",
    audience: "K/L/PD, LPSE, penyedia, dan pengguna sistem pengadaan digital LKPP.",
    durationMinutes: 20,
    dailyQuota: 20,
    exampleNeeds: [
      "Perubahan data akun atau kendala akses INAPROC.",
      "Kendala SPSE, SIKaP, atau SPSE ICB yang butuh penanganan langsung.",
    ],
    preparationNotes: [
      "Siapkan email akun, NIK, atau NPWP yang terkait.",
      "Catat pesan error atau kronologi kendala yang muncul.",
    ],
    topicLabel: "Jenis kendala",
    topicOptions: [
      "Perubahan data",
      "Kendala aplikasi SPSE / SIKaP / SPSE ICB",
      "Kendala akun INAPROC",
      "Lainnya",
    ],
  },
  {
    id: "D22-02",
    slug: "d22-02",
    title: "Sosialisasi dan Pelatihan SPSE",
    officialName:
      "Permohonan Sosialisasi/Bimbingan Teknis/Pelatihan mengenai Sistem Pengadaan Secara Elektronik (SPSE)",
    unitId: "D22",
    unitLabel: "Direktorat Sistem Pengadaan Digital",
    groupLabel: "SPSE & LPSE",
    description:
      "Permohonan sosialisasi, bimbingan teknis, atau pelatihan mengenai SPSE.",
    audience: "Instansi yang memerlukan sesi edukasi atau pelatihan sistem SPSE.",
    durationMinutes: 30,
    dailyQuota: 15,
    exampleNeeds: [
      "Permintaan sosialisasi SPSE untuk tim pengadaan.",
      "Bimtek operasional SPSE bagi operator baru.",
    ],
    preparationNotes: [
      "Cantumkan jenis kegiatan yang diinginkan: sosialisasi, bimtek, atau pelatihan.",
      "Tuliskan profil peserta dan target hasil kegiatan.",
    ],
  },
  {
    id: "D22-03",
    slug: "d22-03",
    title: "Bimtek Standarisasi LPSE",
    officialName: "Bimbingan Teknis Standarisasi LPSE",
    unitId: "D22",
    unitLabel: "Direktorat Sistem Pengadaan Digital",
    groupLabel: "SPSE & LPSE",
    description:
      "Bimbingan teknis terkait standar layanan LPSE dan kesiapan operasionalnya.",
    audience: "LPSE dan pengelola layanan yang membutuhkan pendampingan standarisasi.",
    durationMinutes: 30,
    dailyQuota: 15,
    exampleNeeds: [
      "Pendampingan standarisasi layanan LPSE.",
      "Review kesiapan operasional dan pengelolaan LPSE.",
    ],
    preparationNotes: [
      "Siapkan kondisi LPSE saat ini dan area yang perlu dibenahi.",
      "Bawa data ringkas terkait operasional layanan bila ada.",
    ],
  },
  {
    id: "D23-01",
    slug: "d23-01",
    title: "Katalog Elektronik dan Toko Daring",
    officialName:
      "Pelayanan Permohonan Sosialisasi/Bimbingan Teknis Mengenai Katalog Elektronik dan Toko Daring",
    unitId: "D23",
    unitLabel: "Direktorat Pasar Digital Pengadaan",
    groupLabel: "Katalog & Pasar Digital",
    description:
      "Sosialisasi dan bimbingan teknis terkait katalog elektronik, toko daring, dan e-purchasing.",
    audience: "K/L/PD, penyedia, dan operator yang menggunakan Katalog Elektronik/Toko Daring.",
    durationMinutes: 30,
    dailyQuota: 15,
    exampleNeeds: [
      "Kendala produk tidak tayang atau masalah akun penyedia.",
      "Konsultasi pelaksanaan e-purchasing atau pembaruan data produk.",
    ],
    preparationNotes: [
      "Siapkan kategori kendala: produk, akun, pembelian, atau pembaruan data.",
      "Bawa data akun atau identitas usaha yang relevan.",
    ],
    topicLabel: "Topik layanan",
    topicOptions: [
      "K/L/PD — Pesanan atau kontrak",
      "K/L/PD — Addendum pesanan atau kontrak",
      "K/L/PD — Pembayaran",
      "K/L/PD — Pembatalan pesanan",
      "K/L/PD — Usulan penetapan kategori produk",
      "K/L/PD — Master produk dan konsolidasi",
      "K/L/PD — Metode e-purchasing",
      "Penyedia — Pendaftaran dan penayangan produk",
      "Penyedia — Pelaksanaan e-purchasing",
      "Penyedia — Kendala input produk",
      "Penyedia — Pembaruan data penyedia",
      "Penyedia — Kendala akun",
      "Penyedia — Kendala pembelian produk",
      "Penyedia — Kendala produk tayang",
    ],
  },
  {
    id: "D31-01",
    slug: "d31-01",
    title: "Pembinaan UKPBJ",
    officialName: "Pelayanan Permohonan Pembinaan Unit Kerja Pengadaan Barang/Jasa",
    unitId: "D31",
    unitLabel: "Direktorat Pengembangan Profesi dan Kelembagaan",
    groupLabel: "Kelembagaan & JF PBJ",
    description:
      "Pembinaan Unit Kerja Pengadaan Barang/Jasa untuk penguatan kelembagaan dan praktik layanan.",
    audience: "UKPBJ dan instansi yang membutuhkan pembinaan kelembagaan.",
    durationMinutes: 30,
    dailyQuota: 12,
    exampleNeeds: [
      "Pendampingan penguatan peran UKPBJ.",
      "Konsultasi pembinaan kelembagaan pengadaan.",
    ],
    preparationNotes: [
      "Cantumkan kondisi UKPBJ saat ini dan tujuan pembinaan.",
      "Bawa ringkasan isu kelembagaan yang sedang dihadapi.",
    ],
  },
  {
    id: "D31-02",
    slug: "d31-02",
    title: "Verifikasi Kematangan UKPBJ",
    officialName:
      "Pelayanan Verifikasi Penilaian Mandiri Pengukuran Tingkat Kematangan Unit Kerja Pengadaan Barang/Jasa",
    unitId: "D31",
    unitLabel: "Direktorat Pengembangan Profesi dan Kelembagaan",
    groupLabel: "Kelembagaan & JF PBJ",
    description:
      "Verifikasi penilaian mandiri pengukuran tingkat kematangan UKPBJ.",
    audience: "Unit yang sedang menilai atau memverifikasi tingkat kematangan UKPBJ.",
    durationMinutes: 30,
    dailyQuota: 10,
    exampleNeeds: [
      "Validasi hasil penilaian mandiri kematangan UKPBJ.",
      "Diskusi indikator dan bukti dukung penilaian.",
    ],
    preparationNotes: [
      "Bawa hasil penilaian mandiri terakhir.",
      "Siapkan bukti dukung utama yang perlu diverifikasi.",
    ],
  },
  {
    id: "D31-03",
    slug: "d31-03",
    title: "Penilaian Angka Kredit JF PBJ",
    officialName:
      "Pelayanan Penilaian Angka Kredit Jabatan Fungsional Pengelola Pengadaan Barang/Jasa oleh Tim Penilai Pusat LKPP",
    unitId: "D31",
    unitLabel: "Direktorat Pengembangan Profesi dan Kelembagaan",
    groupLabel: "Kelembagaan & JF PBJ",
    description:
      "Penilaian angka kredit jabatan fungsional pengelola pengadaan barang/jasa oleh Tim Penilai Pusat LKPP.",
    audience: "Pejabat/pengelola yang memerlukan penilaian angka kredit JF PBJ.",
    durationMinutes: 30,
    dailyQuota: 10,
    exampleNeeds: [
      "Konsultasi usulan penilaian angka kredit.",
      "Review kelengkapan berkas jabatan fungsional PBJ.",
    ],
    preparationNotes: [
      "Siapkan berkas angka kredit dan riwayat kegiatan.",
      "Cantumkan periode penilaian yang sedang diajukan.",
    ],
  },
  {
    id: "D33-01",
    slug: "d33-01",
    title: "Sertifikasi Kompetensi PBJ",
    officialName: "Pelayanan Sertifikasi Kompetensi Pengadaan Barang/Jasa",
    unitId: "D33",
    unitLabel: "Direktorat Sertifikasi Profesi",
    groupLabel: "Sertifikasi PBJ",
    description:
      "Layanan sertifikasi kompetensi pengadaan barang/jasa untuk individu dan peserta terkait.",
    audience: "Peserta sertifikasi dan pihak yang membutuhkan informasi sertifikasi PBJ.",
    durationMinutes: 30,
    dailyQuota: 12,
    exampleNeeds: [
      "Konsultasi tahapan sertifikasi kompetensi PBJ.",
      "Klarifikasi persyaratan administrasi sertifikasi.",
    ],
    preparationNotes: [
      "Siapkan data peserta dan kebutuhan sertifikasi yang akan dibahas.",
      "Bawa dokumen persyaratan yang belum jelas bila diperlukan.",
    ],
  },
  {
    id: "D41-01",
    slug: "d41-01",
    title: "Advokasi Pengadaan Instansi Pusat",
    officialName: "Pelayanan Advokasi dan Permasalahan Pengadaan (Pusat)",
    unitId: "D41",
    unitLabel: "Direktorat Advokasi Pemerintah Pusat",
    groupLabel: "Advokasi Instansi Pusat",
    description:
      "Advokasi dan penanganan permasalahan pengadaan untuk instansi pemerintah pusat.",
    audience: "Instansi pusat yang memerlukan advokasi atau pendapat atas isu pengadaan.",
    durationMinutes: 30,
    dailyQuota: 12,
    exampleNeeds: [
      "Konsultasi kasus pengadaan pada instansi pusat.",
      "Permintaan pendampingan penyelesaian permasalahan PBJ pusat.",
    ],
    preparationNotes: [
      "Tuliskan duduk perkara secara ringkas dan kronologis.",
      "Siapkan dokumen pendukung kasus yang relevan.",
    ],
  },
  {
    id: "D42-01",
    slug: "d42-01",
    title: "Advokasi Pengadaan Instansi Daerah",
    officialName: "Pelayanan Advokasi dan Permasalahan Pengadaan (Daerah)",
    unitId: "D42",
    unitLabel: "Direktorat Advokasi Pemerintah Daerah",
    groupLabel: "Advokasi Instansi Daerah",
    description:
      "Advokasi dan penanganan permasalahan pengadaan untuk instansi pemerintah daerah.",
    audience: "Pemerintah daerah dan unit terkait yang memerlukan advokasi pengadaan.",
    durationMinutes: 30,
    dailyQuota: 12,
    exampleNeeds: [
      "Konsultasi permasalahan pengadaan di daerah.",
      "Pendampingan penyelesaian isu PBJ daerah.",
    ],
    preparationNotes: [
      "Bawa ringkasan kasus dan identifikasi pihak yang terlibat.",
      "Siapkan dokumen pendukung utama yang perlu ditelaah.",
    ],
  },
  {
    id: "D43-01",
    slug: "d43-01",
    title: "Keterangan Ahli PBJ",
    officialName: "Pelayanan Pemberian Keterangan Ahli Pengadaan Barang/Jasa (PKA PBJ)",
    unitId: "D43",
    unitLabel: "Direktorat Penanganan Permasalahan Hukum",
    groupLabel: "Hukum PBJ",
    description:
      "Pelayanan pemberian keterangan ahli pengadaan barang/jasa untuk kebutuhan hukum PBJ.",
    audience: "Pihak yang memerlukan dukungan keterangan ahli dalam konteks hukum pengadaan.",
    durationMinutes: 30,
    dailyQuota: 10,
    exampleNeeds: [
      "Permohonan keterangan ahli untuk kasus pengadaan.",
      "Klarifikasi ruang lingkup dukungan ahli PBJ.",
    ],
    preparationNotes: [
      "Siapkan pokok perkara dan kebutuhan keterangan ahli.",
      "Cantumkan tahapan proses hukum yang sedang berjalan bila ada.",
    ],
  },
  {
    id: "PPSDM-01",
    slug: "ppsdm-01",
    title: "Pelatihan Teknis PBJ",
    officialName: "Pelayanan Penyelenggaraan Pelatihan Teknis",
    unitId: "PPSDM",
    unitLabel: "Pusat Pelatihan Sumber Daya Manusia Pengadaan Barang/Jasa",
    groupLabel: "Pelatihan & Akreditasi",
    description:
      "Pelayanan terkait penyelenggaraan pelatihan teknis pengadaan barang/jasa.",
    audience: "Instansi dan peserta yang membutuhkan pelatihan teknis PBJ.",
    durationMinutes: 30,
    dailyQuota: 20,
    exampleNeeds: [
      "Permohonan pelatihan teknis untuk pegawai pengadaan.",
      "Diskusi kebutuhan materi dan target peserta pelatihan teknis.",
    ],
    preparationNotes: [
      "Siapkan jumlah peserta dan kebutuhan pelatihan utama.",
      "Tuliskan bentuk kegiatan yang diharapkan.",
    ],
  },
  {
    id: "PPSDM-02",
    slug: "ppsdm-02",
    title: "Pelatihan Fungsional PBJ",
    officialName: "Pelayanan Penyelenggaraan Pelatihan Fungsional",
    unitId: "PPSDM",
    unitLabel: "Pusat Pelatihan Sumber Daya Manusia Pengadaan Barang/Jasa",
    groupLabel: "Pelatihan & Akreditasi",
    description:
      "Pelayanan terkait pelatihan fungsional pengadaan barang/jasa.",
    audience: "Peserta yang membutuhkan pelatihan fungsional PBJ.",
    durationMinutes: 30,
    dailyQuota: 18,
    exampleNeeds: [
      "Koordinasi penyelenggaraan pelatihan fungsional.",
      "Konsultasi persyaratan peserta pelatihan fungsional.",
    ],
    preparationNotes: [
      "Cantumkan jenis pelatihan fungsional yang dibutuhkan.",
      "Bawa informasi peserta dan periode pelaksanaan yang diinginkan.",
    ],
  },
  {
    id: "PPSDM-03",
    slug: "ppsdm-03",
    title: "Akreditasi LPPBJ",
    officialName:
      "Pelayanan Akreditasi Lembaga Pelatihan Pengadaan Barang/Jasa (LPPBJ)",
    unitId: "PPSDM",
    unitLabel: "Pusat Pelatihan Sumber Daya Manusia Pengadaan Barang/Jasa",
    groupLabel: "Pelatihan & Akreditasi",
    description:
      "Pelayanan akreditasi lembaga pelatihan pengadaan barang/jasa.",
    audience: "Lembaga pelatihan yang ingin mengurus atau meninjau akreditasi LPPBJ.",
    durationMinutes: 30,
    dailyQuota: 10,
    exampleNeeds: [
      "Konsultasi proses akreditasi lembaga pelatihan.",
      "Review persyaratan dokumen akreditasi LPPBJ.",
    ],
    preparationNotes: [
      "Siapkan profil lembaga dan dokumen akreditasi yang sudah tersedia.",
      "Catat kendala utama yang dihadapi dalam proses akreditasi.",
    ],
  },
  {
    id: "BHU-01",
    slug: "bhu-01",
    title: "Verifikasi dan Bimtek LPSE LKPP",
    officialName:
      "Verifikasi LPSE LKPP/Pelayanan Bimbingan Teknis Standarisasi LPSE (Layanan Pengadaan Secara Elektronik) di LKPP",
    unitId: "BHU",
    unitLabel: "Biro Hubungan Masyarakat dan Umum",
    groupLabel: "Humas & LPSE LKPP",
    description:
      "Verifikasi LPSE LKPP dan layanan bimbingan teknis standarisasi LPSE.",
    audience: "Pengelola layanan publik, LPSE, dan pihak yang membutuhkan verifikasi LPSE.",
    durationMinutes: 30,
    dailyQuota: 15,
    exampleNeeds: [
      "Verifikasi layanan LPSE LKPP.",
      "Koordinasi bimtek standarisasi LPSE di lingkungan layanan publik.",
    ],
    preparationNotes: [
      "Bawa informasi identitas LPSE atau unit layanan yang dibahas.",
      "Cantumkan topik verifikasi atau standarisasi yang perlu didalami.",
    ],
  },
];

export const bookingServices: BookingServiceEntry[] = bookingServiceEntriesBase.map((service) => ({
  ...service,
  serviceLevel: bookingServiceLevelOverrides[service.id] ?? 1,
}));

export const bookingServiceSections: BookingServiceSection[] = bookingUnitEntries
  .map((unit) => ({
    ...unit,
    services: bookingServices.filter((service) => service.unitId === unit.id),
  }))
  .filter((section) => section.services.length > 0);

export const bookingCategorySummaries: Record<string, string> = {
  "Regulasi & Peraturan PBJ":
    "Penafsiran aturan dan sosialisasi regulasi pengadaan.",
  "Kebijakan Khusus & KPBU":
    "Kebijakan khusus, desa, BLU/BLUD, dan proyek KPBU.",
  "Pelaku Usaha":
    "Pendampingan pelaku usaha dan kesiapan masuk ekosistem pengadaan.",
  "Perencanaan & Monev":
    "RUP, monitoring evaluasi, dan daftar hitam.",
  "SPSE & LPSE":
    "Akun, kendala sistem digital, dan standarisasi LPSE.",
  "Katalog & Pasar Digital":
    "Katalog elektronik, toko daring, dan e-purchasing.",
  "Kelembagaan & JF PBJ":
    "Pembinaan UKPBJ, kematangan organisasi, dan JF PBJ.",
  "Sertifikasi PBJ":
    "Konsultasi sertifikasi kompetensi PBJ.",
  "Advokasi Instansi Pusat":
    "Advokasi pengadaan bagi instansi pusat.",
  "Advokasi Instansi Daerah":
    "Advokasi pengadaan bagi instansi daerah.",
  "Hukum PBJ":
    "Keterangan ahli dan pendampingan isu hukum PBJ.",
  "Pelatihan & Akreditasi":
    "Pelatihan teknis, fungsional, dan akreditasi LPPBJ.",
  "Humas & LPSE LKPP":
    "Verifikasi LPSE LKPP dan kebutuhan komunikasi layanan publik.",
};

export function getBookingServiceBySlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  return bookingServices.find((service) => service.slug === normalizedSlug);
}

export function getBookingServiceById(id: string) {
  const normalizedId = id.trim().toUpperCase();
  return bookingServices.find((service) => service.id === normalizedId);
}

export function inferBookingServiceLevel(
  serviceId: string,
  fallback: 1 | 2 = 1,
) {
  const normalizedId = serviceId.trim().toUpperCase();
  if (!normalizedId) {
    return fallback === 2 ? 2 : 1;
  }

  const service = getBookingServiceById(normalizedId);
  if (service?.serviceLevel === 2) {
    return 2;
  }

  return fallback === 2 ? 2 : 1;
}

export function getBookingServicesByLevel(level: 1 | 2) {
  return bookingServices.filter((service) => service.serviceLevel === level);
}

export function getBookingServiceLevelLabel(level: 1 | 2) {
  return level === 2 ? "Level 2" : "Level 1";
}

export function buildBookingCatalogGroups(
  services: BookingServiceEntry[],
): BookingCatalogCategoryGroup[] {
  const allowedServiceIds = new Set(services.map((service) => service.id));
  const grouped = new Map<string, BookingCatalogCategoryGroup>();

  bookingServiceSections.forEach((section) => {
    const matchedServices = section.services.filter((service) =>
      allowedServiceIds.has(service.id),
    );

    if (!matchedServices.length) {
      return;
    }

    const current = grouped.get(section.groupLabel);
    const unitGroup: BookingCatalogUnitGroup = {
      unitId: section.id,
      unitLabel: section.label,
      unitDescription: section.description,
      services: matchedServices,
    };

    if (!current) {
      grouped.set(section.groupLabel, {
        category: section.groupLabel,
        description:
          bookingCategorySummaries[section.groupLabel] ?? section.description,
        units: [unitGroup],
        serviceCount: matchedServices.length,
      });
      return;
    }

    current.units.push(unitGroup);
    current.serviceCount += matchedServices.length;
  });

  return Array.from(grouped.values());
}
