import type { LegacyRoleFlow } from "@/content/legacy-flow/types";

export const publicAuthFlow: LegacyRoleFlow = {
  role: "public-auth",
  label: "Publik, Auth Pengguna, dan Self-Service",
  loginEntry: "/login",
  dashboardEntry: "/dashboard",
  legacySources: [
    "src/app/views/Landing.tsx",
    "src/app/views/Home.tsx",
    "src/app/views/BookService.tsx",
    "src/app/views/AppointmentList.tsx",
    "src/app/views/AppointmentDetail.tsx",
    "src/app/views/Profile.tsx",
    "src/app/views/UserHelp.tsx",
    "src/app/context/AppContext.tsx",
    "src/app/utils/api.ts",
  ],
  summary:
    "Flow publik dan pengguna berpusat pada landing, login/register, booking wizard, daftar antrean, detail antrean, profil, dan bantuan. Kontrak bisnis harus dipertahankan walau layout berpindah ke shell baru.",
  parityStatus: "partial",
  featureFlows: [
    {
      key: "landing-public",
      label: "Landing Publik",
      legacyView: "src/app/views/Landing.tsx",
      legacyRoutes: ["/"],
      targetRoutes: ["/"],
      businessGoal:
        "Menjadi pintu masuk untuk mengenal layanan, masuk sebagai pengguna, daftar akun, dan mulai ambil antrean.",
      primaryActor: "Publik",
      parityStatus: "partial",
      apiContracts: [
        {
          name: "getPublicHelpFaqs",
          method: "GET",
          path: "/help-faqs/public",
          note: "FAQ publik dibaca untuk landing dan bantuan user.",
        },
      ],
      notes: [
        "Layout baru sudah ada, tetapi CTA dan copy harus tetap mengikuti intent legacy: login, daftar, ambil antrean, FAQ, dan bantuan.",
      ],
      steps: [
        {
          id: "landing-1",
          title: "Publik membuka landing",
          description:
            "Halaman menampilkan pengantar layanan, daftar layanan, CTA masuk dan daftar, serta jalur ke ambil antrean.",
          legacyRoute: "/",
          targetRoute: "/",
          output: "User memilih jalur: login, daftar, atau buka layanan.",
        },
      ],
    },
    {
      key: "login-user",
      label: "Login Pengguna",
      legacyView: "src/app/views/Landing.tsx",
      legacyRoutes: ["/"],
      targetRoutes: ["/login"],
      businessGoal:
        "Pengguna masuk memakai email dan PIN, melewati captcha, lalu diarahkan ke dashboard pengguna.",
      primaryActor: "Pengguna",
      parityStatus: "partial",
      apiContracts: [
        { name: "loginUser", method: "POST", path: "/auth/login" },
      ],
      steps: [
        {
          id: "login-user-1",
          title: "Isi email dan PIN",
          description:
            "Pengguna mengisi email dan PIN di form login user.",
          legacyRoute: "/",
          targetRoute: "/login",
        },
        {
          id: "login-user-2",
          title: "Lolos verifikasi captcha",
          description:
            "Token captcha dikirim bersama form login untuk memvalidasi permintaan.",
          apiContracts: [{ name: "loginUser", method: "POST", path: "/auth/login" }],
          gate: "Captcha Turnstile valid",
        },
        {
          id: "login-user-3",
          title: "Sesi user aktif",
          description:
            "Saat login berhasil, session user tersimpan dan data scoped dimuat ulang.",
          targetRoute: "/dashboard",
          output: "Pengguna masuk ke dashboard.",
        },
      ],
    },
    {
      key: "register-user",
      label: "Daftar Pengguna",
      legacyView: "src/app/views/Landing.tsx",
      legacyRoutes: ["/"],
      targetRoutes: ["/register"],
      businessGoal:
        "Pengguna membuat akun baru, lalu menjalani verifikasi email/OTP/link hingga akun siap dipakai.",
      primaryActor: "Pengguna",
      parityStatus: "partial",
      apiContracts: [
        { name: "registerUser", method: "POST", path: "/auth/register" },
        {
          name: "sendRegisterVerification",
          method: "POST",
          path: "/auth/register/send-verification",
        },
        {
          name: "verifyRegisterVerification",
          method: "POST",
          path: "/auth/register/verify",
        },
        {
          name: "verifyRegisterVerificationLink",
          method: "POST",
          path: "/auth/register/verify-link",
        },
      ],
      steps: [
        {
          id: "register-1",
          title: "Isi identitas dasar",
          description:
            "Nama, telepon, email, dan PIN dikumpulkan sebagai data akun awal.",
          targetRoute: "/register",
        },
        {
          id: "register-2",
          title: "Kirim verifikasi",
          description:
            "Sistem menyiapkan challenge verifikasi untuk email pengguna.",
          apiContracts: [
            {
              name: "sendRegisterVerification",
              method: "POST",
              path: "/auth/register/send-verification",
            },
          ],
        },
        {
          id: "register-3",
          title: "Validasi link atau OTP",
          description:
            "Pengguna memverifikasi akun melalui link email atau OTP agar akun siap dipakai.",
          apiContracts: [
            {
              name: "verifyRegisterVerification",
              method: "POST",
              path: "/auth/register/verify",
            },
            {
              name: "verifyRegisterVerificationLink",
              method: "POST",
              path: "/auth/register/verify-link",
            },
          ],
          output: "Akun menjadi aktif.",
        },
      ],
    },
    {
      key: "booking-user",
      label: "Booking / Ambil Antrean",
      legacyView: "src/app/views/BookService.tsx",
      legacyRoutes: ["/book", "/book/:serviceId"],
      targetRoutes: ["/layanan", "/layanan/[serviceId]", "/ambil-antrean"],
      businessGoal:
        "Pengguna memilih layanan, menjelaskan keluhan, memilih tanggal, lalu sistem membuat antrean dengan slot berikutnya yang tersedia.",
      primaryActor: "Pengguna",
      parityStatus: "partial",
      apiContracts: [
        { name: "countSlotsForDate", note: "Dipakai untuk membaca kapasitas slot per tanggal." },
        { name: "getNextSlotForDate", note: "Dipakai untuk menentukan slot otomatis berikutnya." },
        { name: "bookAppointment", method: "POST", path: "/appointments" },
      ],
      steps: [
        {
          id: "booking-1",
          title: "Pilih layanan",
          description:
            "Pengguna memilih layanan dari katalog publik atau langsung dari route layanan tertentu.",
          legacyRoute: "/book",
          targetRoute: "/layanan",
        },
        {
          id: "booking-2",
          title: "Isi keluhan dan jumlah peserta",
          description:
            "Pengguna menjelaskan keperluan/keluhan dan jumlah orang yang hadir.",
        },
        {
          id: "booking-3",
          title: "Pilih tanggal kunjungan",
          description:
            "Sistem membaca slot yang tersedia berdasarkan layanan, konfigurasi unit, dan kuota harian.",
          apiContracts: [
            { name: "countSlotsForDate" },
            { name: "getNextSlotForDate" },
          ],
        },
        {
          id: "booking-4",
          title: "Konfirmasi booking",
          description:
            "Sistem membuat appointment dengan slot start/end yang dihitung otomatis.",
          apiContracts: [
            { name: "bookAppointment", method: "POST", path: "/appointments" },
          ],
          output: "User diarahkan ke detail antrean yang baru dibuat.",
        },
      ],
    },
    {
      key: "profile-booking-guard",
      label: "Guard Profil Wajib",
      legacyView: "src/app/layouts/UserLayout.tsx",
      legacyRoutes: ["/home", "/book", "/appointments", "/help", "/profile"],
      targetRoutes: ["/dashboard", "/layanan", "/jadwal-saya", "/bantuan", "/profil"],
      businessGoal:
        "Booking hanya bisa berjalan jika data wajib pengguna sudah lengkap, dengan jalur balik yang tetap jelas ke tujuan awal.",
      primaryActor: "Pengguna",
      parityStatus: "partial",
      apiContracts: [
        { name: "getCurrentUserProfile", method: "GET", path: "/users/me/profile" },
        { name: "updateUserProfile", method: "PUT", path: "/users/:id/profile" },
      ],
      notes: [
        "Kontrak pentingnya bukan hanya modal, tetapi juga guard ke flow booking dan returnTo ke halaman tujuan semula.",
      ],
      steps: [
        {
          id: "profile-guard-1",
          title: "Cek kelengkapan profil booking",
          description:
            "Sistem memeriksa nama, kontak, email, asal instansi, NIK, provinsi, dan kabupaten/kota.",
          gate: "Profil wajib lengkap sebelum booking",
        },
        {
          id: "profile-guard-2",
          title: "Blokir akses booking jika belum lengkap",
          description:
            "Saat user mencoba ambil antrean, sistem mengarahkan user ke profil dengan konteks forceCompleteProfile dan returnTo.",
          targetRoute: "/profil",
          output: "User melengkapi profil lalu kembali ke halaman booking yang dituju.",
        },
      ],
    },
    {
      key: "appointment-list",
      label: "Daftar Antrean Pengguna",
      legacyView: "src/app/views/AppointmentList.tsx",
      legacyRoutes: ["/appointments"],
      targetRoutes: ["/jadwal-saya"],
      businessGoal:
        "Pengguna melihat antrean aktif dan riwayat dalam satu halaman bertab.",
      primaryActor: "Pengguna",
      parityStatus: "partial",
      apiContracts: [{ name: "getUserAppointments" }],
      steps: [
        {
          id: "apt-list-1",
          title: "Buka daftar antrean",
          description:
            "Halaman memisahkan tab aktif dan riwayat berdasarkan status appointment.",
          legacyRoute: "/appointments",
          targetRoute: "/jadwal-saya",
        },
        {
          id: "apt-list-2",
          title: "Buka detail antrean",
          description:
            "Klik kartu antrean untuk membuka halaman detail appointment.",
          targetRoute: "/jadwal-saya/[appointmentId]",
          output: "Detail antrean terbuka.",
        },
      ],
    },
    {
      key: "appointment-detail",
      label: "Detail Antrean Pengguna",
      legacyView: "src/app/views/AppointmentDetail.tsx",
      legacyRoutes: ["/appointments/:id"],
      targetRoutes: ["/jadwal-saya/[appointmentId]"],
      businessGoal:
        "Pengguna melihat nomor antrean, status layanan, catatan requeue, dan aksi seperti batalkan atau beri rating.",
      primaryActor: "Pengguna",
      parityStatus: "partial",
      apiContracts: [
        { name: "cancelAppointment", method: "PUT", path: "/appointments/:id", note: "action=cancel" },
        { name: "rateAppointment", method: "PUT", path: "/appointments/:id", note: "action=rating" },
      ],
      steps: [
        {
          id: "apt-detail-1",
          title: "Baca status antrean",
          description:
            "Halaman menampilkan queue number, layanan, jadwal, status hadir, dan posisi layanan.",
        },
        {
          id: "apt-detail-2",
          title: "Batalkan antrean bila perlu",
          description:
            "Jika antrean masih bisa dibatalkan, user dapat menutup booking dari halaman detail.",
          apiContracts: [
            { name: "cancelAppointment", method: "PUT", path: "/appointments/:id", note: "action=cancel" },
          ],
        },
        {
          id: "apt-detail-3",
          title: "Beri rating layanan",
          description:
            "Setelah layanan selesai, user membuka tautan/rating flow untuk memberikan umpan balik.",
          apiContracts: [
            { name: "rateAppointment", method: "PUT", path: "/appointments/:id", note: "action=rating" },
          ],
        },
      ],
    },
    {
      key: "calling-alert-user",
      label: "Alert Panggilan Antrean",
      legacyView: "src/app/components/CallingAlert.tsx",
      legacyRoutes: ["/home", "/appointments", "/appointments/:id", "/help", "/profile"],
      targetRoutes: ["/dashboard", "/jadwal-saya", "/jadwal-saya/[appointmentId]", "/bantuan", "/profil"],
      businessGoal:
        "Saat antrean dipanggil, user langsung mendapat alert global dan bisa masuk cepat ke detail antrean.",
      primaryActor: "Pengguna",
      parityStatus: "todo",
      apiContracts: [
        { name: "getUserAppointments" },
        { name: "subscribeAppointmentStatus", note: "Polling atau realtime perubahan status panggilan." },
      ],
      notes: [
        "Alert ini harus bisa muncul lintas halaman user, bukan hanya di dashboard.",
        "Repeated call perlu bisa memicu alert ulang saat callCount berubah.",
      ],
      steps: [
        {
          id: "calling-alert-1",
          title: "Deteksi antrean yang sedang dipanggil",
          description:
            "Sistem memantau appointment aktif dengan status calling atau perubahan jumlah panggilan.",
        },
        {
          id: "calling-alert-2",
          title: "Tampilkan alert global",
          description:
            "User melihat pemberitahuan prioritas tinggi dan bisa membuka detail antrean terkait.",
          targetRoute: "/jadwal-saya/[appointmentId]",
        },
      ],
    },
    {
      key: "profile-user",
      label: "Profil Pengguna",
      legacyView: "src/app/views/Profile.tsx",
      legacyRoutes: ["/profile"],
      targetRoutes: ["/profil"],
      businessGoal:
        "Pengguna melengkapi data wajib booking, mengubah kontak/foto, memverifikasi email, dan mengganti PIN.",
      primaryActor: "Pengguna",
      parityStatus: "partial",
      apiContracts: [
        { name: "updateUserProfile", method: "PUT", path: "/users/:id/profile" },
        { name: "uploadUserPhoto", method: "POST", path: "/users/:id/photo" },
        { name: "sendUserVerification", method: "POST", path: "/users/:id/verification/send" },
        { name: "changeUserPassword", method: "POST", path: "/users/:id/password" },
      ],
      steps: [
        {
          id: "profile-user-1",
          title: "Lengkapi data wajib booking",
          description:
            "Asal instansi, NIK, provinsi, dan kabupaten/kota harus lengkap sebelum booking dibuka.",
          gate: "Profil wajib lengkap",
        },
        {
          id: "profile-user-2",
          title: "Simpan profil",
          description:
            "Saat profil diperbarui, data lokal dan session user ikut diperbarui.",
          apiContracts: [
            { name: "updateUserProfile", method: "PUT", path: "/users/:id/profile" },
          ],
        },
      ],
    },
    {
      key: "help-user",
      label: "Bantuan Pengguna",
      legacyView: "src/app/views/UserHelp.tsx",
      legacyRoutes: ["/help"],
      targetRoutes: ["/bantuan"],
      businessGoal:
        "Pengguna membuka quick actions dan FAQ dinamis tanpa harus mencari menu lain.",
      primaryActor: "Pengguna",
      parityStatus: "partial",
      apiContracts: [
        { name: "getPublicHelpFaqs", method: "GET", path: "/help-faqs/public" },
      ],
      steps: [
        {
          id: "help-user-1",
          title: "Buka halaman bantuan",
          description:
            "Halaman menampilkan quick actions seperti ambil antrean, lihat antrean, dan buka profil.",
          legacyRoute: "/help",
          targetRoute: "/bantuan",
        },
        {
          id: "help-user-2",
          title: "Baca FAQ dinamis",
          description:
            "FAQ dibaca dari backend, dengan fallback ke daftar default saat API tidak tersedia.",
          apiContracts: [
            { name: "getPublicHelpFaqs", method: "GET", path: "/help-faqs/public" },
          ],
        },
      ],
    },
  ],
};
