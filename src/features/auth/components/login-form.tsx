"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { AuthShell } from "@/components/shell/auth-shell";
import { type LoginVariant, loginContent } from "@/content/auth-content";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppFormField } from "@/components/ui/app-form-field";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";
import { AppPasswordInput } from "@/components/ui/app-password-input";
import { AppTurnstile } from "@/components/ui/app-turnstile";
import { confirmStaffPasswordReset, loginStaff, loginUser } from "@/lib/api/auth";
import type { InternalRole } from "@/features/internal/internal-workspace-config";
import { getPublicBackendConfig } from "@/lib/api/backend-config";
import {
  clearMockSession,
  getStaffRedirectPath,
  persistMockSession,
} from "@/lib/mock-auth";
import { syncMockUserProfileFromLiveUser } from "@/lib/mock-user-profile";
import {
  getInternalRoleLabel,
  mapLegacyStaffRoleToInternalRole,
} from "@/lib/internal-role-policy";
import { PASSWORD_POLICY_HINT, createPasswordSchema } from "@/lib/password-policy";

const LEGACY_LOGIN_PIN_REGEX = /^\d{4}$/;

function createLoginPasswordSchema(label = "Password") {
  return z.string().superRefine((value, context) => {
    const normalized = String(value ?? "").trim();

    if (!normalized) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} wajib diisi.`,
      });
      return;
    }

    if (normalized.length >= 8 || LEGACY_LOGIN_PIN_REGEX.test(normalized)) {
      return;
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} minimal 8 karakter atau PIN lama 4 digit.`,
    });
  });
}

const userLoginSchema = z.object({
  email: z.string().email("Gunakan alamat email yang valid."),
  password: createLoginPasswordSchema(),
});

const staffLoginSchema = z.object({
  login: z.string().min(3, "Masukkan email login atau nama login petugas."),
  password: createLoginPasswordSchema(),
});

type LoginValues = {
  email: string;
  login: string;
  password: string;
};

const staffResetSchema = z
  .object({
    newPassword: createPasswordSchema("Password baru"),
    confirmNewPassword: z.string().min(1, "Konfirmasi password baru wajib diisi."),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmNewPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Konfirmasi password baru harus sama.",
        path: ["confirmNewPassword"],
      });
    }
  });

type StaffResetValues = z.infer<typeof staffResetSchema>;

type StaffResetState = {
  resetToken: string;
  loginName: string;
  staffName: string;
};

