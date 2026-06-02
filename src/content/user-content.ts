export const userDashboardAppointments = [
  {
    id: "D22-01-001",
    service: "Konsultasi INAPROC, SPSE, dan SIKaP",
    schedule: "Kamis, 18 April 2026 - 13:30 WIB",
    status: "Sudah Hadir",
  },
  {
    id: "D11-02-001",
    service: "Diseminasi Peraturan PBJ",
    schedule: "Selasa, 23 April 2026 - 10:00 WIB",
    status: "Terjadwal",
  },
] as const;

export const userFeaturePageMeta = {
  "jadwal-saya": {
    currentPath: "/jadwal-saya",
    title: "Jadwal Saya",
    subtitle: "Kelola janji layanan dan antrian aktif Anda dalam satu halaman.",
    eyebrow: "Agenda Layanan",
    heroTitle: "Semua jadwal kunjungan Anda tersusun dan mudah ditinjau ulang.",
    heroDescription:
      "Halaman ini merangkum antrian aktif, kunjungan mendatang, dan histori yang perlu Anda tindak lanjuti.",
  },
  panduan: {
    currentPath: "/panduan",
    title: "Panduan Layanan",
    subtitle: "Pahami alur layanan sebelum datang ke LKPP.",
    eyebrow: "Panduan Pengguna",
    heroTitle: "Langkah layanan dibuat sederhana agar warga tidak kebingungan.",
    heroDescription:
      "Gunakan panduan ini untuk memahami pemesanan antrian, check-in, dan proses layanan saat tiba di unit tujuan.",
  },
  bantuan: {
    currentPath: "/bantuan",
    title: "Bantuan",
    subtitle: "Temukan bantuan layanan, kontak, dan jawaban pertanyaan umum.",
    eyebrow: "Pusat Bantuan",
    heroTitle: "Saat butuh arahan, semua kanal bantuan tersedia dalam satu halaman.",
    heroDescription:
      "Kami siapkan jalur bantuan untuk kendala akun, pemesanan layanan, dan koordinasi dengan petugas frontdesk.",
  },
  profil: {
    currentPath: "/profil",
    title: "Profil Pengguna",
    subtitle: "Perbarui data dasar Anda agar proses layanan berjalan lebih lancar.",
    eyebrow: "Profil Akun",
    heroTitle: "Profil yang lengkap membuat booking dan verifikasi lebih cepat.",
    heroDescription:
      "Informasi kontak dan identitas dasar Anda dipakai untuk konfirmasi, check-in, dan tindak lanjut layanan.",
  },
  pengaturan: {
    currentPath: "/pengaturan",
    title: "Pengaturan",
    subtitle: "Atur preferensi notifikasi dan keamanan akun Anda.",
    eyebrow: "Preferensi Sistem",
    heroTitle: "Pengaturan yang rapi menjaga pengalaman layanan tetap nyaman dan aman.",
    heroDescription:
      "Semua preferensi penting ditempatkan di sini agar mudah diubah tanpa mengganggu alur utama pengguna.",
  },
} as const;

export const userGuideSteps = [
  {
    title: "Ambil antrian",
    description: "Pilih layanan, tanggal, dan slot waktu yang paling sesuai dengan kebutuhan Anda.",
  },
  {
    title: "Lengkapi profil",
    description: "Pastikan identitas dan kontak Anda sudah lengkap agar verifikasi berjalan lancar.",
  },
  {
    title: "Check-in saat tiba",
    description: "Datang sesuai jadwal lalu tunjukkan nomor antrian ke resepsionis untuk diarahkan.",
  },
  {
    title: "Ikuti layanan unit",
    description: "Petugas unit akan memanggil antrian Anda dan memproses kebutuhan layanan sampai selesai.",
  },
] as const;

