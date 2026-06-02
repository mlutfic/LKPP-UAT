export type LoginVariant = "user" | "staff";

export const loginContent = {
  user: {
    pageTitle: "Masuk Pengguna",
    title: "Masuk Pengguna",
    description: "Masuk menggunakan email dan password untuk melihat jadwal serta antrean aktif Anda.",
    noticeTitle: "",
    noticeDescription: "",
    submitLabel: "Masuk",
    footerPrompt: "Belum punya akun?",
    footerHref: "/register",
    footerLabel: "Daftar",
    switchPrompt: "",
    switchHref: "",
    switchLabel: "",
  },
  staff: {
    pageTitle: "Masuk Petugas",
    title: "Masuk Petugas",
    description:
      "Masuk menggunakan akun petugas yang aktif.",
    noticeTitle: "Akses internal LKPP",
    noticeDescription:
      "Gunakan login petugas yang diberikan administrator layanan. Dashboard akan diarahkan otomatis sesuai peran akun Anda.",
    submitLabel: "Masuk sebagai Petugas",
    footerPrompt: "Butuh bantuan akun petugas?",
    footerHref: "/bantuan",
    footerLabel: "Hubungi Admin Layanan",
    switchPrompt: "Pengguna umum?",
    switchHref: "/login",
    switchLabel: "Masuk Pengguna",
  },
} as const satisfies Record<LoginVariant, {
  pageTitle: string;
  title: string;
  description: string;
  noticeTitle: string;
  noticeDescription: string;
  submitLabel: string;
  footerPrompt: string;
  footerHref: string;
  footerLabel: string;
  switchPrompt: string;
  switchHref: string;
  switchLabel: string;
}>;

export const registerContent = {
  pageTitle: "Pendaftaran Akun Baru",
  title: "Pendaftaran Akun Baru",
  description: "Lengkapi data awal untuk membuat akun pengguna layanan LKPP.",
  footerPrompt: "Sudah memiliki akun?",
  footerHref: "/login",
  footerLabel: "Masuk",
} as const;

export const resetPinContent = {
  pageTitle: "Reset Password",
  title: "Reset Password",
  description: "Masukkan email akun untuk memulihkan akses pengguna.",
  submitLabel: "Simpan Password Baru",
  footerPrompt: "Sudah ingat password Anda?",
  footerHref: "/login",
  footerLabel: "Kembali ke Masuk",
} as const;