function resolveAllowedUserNextPath(value: string) {
  const nextPath = value.trim();
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return null;
  }
  const normalizedPath = nextPath.replace(/[?#].*$/, "");

  if (
    normalizedPath === "/dashboard" ||
    normalizedPath === "/jadwal-saya" ||
    normalizedPath === "/layanan" ||
    normalizedPath === "/profil" ||
    normalizedPath === "/pengaturan" ||
    normalizedPath === "/bantuan" ||
    /^\/layanan\/[a-z0-9-]+$/i.test(normalizedPath) ||
    /^\/jadwal-saya\/[^/?#]+$/i.test(normalizedPath)
  ) {
    return nextPath;
  }

  return null;
}

export function LoginForm({
  variant = "user",
  selectedRole,
}: {
  variant?: LoginVariant;
  selectedRole?: InternalRole;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isStaffLogin = variant === "staff";
  const queueReference = searchParams.get("reference")?.trim() ?? "";
  const prefilledEmail = searchParams.get("email")?.trim() ?? "";
  const loginSource = searchParams.get("from")?.trim() ?? "";
  const requestedNextPath = searchParams.get("next")?.trim() ?? "";
  const logoutRequested = searchParams.get("logout") === "1";
  const [turnstileSiteKey, setTurnstileSiteKey] = React.useState(
    () => getPublicBackendConfig().turnstileSiteKey,
  );
  const [turnstileToken, setTurnstileToken] = React.useState("");
  const [turnstileResetKey, setTurnstileResetKey] = React.useState(0);
  const [turnstileErrorMessage, setTurnstileErrorMessage] = React.useState("");
  const [staffResetState, setStaffResetState] = React.useState<StaffResetState | null>(
    null,
  );
  React.useEffect(() => {
    toast.dismiss();
  }, []);
  React.useEffect(() => {
    if (!logoutRequested) {
      return;
    }

    clearMockSession();
    router.replace(pathname);
  }, [logoutRequested, pathname, router]);
  const form = useForm<LoginValues>({
    resolver: zodResolver(isStaffLogin ? staffLoginSchema : userLoginSchema) as never,
    defaultValues: {
      email: "",
      login: "",
      password: "",
    },
  });
  const staffResetForm = useForm<StaffResetValues>({
    resolver: zodResolver(staffResetSchema),
    defaultValues: {
      newPassword: "",
      confirmNewPassword: "",
    },
  });
  const content = loginContent[variant];
  const hasFooterAction = Boolean(content.footerLabel && content.footerHref);
  const hasSwitchAction = Boolean(content.switchLabel && content.switchHref);
  const isStaffResetStep = isStaffLogin && Boolean(staffResetState);
  const isSubmitting = isStaffResetStep
    ? staffResetForm.formState.isSubmitting
    : form.formState.isSubmitting;
  const isTurnstileConfigured = Boolean(turnstileSiteKey);
  const isTurnstileVerified = Boolean(turnstileToken);

  const resetTurnstile = React.useCallback(() => {
    setTurnstileToken("");
    setTurnstileErrorMessage("");
    setTurnstileResetKey((current) => current + 1);
  }, []);

  const handleTurnstileTokenChange = React.useCallback((token: string) => {
    setTurnstileToken(String(token || "").trim());
    setTurnstileErrorMessage("");
  }, []);

  const handleTurnstileError = React.useCallback((message: string) => {
    setTurnstileToken("");
    setTurnstileErrorMessage(message);
  }, []);

  function navigateAfterAuth(path: string) {
    router.replace(path);
    router.refresh();
    window.setTimeout(() => {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (currentPath !== path) {
        window.location.replace(path);
      }
    }, 400);
  }

  React.useEffect(() => {
    if (isStaffLogin || !prefilledEmail) return;
    form.setValue("email", prefilledEmail, { shouldDirty: false });
  }, [form, isStaffLogin, prefilledEmail]);

  React.useEffect(() => {
    if (turnstileSiteKey) {
      return;
    }

    let cancelled = false;
    const loadRuntimeConfig = async () => {
      try {
        const response = await fetch("/api/runtime-config", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          turnstileSiteKey?: string;
        };

        if (!cancelled) {
          setTurnstileSiteKey(String(payload.turnstileSiteKey || "").trim());
        }
      } catch {
        if (!cancelled) {
          setTurnstileSiteKey("");
        }
      }
    };

    void loadRuntimeConfig();
    return () => {
      cancelled = true;
    };
  }, [turnstileSiteKey]);

  function buildUserRedirectPath() {
    const allowedNextPath = resolveAllowedUserNextPath(requestedNextPath) ?? "/dashboard";
    if (!queueReference || allowedNextPath !== "/jadwal-saya") {
      return allowedNextPath;
    }

    const params = new URLSearchParams({ reference: queueReference });
    return `${allowedNextPath}?${params.toString()}`;
  }

  function completeStaffSignIn(
    staff: Record<string, unknown>,
    fallbackLoginName: string,
    successTitle = "Berhasil masuk",
  ) {
    const liveRole = mapLegacyStaffRoleToInternalRole(staff.role as string | undefined, {
      unitId: staff.unorId as string | undefined,
      fallbackRole: selectedRole,
    });
    if (!liveRole) {
      throw new Error("Peran petugas dari server belum dikenali.");
    }

    const redirectTo = getStaffRedirectPath(liveRole);
    const roleLabel = getInternalRoleLabel(liveRole);
    const assignedCounters = Array.isArray(staff.assignedCounters)
      ? staff.assignedCounters
          .map((entry) => {
            if (!entry || typeof entry !== "object") {
              return null;
            }

            const counter = entry as Record<string, unknown>;
            const counterNumber =
              typeof counter.counterNumber === "number" && Number.isFinite(counter.counterNumber)
                ? Math.trunc(counter.counterNumber)
                : 0;
            const id = String(counter.id || "").trim().toUpperCase();
            const unitId = String(counter.unitId || "").trim().toUpperCase();

            if (!id || !unitId || counterNumber < 1) {
              return null;
            }

            return {
              id,
              unitId,
              counterNumber,
              label: String(counter.label || "").trim() || `Loket ${counterNumber}`,
              active: counter.active !== false,
            };
          })
          .filter(
            (
              entry,
            ): entry is {
              id: string;
              unitId: string;
              counterNumber: number;
              label: string;
              active: boolean;
            } => entry !== null,
          )
      : [];

    persistMockSession({
      authMode: "live",
      variant,
      email:
        typeof staff.loginName === "string" && staff.loginName.trim()
          ? staff.loginName
          : fallbackLoginName,
      displayName:
        typeof staff.name === "string" && staff.name.trim()
          ? staff.name
          : undefined,
      staffId: String(staff.id || ""),
      unitId:
        typeof staff.unorId === "string" && staff.unorId.trim()
          ? staff.unorId.trim().toUpperCase()
          : typeof staff.unitId === "string" && staff.unitId.trim()
            ? staff.unitId.trim().toUpperCase()
            : undefined,
      assignedCounters: assignedCounters.length > 0 ? assignedCounters : undefined,
      activeCounterId:
        typeof staff.activeCounterId === "string" && staff.activeCounterId.trim()
          ? staff.activeCounterId.trim().toUpperCase()
          : undefined,
      activeCounterNumber:
        typeof staff.activeCounterNumber === "number" &&
        Number.isFinite(staff.activeCounterNumber)
          ? Math.trunc(staff.activeCounterNumber)
          : undefined,
      activeCounterLabel:
        typeof staff.activeCounterLabel === "string" && staff.activeCounterLabel.trim()
          ? staff.activeCounterLabel.trim()
          : undefined,
      role: liveRole,
      redirectTo,
      signedInAt: new Date().toISOString(),
    });

    toast.success(successTitle, {
      description: `Anda diarahkan ke dashboard ${roleLabel.toLowerCase()}.`,
    });
    navigateAfterAuth(redirectTo);
  }

  async function handleStaffResetSubmit(values: StaffResetValues) {
    if (!staffResetState) {
      toast.error("Sesi reset akses petugas belum siap. Ulangi login petugas.");
      return;
    }

    try {
      const result = await confirmStaffPasswordReset({
        resetToken: staffResetState.resetToken,
        newPassword: values.newPassword,
      });
      const staff =
        result.staff && typeof result.staff === "object"
          ? (result.staff as Record<string, unknown>)
          : null;

      if (!staff || typeof staff.id !== "string") {
        throw new Error("Data akun petugas dari server belum lengkap.");
      }

      setStaffResetState(null);
      staffResetForm.reset();
      completeStaffSignIn(
        staff,
        staffResetState.loginName,
        "Password petugas berhasil diperbarui",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal menyimpan password baru petugas.";
      toast.error(message);
    }
  }

  async function handleSubmit(values: LoginValues) {
    if (isTurnstileConfigured && !isTurnstileVerified) {
      toast.error("Selesaikan captcha terlebih dahulu sebelum masuk.");
      return;
    }

    if (!isStaffLogin) {
      try {
        const result = await loginUser(values.email, values.password, turnstileToken);
        const user =
          result.user && typeof result.user === "object"
            ? (result.user as Record<string, unknown>)
            : null;

        if (!user || typeof user.id !== "string") {
          throw new Error("Data akun dari server belum lengkap.");
        }

        persistMockSession({
          authMode: "live",
          variant,
          email:
            typeof user.email === "string" && user.email.trim()
              ? user.email
              : values.email,
          displayName:
            typeof user.name === "string" && user.name.trim()
              ? user.name
              : undefined,
          userId: user.id,
          userProfileToken:
            typeof result.profileToken === "string" && result.profileToken.trim()
              ? result.profileToken
              : undefined,
          redirectTo: buildUserRedirectPath(),
          signedInAt: new Date().toISOString(),
        });
        syncMockUserProfileFromLiveUser(user);

        toast.success("Berhasil masuk", {
          description:
            requestedNextPath === "/jadwal-saya"
              ? "Anda diarahkan ke halaman jadwal untuk mengecek antrean."
              : "Anda diarahkan ke dashboard pengguna.",
        });
        navigateAfterAuth(buildUserRedirectPath());
        return;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Gagal masuk. Coba lagi.";
        resetTurnstile();
        toast.error(message);
        return;
      }
    }

    try {
      const result = await loginStaff(values.login, values.password, turnstileToken);
      const staff =
        result.staff && typeof result.staff === "object"
          ? (result.staff as Record<string, unknown>)
          : null;

      if (!staff || typeof staff.id !== "string") {
        throw new Error("Data akun petugas dari server belum lengkap.");
      }

      if (result.requiresPasswordReset) {
        const resetToken = String(result.resetToken || "").trim();
        if (!resetToken) {
          throw new Error("Sesi reset akses petugas belum tersedia.");
        }

        setStaffResetState({
          resetToken,
          loginName:
            typeof staff.loginName === "string" && staff.loginName.trim()
              ? staff.loginName.trim()
              : values.login.trim(),
          staffName:
            typeof staff.name === "string" && staff.name.trim()
              ? staff.name.trim()
              : values.login.trim(),
        });
        staffResetForm.reset();
        form.setValue("password", "", { shouldDirty: false });
        toast.info("Admin meminta akun ini membuat password baru sebelum masuk.");
        return;
      }
      completeStaffSignIn(staff, values.login);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal masuk sebagai petugas.";
      resetTurnstile();
      toast.error(message);
    }
  }

  return (
    <AuthShell
      title={content.title}
      description={content.description}
      contentClassName={isStaffLogin ? "max-w-lg" : undefined}
    >
      <AppCard
        id={isStaffLogin ? "form-login-petugas" : undefined}
        tone="glass"
        padding="lg"
        className="space-y-8"
      >
        {isStaffResetStep && staffResetState ? (
          <form
            className="space-y-6"
            method="post"
            onSubmit={staffResetForm.handleSubmit(handleStaffResetSubmit)}
          >
            <AppNotice
              icon={ShieldAlert}
              tone="warning"
              title="Buat password baru petugas"
              description="Admin menandai akun ini untuk reset akses. Password lama sudah tervalidasi, sekarang buat password baru untuk melanjutkan masuk."
            />

            <AppFormField label="Email Login">
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <AppInput
                  value={staffResetState.loginName}
                  type="text"
                  className="pl-11"
                  readOnly
                  aria-readonly="true"
                />
              </div>
            </AppFormField>

            <AppFormField label="Nama Petugas">
              <AppInput value={staffResetState.staffName} type="text" readOnly aria-readonly="true" />
            </AppFormField>

            <AppFormField
              label="Password Baru"
              description={PASSWORD_POLICY_HINT}
              error={staffResetForm.formState.errors.newPassword?.message}
            >
              <AppPasswordInput
                placeholder="Masukkan password baru"
                autoComplete="new-password"
                aria-invalid={Boolean(staffResetForm.formState.errors.newPassword)}
                {...staffResetForm.register("newPassword")}
              />
            </AppFormField>

            <AppFormField
              label="Konfirmasi Password Baru"
              error={staffResetForm.formState.errors.confirmNewPassword?.message}
            >
              <AppPasswordInput
                placeholder="Ulangi password baru"
                autoComplete="new-password"
                aria-invalid={Boolean(
                  staffResetForm.formState.errors.confirmNewPassword,
                )}
                {...staffResetForm.register("confirmNewPassword")}
              />
            </AppFormField>

            <div className="space-y-3">
              <AppButton
                fullWidth
                size="lg"
                type="submit"
                loading={isSubmitting}
                loadingLabel="Menyimpan..."
              >
                Simpan Password Baru
                <ArrowRight className="size-4" />
              </AppButton>
              <AppButton
                fullWidth
                variant="outline"
                type="button"
                onClick={() => {
                  setStaffResetState(null);
                  staffResetForm.reset();
                }}
              >
                Kembali ke Login
              </AppButton>
            </div>
          </form>
        ) : (
          <form
            className="space-y-6"
            method="post"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            {!isStaffLogin && loginSource === "landing-queue-check" ? (
              <AppNotice
                icon={ShieldCheck}
                title="Lanjutkan cek antrean"
                description={
                  queueReference
                    ? `Masuk dulu untuk membuka status detail antrean ${queueReference}.`
                    : "Masuk dulu untuk membuka halaman jadwal dan status antrean Anda."
                }
              />
            ) : null}

            <AppFormField
              label={isStaffLogin ? "Email Login" : "Email"}
              error={
                isStaffLogin
                  ? form.formState.errors.login?.message
                  : form.formState.errors.email?.message
              }
            >
              <div className="relative">
                {isStaffLogin ? (
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                ) : (
                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                )}
                {isStaffLogin ? (
                  <AppInput
                    placeholder="contoh: resepsionis@lkpp.go.id"
                    type="text"
                    autoComplete="username"
                    className="pl-11"
                    autoCapitalize="none"
                    autoCorrect="off"
                    aria-invalid={Boolean(form.formState.errors.login)}
                    {...form.register("login")}
                  />
                ) : (
                  <AppInput
                    placeholder="nama@email.com"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    inputMode="email"
                    spellCheck={false}
                    className="pl-11"
                    aria-invalid={Boolean(form.formState.errors.email)}
                    {...form.register("email")}
                  />
                )}
              </div>
            </AppFormField>

            <AppFormField label="Password" error={form.formState.errors.password?.message}>
              <AppPasswordInput
                placeholder="Masukkan password Anda"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={Boolean(form.formState.errors.password)}
                {...form.register("password")}
              />
            </AppFormField>

            {!isStaffLogin ? (
              <div className="-mt-2 flex justify-end">
                <Link href="/reset" className="text-sm font-medium text-role-accent">
                  Lupa Password?
                </Link>
              </div>
            ) : null}

            {content.noticeTitle || content.noticeDescription ? (
              <AppNotice
                icon={ShieldCheck}
                title={content.noticeTitle}
                description={content.noticeDescription}
              />
            ) : null}

            {isTurnstileConfigured ? (
              <AppTurnstile
                siteKey={turnstileSiteKey}
                action={isStaffLogin ? "staff_login" : "user_login"}
                resetKey={turnstileResetKey}
                onTokenChange={handleTurnstileTokenChange}
                onError={handleTurnstileError}
              />
            ) : null}

            {turnstileErrorMessage ? (
              <p className="-mt-2 text-sm text-red-600">{turnstileErrorMessage}</p>
            ) : null}

            <AppButton
              fullWidth
              size="lg"
              type="submit"
              disabled={isTurnstileConfigured && !isTurnstileVerified}
              loading={isSubmitting}
              loadingLabel="Memproses..."
            >
              {content.submitLabel}
              <ArrowRight className="size-4" />
            </AppButton>
          </form>
        )}

        {!isStaffResetStep && (hasFooterAction || hasSwitchAction) ? (
          <div className="space-y-4 border-t border-border pt-6 text-center">
            {hasFooterAction ? (
              <>
                <p className="text-sm text-muted-foreground">{content.footerPrompt}</p>
                <Link href={content.footerHref}>
                  <AppButton fullWidth variant="outline" size="lg">
                    {content.footerLabel}
                  </AppButton>
                </Link>
              </>
            ) : null}
            {hasSwitchAction ? (
              <p className="text-sm text-muted-foreground">
                {content.switchPrompt}{" "}
                <Link href={content.switchHref} className="font-semibold text-role-accent">
                  {content.switchLabel}
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}
      </AppCard>
    </AuthShell>
  );
}
