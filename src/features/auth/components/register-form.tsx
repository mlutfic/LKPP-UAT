"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Mail,
  Phone,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AuthShell } from "@/components/shell/auth-shell";
import { registerContent } from "@/content/auth-content";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppCheckbox } from "@/components/ui/app-checkbox";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppFormField } from "@/components/ui/app-form-field";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";
import { AppPasswordInput } from "@/components/ui/app-password-input";
import {
  getRegisterVerificationStatus,
  loginUser,
  registerUser,
  sendRegisterVerification,
  verifyRegisterVerification,
} from "@/lib/api/auth";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { persistMockSession } from "@/lib/mock-auth";
import { syncMockUserProfileFromLiveUser } from "@/lib/mock-user-profile";
import {
  PASSWORD_POLICY_HINT,
  createPasswordSchema,
} from "@/lib/password-policy";

const REGISTER_PENDING_KEY = "lkpp-register-pending";
const REGISTER_TERMS_SECTIONS = [
  {
    title: "Pemberitahuan resmi",
    body: [
      "Dokumen ini merupakan pemberitahuan resmi kepada pemilik data pribadi sesuai Keputusan Sekretaris Utama LKPP Nomor 55 Tahun 2026 dan Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.",
      "Berlaku sejak 3 Maret 2026. Baca seluruh ketentuan sebelum melanjutkan pendaftaran tamu LKPP.",
    ],
  },
  {
    title: "Data yang dikumpulkan",
    body: [
      "LKPP mengumpulkan nama lengkap, nomor WhatsApp, alamat email, asal instansi, provinsi asal, kabupaten/kota asal, dan NIK untuk proses pendaftaran tamu digital.",
      "NIK termasuk data pribadi bersifat spesifik. Penggunaannya dibatasi untuk verifikasi identitas tamu dan dilindungi dengan kontrol akses ketat.",
    ],
  },
  {
    title: "Tujuan pemrosesan data",
    body: [
      "Data digunakan untuk verifikasi dan pencatatan identitas tamu, pengelolaan antrean dan layanan kunjungan, pengiriman notifikasi atau tindak lanjut melalui WhatsApp dan email, keamanan kantor, serta statistik kunjungan agregat.",
      "Data tidak digunakan untuk tujuan komersial, profiling, atau tujuan lain di luar ketentuan tanpa persetujuan ulang dari pemilik data.",
    ],
  },
  {
    title: "Dasar hukum pemrosesan",
    body: [
      "Pemrosesan dilakukan berdasarkan pelaksanaan tugas dan fungsi LKPP sebagai instansi pemerintah, Keputusan Sekretaris Utama LKPP Nomor 55 Tahun 2026, Undang-Undang Nomor 27 Tahun 2022, dan persetujuan eksplisit saat pendaftaran.",
    ],
  },
  {
    title: "Masa penyimpanan data",
    body: [
      "Data kunjungan disimpan selama 2 tahun sejak tanggal kunjungan. Setelah masa simpan berakhir, data dimusnahkan dengan cara yang memastikan data tidak dapat dipulihkan kembali.",
      "Akun digital yang tidak aktif selama lebih dari 2 tahun dapat dihapus secara otomatis oleh sistem.",
    ],
  },
  {
    title: "Keakuratan data dan tanggung jawab pengguna",
    body: [
      "Pengguna wajib mengisi data yang benar, akurat, dan merupakan data diri sendiri. Pengisian data palsu atau data milik orang lain dapat menyebabkan penolakan atau penundaan layanan.",
      "Pengguna bertanggung jawab menjaga kerahasiaan akun dan kata sandi. LKPP tidak bertanggung jawab atas akses tidak sah akibat kelalaian pengguna.",
    ],
  },
  {
    title: "Hak pemilik data",
    body: [
      "Pemilik data dapat meminta akses, perbaikan atau pembaruan, penghapusan, pembatasan pemrosesan, dan penarikan persetujuan sesuai ketentuan yang berlaku.",
      "Permintaan terkait hak pemilik data direspons paling lambat 3 x 24 jam sejak permintaan diterima.",
    ],
  },
  {
    title: "Pembatasan akses dan penyebarluasan data",
    body: [
      "Data hanya dapat diakses oleh petugas yang memiliki kebutuhan fungsional langsung. NIK tidak ditampilkan penuh kepada petugas selain yang berwenang melakukan verifikasi identitas.",
      "Data tidak disebarluaskan kepada pihak ketiga di luar LKPP kecuali berdasarkan kewajiban hukum atau persetujuan eksplisit. Statistik kunjungan hanya dipublikasikan dalam bentuk agregat.",
    ],
  },
  {
    title: "Insiden kebocoran data",
    body: [
      "Apabila terjadi kegagalan pelindungan data pribadi yang berdampak serius, LKPP akan menyampaikan pemberitahuan paling lambat 3 x 24 jam sejak insiden diketahui.",
      "Penanganan teknis dilakukan oleh Tim Respon Insiden Keamanan Komputer (CSIRT) LKPP.",
    ],
  },
  {
    title: "Persetujuan digital dan kontak",
    body: [
      "Dengan mencentang kotak persetujuan dan melanjutkan pendaftaran, pengguna menyatakan telah membaca, memahami, dan menyetujui pengumpulan serta pemrosesan data pribadi sesuai tujuan yang tercantum.",
      "Sistem mencatat tanggal/waktu, user ID, dan alamat IP sebagai bukti persetujuan digital. Pertanyaan, permintaan, atau keluhan terkait data pribadi dapat disampaikan melalui Helpdesk resmi LKPP atau kanal yang tersedia dalam aplikasi.",
    ],
  },
] as const;

