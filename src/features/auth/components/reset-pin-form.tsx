"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AuthShell } from "@/components/shell/auth-shell";
import { resetPinContent } from "@/content/auth-content";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppFormField } from "@/components/ui/app-form-field";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";
import { AppPasswordInput } from "@/components/ui/app-password-input";
import {
  confirmUserPasswordReset,
  getUserPasswordResetStatus,
  requestUserPasswordReset,
} from "@/lib/api/auth";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  PASSWORD_POLICY_HINT,
  createPasswordSchema,
} from "@/lib/password-policy";

const RESET_PENDING_KEY = "lkpp-reset-pin-pending";

const resetPinSchema = z.object({
  email: z.string().email("Gunakan alamat email yang valid."),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

const confirmResetSchema = z
  .object({
    password: createPasswordSchema("Password"),
    confirmPassword: createPasswordSchema("Konfirmasi password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak sama.",
  });

type ResetPinValues = z.infer<typeof resetPinSchema>;

type PendingResetState = {
  challengeId: string;
  email: string;
  challengeToken?: string;
  verificationToken?: string;
  expiresAtMs?: number | null;
  deliveryMode?: string;
};

function buildCountdownLabel(expiresAtMs?: number | null) {
  if (!expiresAtMs) return null;
  const diffMs = Math.max(expiresAtMs - Date.now(), 0);
  const totalSec = Math.floor(diffMs / 1000);
  if (totalSec <= 0) return "Tautan sudah kedaluwarsa";
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ResetPinForm({
  challengeId,
  verificationToken,
  emailFromCallback,
}: {
  challengeId?: string;
  verificationToken?: string;
  emailFromCallback?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useLocalStorage<PendingResetState | null>(
    RESET_PENDING_KEY,
    null,
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [useOtpFallback, setUseOtpFallback] = React.useState(false);
  const [countdownLabel, setCountdownLabel] = React.useState<string | null>(null);
  const form = useForm<ResetPinValues>({
    resolver: zodResolver(resetPinSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const validatePasswordFields = React.useCallback(
    (values: Pick<ResetPinValues, "password" | "confirmPassword">) => {
      form.clearErrors(["password", "confirmPassword"]);
      const result = confirmResetSchema.safeParse({
        password: values.password ?? "",
        confirmPassword: values.confirmPassword ?? "",
      });

      if (result.success) {
        return true;
      }

      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (path === "password" || path === "confirmPassword") {
          form.setError(path, {
            type: "manual",
            message: issue.message,
          });
        }
      }

      return false;
    },
    [form],
  );

  React.useEffect(() => {
    if (!pending?.email) return;
    form.setValue("email", pending.email, { shouldDirty: false });
  }, [form, pending?.email]);

  React.useEffect(() => {
    if (!pending?.challengeId) {
      setOtpCode("");
      setUseOtpFallback(false);
    }
  }, [pending?.challengeId]);

  React.useEffect(() => {
    if (!challengeId) return;
    setPending((current) => ({
      challengeId,
      email: emailFromCallback?.trim() || current?.email || "",
      verificationToken: verificationToken?.trim() || current?.verificationToken,
      expiresAtMs: current?.expiresAtMs ?? null,
    }));
  }, [challengeId, emailFromCallback, setPending, verificationToken]);

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
        const result = await getUserPasswordResetStatus(
          pending.challengeId,
          pending.email,
        );
        if (cancelled) return;

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

        if (
          String(result.status || "").trim() === "verified" &&
          typeof result.verificationToken === "string"
        ) {
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
  }, [pending, setPending]);

  async function handleRequestReset(email: string, resend = false) {
    if (resend) {
      setIsResending(true);
    } else {
      setIsSubmitting(true);
    }

    try {
      const result = await requestUserPasswordReset(email);
      setPending({
        challengeId: String(result.challengeId || ""),
        email,
        challengeToken: String(result.challengeToken || ""),
        expiresAtMs:
          typeof result.expiresInSec === "number" &&
          Number.isFinite(result.expiresInSec) &&
          result.expiresInSec > 0
            ? Date.now() + Number(result.expiresInSec) * 1000
            : null,
        deliveryMode: String(result.provider || ""),
      });
      toast.success(resend ? "Email reset dikirim ulang." : "Email reset password sudah dikirim.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal mengirim email reset password.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      setIsResending(false);
    }
  }

  async function handleConfirmWithOtp() {
    if (!pending?.challengeId) {
      toast.error("Sesi reset password belum siap.");
      return;
    }

    const valid = validatePasswordFields({
      password: form.getValues("password"),
      confirmPassword: form.getValues("confirmPassword"),
    });
    if (!valid) {
      return;
    }

    const normalizedOtp = otpCode.replace(/\D/g, "").slice(0, 6);
    if (!/^\d{6}$/.test(normalizedOtp)) {
      toast.error("Masukkan kode OTP email 6 digit.");
      return;
    }

    const password = form.getValues("password") ?? "";
    setIsSubmitting(true);
    try {
      await confirmUserPasswordReset({
        challengeId: pending.challengeId,
        challengeToken: pending.challengeToken,
        emailOtp: normalizedOtp,
        newPassword: password,
      });
      setPending(null);
      setUseOtpFallback(false);
      toast.success("Password berhasil diperbarui.");
      router.replace("/login");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memverifikasi kode OTP.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(values: ResetPinValues) {
    if (pending?.verificationToken || pending?.challengeId) {
      if (!pending) {
        toast.error("Sesi reset password belum siap.");
        return;
      }

      const valid = validatePasswordFields({
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      if (!valid) {
        return;
      }

      setIsSubmitting(true);
      try {
        await confirmUserPasswordReset({
          verificationToken: pending.verificationToken,
          challengeId: pending.verificationToken ? undefined : pending.challengeId,
          challengeToken: pending.verificationToken ? undefined : pending.challengeToken,
          newPassword: values.password ?? "",
        });
        setPending(null);
        toast.success("Password berhasil diperbarui.");
        router.replace("/login");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Gagal menyimpan password baru.";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    await handleRequestReset(values.email);
  }

  const showConfirmForm = Boolean(pending?.challengeId && pending?.verificationToken);
  const showWaitingState = Boolean(pending?.challengeId && !pending?.verificationToken);

  return (
    <AuthShell title={resetPinContent.title} description={resetPinContent.description}>
      <AppCard padding="lg" className="space-y-8">
        {showWaitingState && pending ? (
          <div className="space-y-6">
            <AppNotice
              icon={ShieldCheck}
              title="Konfirmasi email reset password"
              description="Buka email Anda lalu klik tautan reset untuk membuat password baru."
            />

            <div className="rounded-[var(--radius-2xl)] border border-border bg-surface-container-low px-5 py-5">
              <p className="text-sm leading-6 text-muted-foreground">
                Tautan reset dikirim ke{" "}
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

            {useOtpFallback ? (
              <div className="space-y-4 rounded-[var(--radius-2xl)] border border-border bg-surface-container-lowest px-5 py-5">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Pakai kode OTP email</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Jika tautan email tidak terbuka, masukkan kode 6 digit lalu buat password baru di sini.
                  </p>
                </div>

                <AppFormField label="Kode OTP Email">
                  <AppInput
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Masukkan 6 digit OTP"
                    value={otpCode}
                    onChange={(event) =>
                      setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                  />
                </AppFormField>

                <AppFormField label="Password Baru" error={form.formState.errors.password?.message}>
                  <AppPasswordInput
                    placeholder={PASSWORD_POLICY_HINT}
                    {...form.register("password")}
                  />
                </AppFormField>

                <AppFormField
                  label="Konfirmasi Password Baru"
                  error={form.formState.errors.confirmPassword?.message}
                >
                  <AppPasswordInput
                    placeholder={PASSWORD_POLICY_HINT}
                    {...form.register("confirmPassword")}
                  />
                </AppFormField>

                <AppNotice
                  icon={ShieldCheck}
                  title="Aturan password baru"
                  description={PASSWORD_POLICY_HINT}
                />

                <div className="flex flex-wrap gap-3">
                  <AppButton
                    type="button"
                    loading={isSubmitting}
                    loadingLabel="Memverifikasi..."
                    onClick={() => void handleConfirmWithOtp()}
                  >
                    Verifikasi Kode & Simpan Password
                  </AppButton>
                  <AppButton type="button" variant="ghost" onClick={() => setUseOtpFallback(false)}>
                    Kembali ke tautan email
                  </AppButton>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <AppButton
                type="button"
                variant="outline"
                onClick={() => void handleRequestReset(pending.email, true)}
                disabled={isResending}
              >
                <RotateCcw className="size-4" />
                {isResending ? "Mengirim ulang..." : "Kirim ulang email"}
              </AppButton>
              <AppButton
                type="button"
                variant="outline"
                onClick={() => setUseOtpFallback(true)}
              >
                Pakai kode OTP
              </AppButton>
              <AppButton type="button" variant="ghost" onClick={() => setPending(null)}>
                Ganti email
              </AppButton>
            </div>
          </div>
        ) : (
          <form className="space-y-5" method="post" onSubmit={form.handleSubmit(handleSubmit)}>
            <AppFormField label="Email" error={form.formState.errors.email?.message}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <AppInput
                  className="pl-11"
                  placeholder="nama@email.com"
                  type="email"
                  {...form.register("email")}
                  disabled={showConfirmForm}
                />
              </div>
            </AppFormField>

            {showConfirmForm ? (
              <>
                <AppNotice
                  icon={ShieldCheck}
                  title="Email sudah dikonfirmasi"
                  description="Sekarang Anda bisa membuat password baru untuk akun ini."
                />

                <AppFormField label="Password Baru" error={form.formState.errors.password?.message}>
                  <AppPasswordInput
                    placeholder={PASSWORD_POLICY_HINT}
                    {...form.register("password")}
                  />
                </AppFormField>

                <AppFormField
                  label="Konfirmasi Password Baru"
                  error={form.formState.errors.confirmPassword?.message}
                >
                  <AppPasswordInput
                    placeholder={PASSWORD_POLICY_HINT}
                    {...form.register("confirmPassword")}
                  />
                </AppFormField>

                <AppNotice
                  icon={ShieldCheck}
                  title="Aturan password baru"
                  description={PASSWORD_POLICY_HINT}
                />
              </>
            ) : null}

            <AppButton
              fullWidth
              size="lg"
              type="submit"
              loading={isSubmitting}
              loadingLabel={showConfirmForm ? "Menyimpan..." : "Mengirim..."}
            >
              {showConfirmForm ? resetPinContent.submitLabel : "Kirim Tautan Reset"}
              <ArrowRight className="size-4" />
            </AppButton>
          </form>
        )}

        <div className="border-t border-border pt-6 text-center text-sm text-muted-foreground">
          {resetPinContent.footerPrompt}{" "}
          <Link href={resetPinContent.footerHref} className="font-semibold text-role-accent">
            {resetPinContent.footerLabel}
          </Link>
        </div>
      </AppCard>
    </AuthShell>
  );
}