export const userGuideFaqs = [
  {
    question: "Bagaimana jika saya terlambat datang ke slot layanan?",
    answer:
      "Usahakan hadir minimal 15 menit sebelum jadwal. Jika datang terlambat, antrian dapat dilewati atau dijadwalkan ulang sesuai keputusan petugas.",
  },
  {
    question: "Bisakah saya memindahkan jadwal ke hari lain?",
    answer:
      "Bisa, selama slot pengganti masih tersedia dan belum melewati hari layanan. Gunakan halaman bantuan atau hubungi frontdesk untuk arahan lebih lanjut.",
  },
  {
    question: "Apa yang perlu saya siapkan sebelum datang ke frontdesk?",
    answer:
      "Siapkan nomor antrian atau QR, identitas yang relevan, serta ringkasan kebutuhan layanan agar proses check-in dan verifikasi berjalan lebih cepat.",
  },
] as const;

export const userHelpQuickTopics = [
  {
    title: "Salah pilih layanan",
    description:
      "Gunakan halaman bantuan atau datang ke frontdesk. Petugas akan membantu mengarahkan Anda ke unit yang tepat.",
  },
  {
    title: "QR tidak bisa dipindai",
    description:
      "Tunjukkan nomor antrian Anda. Resepsionis tetap bisa mencari tiket secara manual.",
  },
  {
    title: "Perubahan jadwal",
    description:
      "Perubahan jadwal hanya bisa dibantu jika slot pengganti masih tersedia dan belum melewati hari layanan.",
  },
  {
    title: "Kendala akun digital",
    description:
      "Untuk INAPROC, SPSE, SIKaP, atau SPSE ICB, pilih layanan Sistem Pengadaan Digital agar penanganannya tepat.",
  },
] as const;

export const userHelpFaqItems = [
  {
    question: "Apakah saya harus check-in saat tiba di LKPP?",
    answer:
      "Ya. Saat tiba, tunjukkan QR atau nomor antrian ke resepsionis untuk konfirmasi kehadiran sebelum diarahkan ke unit tujuan.",
  },
  {
    question: "Bagaimana jika saya terlambat datang?",
    answer:
      "Usahakan hadir 15 menit lebih awal. Jika terlambat, antrian bisa terlewat dan Anda mungkin perlu dijadwalkan ulang sesuai keputusan petugas frontdesk.",
  },
  {
    question: "Bisakah saya datang bersama tim?",
    answer:
      "Bisa, selama jumlah peserta sudah dicantumkan saat booking. Jika jumlah tamu berubah jauh dari rencana awal, sebaiknya hubungi bantuan terlebih dahulu.",
  },
  {
    question: "Apa yang perlu disiapkan sebelum konsultasi?",
    answer:
      "Siapkan ringkasan masalah, dokumen pendukung, dan data akun atau identitas instansi yang terkait dengan topik layanan Anda.",
  },
  {
    question: "Bagaimana jika saya salah memilih layanan?",
    answer:
      "Anda bisa meminta arahan ke frontdesk atau membuka halaman bantuan. Petugas akan membantu memastikan kebutuhan Anda diarahkan ke unit yang tepat.",
  },
  {
    question: "Bagaimana jika QR saya tidak bisa dibuka?",
    answer:
      "Nomor antrian tetap bisa dipakai. Sebutkan nomor antrian Anda ke resepsionis agar tiket dicari secara manual.",
  },
  {
    question: "Kapan saya harus memilih layanan Sistem Pengadaan Digital?",
    answer:
      "Pilih layanan ini jika kendala Anda berkaitan dengan akun INAPROC, SPSE, SIKaP, SPSE ICB, sosialisasi SPSE, atau standarisasi LPSE.",
  },
  {
    question: "Kapan saya harus memilih layanan Katalog Elektronik dan Toko Daring?",
    answer:
      "Pilih layanan ini jika masalah Anda terkait e-purchasing, produk tidak tayang, data penyedia, pembelian produk, atau pengelolaan katalog elektronik.",
  },
] as const;