const registerSchema = z
  .object({
    fullName: z.string().min(3, "Nama lengkap minimal 3 karakter."),
    phone: z.string().min(10, "Nomor WhatsApp belum valid."),
    email: z.string().email("Gunakan alamat email yang valid."),
    password: createPasswordSchema("Password"),
    confirmPassword: createPasswordSchema("Konfirmasi password"),
    terms: z.boolean().refine((value) => value, "Anda harus menyetujui syarat dan kebijakan."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak sama.",
  });

type RegisterValues = z.infer<typeof registerSchema>;

type PendingRegisterState = {
  challengeId: string;
  fullName: string;
  phone: string;
  email: string;
  password: string;
  challengeToken?: string;
  verificationToken?: string;
  expiresAtMs?: number | null;
  deliveryMode?: string;
};

type LiveRegisterUser = Record<string, unknown> & {
  id: string;
};

type RegisterSessionPayload = {
  user: LiveRegisterUser;
  profileToken?: string;
};

const INDONESIA_PHONE_PREFIX = "+62";

function normalizeRegisterPhoneInput(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";

  const normalizedDigits = digits.startsWith("0")
    ? `62${digits.slice(1)}`
    : digits.startsWith("62")
      ? digits
      : digits.startsWith("8")
        ? `62${digits}`
        : `62${digits}`;

  return `+${normalizedDigits.slice(0, 16)}`;
}

function buildCountdownLabel(expiresAtMs?: number | null) {
  if (!expiresAtMs) return null;
  const diffMs = Math.max(expiresAtMs - Date.now(), 0);
  const totalSec = Math.floor(diffMs / 1000);
  if (totalSec <= 0) return "Tautan sudah kedaluwarsa";
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function RegisterForm({
  challengeId,
  verificationToken,
  emailFromCallback,
  phoneFromCallback,
}: {
  challengeId?: string;
  verificationToken?: string;
  emailFromCallback?: string;
  phoneFromCallback?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useLocalStorage<PendingRegisterState | null>(
    REGISTER_PENDING_KEY,
    null,
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [countdownLabel, setCountdownLabel] = React.useState<string | null>(null);
  const [termsDialogOpen, setTermsDialogOpen] = React.useState(false);
  const [termsReachedBottom, setTermsReachedBottom] = React.useState(false);
  const finishingRef = React.useRef(false);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });
  const termsAccepted = form.watch("terms");
  const phoneValue = form.watch("phone");

  React.useEffect(() => {
    form.register("terms");
  }, [form]);

  React.useEffect(() => {
    if (!pending) return;

    form.reset({
      fullName: pending.fullName,
      phone: normalizeRegisterPhoneInput(pending.phone),
      email: pending.email,
      password: pending.password,
      confirmPassword: pending.password,
      terms: form.getValues("terms"),
    });
  }, [form, pending]);

  React.useEffect(() => {
    if (!pending?.challengeId) {
      setOtpCode("");
    }
  }, [pending?.challengeId]);

  React.useEffect(() => {
    if (!challengeId) return;

    setPending((current) => {
      const next = current ?? {
        challengeId,
        fullName: "",
        phone: "",
        email: "",
        password: "",
      };

      return {
        ...next,
        challengeId,
        email: emailFromCallback?.trim() || next.email,
        phone: normalizeRegisterPhoneInput(phoneFromCallback?.trim() || next.phone),
        verificationToken: verificationToken?.trim() || next.verificationToken,
      };
    });
  }, [challengeId, emailFromCallback, phoneFromCallback, setPending, verificationToken]);

  React.useEffect(() => {
    if (!pending?.expiresAtMs) {
      setCountdownLabel(null);
      return;
    }

    const update = () => {
      setCountdownLabel(buildCountdownLabel(pending.expiresAtMs));
    };

    update();
    const intervalId = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalId);
  }, [pending?.expiresAtMs]);

  const resolveRegisteredUserSession = React.useCallback(
    async (
      payload: { user?: unknown; profileToken?: string },
      fallback: Pick<PendingRegisterState, "email" | "password">,
    ): Promise<RegisterSessionPayload | null> => {
      const currentUser =
        payload.user && typeof payload.user === "object"
          ? (payload.user as Record<string, unknown>)
          : null;

      if (!currentUser || typeof currentUser.id !== "string") {
        return null;
      }

      if (typeof payload.profileToken === "string" && payload.profileToken.trim()) {
        return {
          user: currentUser as LiveRegisterUser,
          profileToken: payload.profileToken,
        };
      }

      const loginResult = await loginUser(fallback.email, fallback.password);
      const liveUser =
        loginResult.user && typeof loginResult.user === "object"
          ? (loginResult.user as Record<string, unknown>)
          : null;

      if (!liveUser || typeof liveUser.id !== "string") {
        throw new Error("Akun sudah aktif, tetapi sesi pengguna belum bisa dibuat.");
      }

      return {
        user: liveUser as LiveRegisterUser,
        profileToken:
          typeof loginResult.profileToken === "string" && loginResult.profileToken.trim()
            ? loginResult.profileToken
            : undefined,
      };
    },
    [],
  );

  const finalizeRegister = React.useCallback(
    async (state: PendingRegisterState) => {
      if (finishingRef.current) return;
      if (!state.fullName || !state.phone || !state.email || !state.password) return;
      if (!state.verificationToken) return;

      finishingRef.current = true;
      setIsSubmitting(true);

      try {
        const result = await registerUser({
          name: state.fullName,
          phone: state.phone,
          email: state.email,
          password: state.password,
          verificationToken: state.verificationToken,
        });
        const user =
          result.user && typeof result.user === "object"
            ? (result.user as Record<string, unknown>)
            : null;

        if (!user || typeof user.id !== "string") {
          throw new Error("Akun berhasil dibuat, tetapi data pengguna belum lengkap.");
        }

        persistMockSession({
          authMode: "live",
          variant: "user",
          email:
            typeof user.email === "string" && user.email.trim()
              ? user.email
              : state.email,
          displayName:
            typeof user.name === "string" && user.name.trim()
              ? user.name
              : state.fullName,
          userId: user.id,
          userProfileToken:
            typeof result.profileToken === "string" && result.profileToken.trim()
              ? result.profileToken
              : undefined,
          redirectTo: "/dashboard",
          signedInAt: new Date().toISOString(),
        });
        syncMockUserProfileFromLiveUser(user);
        setPending(null);
        toast.success("Akun berhasil dibuat.");
        router.replace("/dashboard");
      } catch (error) {
        finishingRef.current = false;
        const message =
          error instanceof Error ? error.message : "Gagal menyelesaikan pendaftaran.";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [router, setPending],
  );

  React.useEffect(() => {
    if (!pending?.verificationToken) return;
    void finalizeRegister(pending);
  }, [finalizeRegister, pending]);

  React.useEffect(() => {
    if (
      !pending?.challengeId ||
      pending.verificationToken ||
      !pending.email ||
      pending.deliveryMode === "brevo-direct"
    )
      return;

    let cancelled = false;
    let timeoutId: number | null = null;

    const syncStatus = async () => {
      try {
        const result = await getRegisterVerificationStatus(
          pending.challengeId,
          pending.email,
          pending.phone,
        );
        if (cancelled) return;

        const status = String(result.status || "").trim();
        if (
          typeof result.expiresInSec === "number" &&
          Number.isFinite(result.expiresInSec) &&
          result.expiresInSec > 0
        ) {
          setPending((current) =>
            current
              ? {
                  ...current,
                  expiresAtMs: Date.now() + Number(result.expiresInSec) * 1000,
                }
              : current,
          );
        }

        if (status === "registered" && result.user && typeof result.user === "object") {
          const sessionPayload = await resolveRegisteredUserSession(result, {
            email: pending.email,
            password: pending.password,
          });

          if (sessionPayload) {
            const { user, profileToken } = sessionPayload;
            persistMockSession({
              authMode: "live",
              variant: "user",
              email:
                typeof user.email === "string" && user.email.trim()
                  ? user.email
                  : pending.email,
              displayName:
                typeof user.name === "string" && user.name.trim()
                  ? user.name
                  : pending.fullName,
              userId: user.id,
              userProfileToken: profileToken,
              redirectTo: "/dashboard",
              signedInAt: new Date().toISOString(),
            });
            syncMockUserProfileFromLiveUser(user);
            setPending(null);
            toast.success("Akun Anda sudah aktif.");
            router.replace("/dashboard");
            return;
          }
        }

        if (status === "verified" && typeof result.verificationToken === "string") {
          setPending((current) =>
            current
              ? {
                  ...current,
                  verificationToken: result.verificationToken,
                  expiresAtMs: null,
                }
              : current,
          );
          return;
        }

        timeoutId = window.setTimeout(syncStatus, 1500);
      } catch {
        if (!cancelled) {
          timeoutId = window.setTimeout(syncStatus, 2200);
        }
      }
    };

    void syncStatus();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [pending, resolveRegisteredUserSession, router, setPending]);

  async function handleSendVerification(values: RegisterValues, resend = false) {
    if (resend) {
      setIsResending(true);
    } else {
      setIsSubmitting(true);
    }

    try {
      const result = await sendRegisterVerification({
        name: values.fullName,
        phone: values.phone,
        email: values.email,
        password: values.password,
      });

      setPending({
        challengeId: String(result.challengeId || ""),
        fullName: values.fullName,
        phone: values.phone,
        email: values.email,
        password: values.password,
        challengeToken: String(result.challengeToken || ""),
        expiresAtMs:
          typeof result.expiresInSec === "number" &&
          Number.isFinite(result.expiresInSec) &&
          result.expiresInSec > 0
            ? Date.now() + Number(result.expiresInSec) * 1000
            : null,
        deliveryMode: String(result.provider || ""),
      });
      toast.success(resend ? "Email konfirmasi dikirim ulang." : "Email konfirmasi sudah dikirim.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal mengirim email konfirmasi.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      setIsResending(false);
    }
  }

  async function handleVerifyOtp() {
    if (!pending?.challengeId) {
      toast.error("Sesi verifikasi belum siap.");
      return;
    }

    const normalizedOtp = otpCode.replace(/\D/g, "").slice(0, 6);
    if (!/^\d{6}$/.test(normalizedOtp)) {
      toast.error("Masukkan kode OTP email 6 digit.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const result = await verifyRegisterVerification(
        pending.challengeId,
        normalizedOtp,
        pending.challengeToken,
      );
      const sessionPayload = await resolveRegisteredUserSession(result, {
        email: pending.email,
        password: pending.password,
      });

      if (sessionPayload) {
        const { user, profileToken } = sessionPayload;
        persistMockSession({
          authMode: "live",
          variant: "user",
          email:
            typeof user.email === "string" && user.email.trim()
              ? user.email
              : pending.email,
          displayName:
            typeof user.name === "string" && user.name.trim()
              ? user.name
              : pending.fullName,
          userId: user.id,
          userProfileToken: profileToken,
          redirectTo: "/dashboard",
          signedInAt: new Date().toISOString(),
        });
        syncMockUserProfileFromLiveUser(user);
        setPending(null);
        toast.success("Email berhasil diverifikasi.");
        router.replace("/dashboard");
        return;
      }

      if (typeof result.verificationToken === "string" && result.verificationToken.trim()) {
        setPending((current) =>
          current
            ? {
                ...current,
                verificationToken: result.verificationToken,
                expiresAtMs: null,
              }
            : current,
        );
        toast.success("Email berhasil diverifikasi.");
        return;
      }

      toast.success("Kode OTP berhasil diverifikasi.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memverifikasi kode OTP.";
      toast.error(message);
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    if (pending?.verificationToken) {
      await finalizeRegister({
        ...pending,
        fullName: values.fullName.trim() || pending.fullName,
        phone: values.phone.trim() || pending.phone,
        email: values.email.trim() || pending.email,
        password: values.password.trim() || pending.password,
      });
      return;
    }

    await handleSendVerification(values);
  });

  const showWaitingState = Boolean(pending?.challengeId && !pending?.verificationToken);
  const phoneField = form.register("phone");

  return (
    <AuthShell title={registerContent.title} description={registerContent.description}>
      <AppCard padding="lg" className="space-y-8">
        {showWaitingState && pending ? (
          <div className="space-y-6">
            <AppNotice
              icon={ShieldCheck}
              title="Konfirmasi email pendaftaran"
              description="Buka email Anda lalu klik tautan konfirmasi untuk mengaktifkan akun."
            />

            <div className="rounded-[var(--radius-2xl)] border border-border bg-surface-container-low px-5 py-5">
              <p className="text-sm leading-6 text-muted-foreground">
                Tautan konfirmasi dikirim ke{" "}
                <span className="font-semibold text-foreground">{pending.email}</span>.
              </p>
              {countdownLabel ? (
                <p className="mt-2 text-sm font-medium text-role-accent">
                  {countdownLabel === "Tautan sudah kedaluwarsa"
                    ? countdownLabel
                    : `Tautan aktif ${countdownLabel} lagi`}
                </p>
              ) : null}
            </div>

            <div className="rounded-[var(--radius-2xl)] border border-border bg-surface-container-lowest px-5 py-5">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Pakai kode OTP email</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Jika tautan email tidak terbuka, masukkan kode 6 digit yang Anda terima.
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <AppInput
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Masukkan 6 digit OTP"
                  value={otpCode}
                  onChange={(event) =>
                    setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                />
                <AppButton
                  type="button"
                  variant="outline"
                  loading={isVerifyingOtp}
                  loadingLabel="Memverifikasi..."
                  onClick={() => void handleVerifyOtp()}
                >
                  Verifikasi Kode
                </AppButton>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <AppButton
                type="button"
                variant="outline"
                onClick={() =>
                  void handleSendVerification(
                    {
                      fullName: pending.fullName,
                      phone: pending.phone,
                      email: pending.email,
                      password: pending.password,
                      confirmPassword: pending.password,
                      terms: true,
                    },
                    true,
                  )
                }
                disabled={isResending}
              >
                <RotateCcw className="size-4" />
                {isResending ? "Mengirim ulang..." : "Kirim ulang email"}
              </AppButton>
              <AppButton type="button" variant="ghost" onClick={() => setPending(null)}>
                Ubah data
              </AppButton>
            </div>
          </div>
        ) : (
          <form className="space-y-5" method="post" onSubmit={handleSubmit}>
            <AppFormField label="Nama Lengkap" error={form.formState.errors.fullName?.message}>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <AppInput className="pl-11" placeholder="Masukkan nama lengkap Anda" {...form.register("fullName")} />
              </div>
            </AppFormField>

            <AppFormField label="Nomor WhatsApp" error={form.formState.errors.phone?.message}>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <AppInput
                  className="pl-11"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Contoh: +6281234567890"
                  {...phoneField}
                  value={phoneValue ?? ""}
                  onFocus={(event) => {
                    if (!event.currentTarget.value.trim()) {
                      form.setValue("phone", INDONESIA_PHONE_PREFIX, {
                        shouldDirty: false,
                        shouldTouch: false,
                      });
                    }
                  }}
                  onChange={(event) => {
                    form.setValue(
                      "phone",
                      normalizeRegisterPhoneInput(event.target.value),
                      {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: form.formState.isSubmitted,
                      },
                    );
                  }}
                  onBlur={(event) => {
                    phoneField.onBlur(event);
                    const normalizedPhone = normalizeRegisterPhoneInput(event.target.value);
                    form.setValue(
                      "phone",
                      normalizedPhone === INDONESIA_PHONE_PREFIX ? "" : normalizedPhone,
                      {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      },
                    );
                  }}
                />
              </div>
            </AppFormField>

            <AppFormField label="Email" error={form.formState.errors.email?.message}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <AppInput className="pl-11" placeholder="nama@email.com" type="email" {...form.register("email")} />
              </div>
            </AppFormField>

            <div className="grid gap-5 md:grid-cols-2">
              <AppFormField label="Password" error={form.formState.errors.password?.message}>
                <AppPasswordInput
                  placeholder={PASSWORD_POLICY_HINT}
                  {...form.register("password")}
                />
              </AppFormField>
              <AppFormField
                label="Konfirmasi Password"
                error={form.formState.errors.confirmPassword?.message}
              >
                <AppPasswordInput
                  placeholder={PASSWORD_POLICY_HINT}
                  {...form.register("confirmPassword")}
                />
              </AppFormField>
            </div>

            <AppNotice
              icon={ShieldCheck}
              title="Aturan password akun"
              description={PASSWORD_POLICY_HINT}
            />

            <div className="flex items-start gap-3 rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-3">
              <AppCheckbox
                id="terms"
                checked={termsAccepted}
                readOnly
                onClick={(event) => event.preventDefault()}
              />
              <div className="space-y-2 text-sm leading-6 text-muted-foreground">
                <p>
                  Saya menyetujui{" "}
                  <button
                    type="button"
                    className="cursor-pointer font-semibold text-role-accent"
                    onClick={() => setTermsDialogOpen(true)}
                  >
                    Syarat & Ketentuan
                  </button>{" "}
                  serta{" "}
                  <button
                    type="button"
                    className="cursor-pointer font-semibold text-role-accent"
                    onClick={() => setTermsDialogOpen(true)}
                  >
                    Kebijakan Privasi
                  </button>
                  .
                </p>
                <p className="text-xs text-muted-foreground">
                  Centang akan aktif setelah isi dokumen dibuka dan dibaca sampai bagian akhir.
                </p>
              </div>
            </div>
            {form.formState.errors.terms?.message ? (
              <p className="text-xs font-medium text-destructive">{form.formState.errors.terms.message}</p>
            ) : null}

            <AppButton
              fullWidth
              size="lg"
              type="submit"
              loading={isSubmitting}
              loadingLabel="Mengirim..."
            >
              Daftar Sekarang
              <ArrowRight className="size-4" />
            </AppButton>
          </form>
        )}

        <div className="border-t border-border pt-6 text-center text-sm text-muted-foreground">
          {registerContent.footerPrompt}{" "}
          <Link href={registerContent.footerHref} className="font-semibold text-role-accent">
            {registerContent.footerLabel}
          </Link>
          <div className="mt-2">
            Petugas layanan?{" "}
            <Link href="/login/petugas" className="font-semibold text-role-accent">
              Login Petugas
            </Link>
          </div>
        </div>
      </AppCard>

      <AppDialog
        open={termsDialogOpen}
        onOpenChange={(open) => {
          setTermsDialogOpen(open);
          if (!open && !termsAccepted) {
            setTermsReachedBottom(false);
          }
        }}
        title="Syarat dan ketentuan pendaftaran tamu"
        description="Baca sampai akhir sebelum menyetujui pemrosesan data pribadi untuk layanan LKPP."
      >
        <div className="space-y-5">
          <div
            className="max-h-[50dvh] space-y-4 overflow-y-auto rounded-[var(--radius-2xl)] border border-border bg-surface-container-low px-4 py-4"
            onScroll={(event) => {
              const element = event.currentTarget;
              const reachedBottom =
                element.scrollTop + element.clientHeight >= element.scrollHeight - 12;
              if (reachedBottom) {
                setTermsReachedBottom(true);
              }
            }}
          >
            {REGISTER_TERMS_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-2">
                <p className="text-sm font-semibold text-foreground">{section.title}</p>
                <div className="space-y-2">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-6 text-muted-foreground">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {!termsReachedBottom && !termsAccepted ? (
            <AppNotice
              icon={ShieldCheck}
              title="Baca sampai bagian akhir"
              description="Tombol persetujuan akan aktif setelah dokumen dibaca sampai bawah."
            />
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <AppButton variant="outline" onClick={() => setTermsDialogOpen(false)}>
              Tutup
            </AppButton>
            <AppButton
              disabled={!termsReachedBottom && !termsAccepted}
              onClick={() => {
                form.setValue("terms", true, { shouldDirty: true, shouldValidate: true });
                setTermsDialogOpen(false);
              }}
            >
              Saya sudah membaca dan setuju
            </AppButton>
          </div>
        </div>
      </AppDialog>
    </AuthShell>
  );
}
