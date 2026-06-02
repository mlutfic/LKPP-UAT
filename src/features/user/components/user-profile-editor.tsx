"use client";

import * as React from "react";
import { Loader2, Mail, Save, UserRound } from "lucide-react";
import { toast } from "sonner";

import { AppActionBar } from "@/components/ui/app-action-bar";
import { AppButton } from "@/components/ui/app-button";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppFormField } from "@/components/ui/app-form-field";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";
import { AppPasswordInput } from "@/components/ui/app-password-input";
import {
  AppSearchSelect,
  type AppSearchSelectOption,
} from "@/components/ui/app-search-select";
import { AppSelect } from "@/components/ui/app-select";
import { requestUserEmailChange } from "@/lib/api/auth";
import {
  USER_ASAL_INSTANSI_OPTIONS,
  USER_REGION_OPTIONS,
  type MockUserProfile,
} from "@/lib/mock-user-profile";
import { readMockSession } from "@/lib/mock-auth";
import { maskEmail } from "@/lib/privacy";

export function UserProfileEditor({
  profile,
  completionStatus,
  onSave,
}: {
  profile: MockUserProfile | null;
  completionStatus: {
    isComplete: boolean;
    missingLabels: string[];
  };
  onSave: (nextProfile: MockUserProfile) => Promise<void> | void;
  }) {
  const nameId = React.useId();
  const phoneId = React.useId();
  const asalInstansiId = React.useId();
  const namaInstansiId = React.useId();
  const nikId = React.useId();
  const provinsiId = React.useId();
  const kabupatenKotaId = React.useId();
  const [draft, setDraft] = React.useState<MockUserProfile | null>(profile);
  const [saving, setSaving] = React.useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false);
  const [emailDraft, setEmailDraft] = React.useState(profile?.email ?? "");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [requestingEmailChange, setRequestingEmailChange] = React.useState(false);
  const [pendingEmailChangeMessage, setPendingEmailChangeMessage] = React.useState("");

  React.useEffect(() => {
    setDraft(profile);
    setEmailDraft(profile?.email ?? "");
  }, [profile]);

  const provinceOptions = React.useMemo<AppSearchSelectOption[]>(
    () =>
      Object.keys(USER_REGION_OPTIONS).map((option) => ({
        value: option,
        label: option,
      })),
    [],
  );
  const citySearchOptions = React.useMemo<AppSearchSelectOption[]>(
    () =>
      (draft?.provinsi ? USER_REGION_OPTIONS[draft.provinsi] ?? [] : []).map((option) => ({
        value: option,
        label: option,
        keywords: draft?.provinsi ? [draft.provinsi] : [],
      })),
    [draft?.provinsi],
  );

  function updateField<K extends keyof MockUserProfile>(field: K, value: MockUserProfile[K]) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  async function handleSave() {
    try {
      if (!draft) {
        return;
      }

      if (!draft.name.trim()) {
        toast.error("Nama lengkap perlu diisi.");
        return;
      }
      if (!draft.email.trim()) {
        toast.error("Email perlu diisi.");
        return;
      }
      if (!draft.phone.trim()) {
        toast.error("Nomor WhatsApp perlu diisi.");
        return;
      }
      if (!draft.asalInstansi.trim()) {
        toast.error("Kategori instansi perlu diisi.");
        return;
      }
      if (!draft.namaInstansi.trim()) {
        toast.error("Nama instansi perlu diisi.");
        return;
      }
      if (draft.nik.replace(/\D/g, "").length !== 16) {
        toast.error("NIK wajib 16 digit.");
        return;
      }
      if (!draft.provinsi.trim()) {
        toast.error("Provinsi perlu diisi.");
        return;
      }
      if (!draft.kabupatenKota.trim()) {
        toast.error("Kabupaten/kota perlu diisi.");
        return;
      }

      setSaving(true);
      await onSave({
        ...draft,
        nik: draft.nik.replace(/\D/g, "").slice(0, 16),
      });
      toast.success("Profil pengguna berhasil diperbarui.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Profil pengguna belum berhasil diperbarui.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestEmailChange() {
    if (!draft) {
      return;
    }

    const session = readMockSession();
    if (!session || session.variant !== "user" || session.authMode !== "live" || !session.userId) {
      toast.error("Sesi pengguna tidak aktif. Masuk ulang lalu coba lagi.");
      return;
    }

    const normalizedEmail = emailDraft.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Email baru wajib diisi.");
      return;
    }

    if (normalizedEmail === draft.email.trim().toLowerCase()) {
      toast.error("Email baru harus berbeda dari email saat ini.");
      return;
    }

    if (!currentPassword.trim()) {
      toast.error("Password saat ini wajib diisi.");
      return;
    }

    setRequestingEmailChange(true);
    try {
      const result = await requestUserEmailChange(session.userId, {
        newEmail: normalizedEmail,
        currentPassword,
      });
      const maskedDestination = String(result.destination?.email || normalizedEmail).trim();
      setPendingEmailChangeMessage(
        `Tautan verifikasi sudah dikirim ke ${maskedDestination}. Buka email tersebut lalu klik konfirmasi untuk menyelesaikan perubahan alamat email akun.`,
      );
      setEmailDialogOpen(false);
      setCurrentPassword("");
      toast.success("Verifikasi perubahan email sudah dikirim.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal mengirim verifikasi perubahan email.",
      );
    } finally {
      setRequestingEmailChange(false);
    }
  }

  if (!draft) {
    return null;
  }

  const profileRows = [
    ["Nama lengkap", draft.name],
    ["Email", draft.email],
    ["WhatsApp", draft.phone],
    ["Kategori instansi", draft.asalInstansi || "Belum dilengkapi"],
    ["Nama instansi", draft.namaInstansi || "Belum dilengkapi"],
    ["Provinsi", draft.provinsi || "Belum dilengkapi"],
    ["Kabupaten/Kota", draft.kabupatenKota || "Belum dilengkapi"],
  ] as const;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
      <AppCard padding="lg" className="space-y-6">
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
          noValidate
        >
          <div className="space-y-2">
            <AppCardTitle>Profil Pengguna</AppCardTitle>
            <AppCardDescription>
              Kelola data akun dan data booking di satu tempat.
            </AppCardDescription>
          </div>

          <div className="space-y-4">
            <AppFormField label="Nama lengkap" controlId={nameId} density="compact" labelTone="quiet">
              <AppInput
                id={nameId}
                value={draft.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Nama lengkap"
              />
            </AppFormField>

            <AppFormField
              label="Nomor WhatsApp"
              controlId={phoneId}
              density="compact"
              labelTone="quiet"
            >
              <AppInput
                id={phoneId}
                value={draft.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder="08xxxxxxxxxx"
              />
            </AppFormField>

            <div className="space-y-3 rounded-[var(--radius-2xl)] border border-border bg-surface-container-low px-4 py-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Email akun</p>
                  <p className="text-sm font-medium text-foreground">{draft.email}</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Perubahan email dilakukan terpisah dan harus dikonfirmasi melalui tautan verifikasi.
                  </p>
                </div>
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmailDraft(draft.email);
                    setCurrentPassword("");
                    setEmailDialogOpen(true);
                  }}
                >
                  <Mail className="size-4" />
                  Ubah Email
                </AppButton>
              </div>
              <AppNotice
                icon={UserRound}
                title="Perubahan email wajib diverifikasi"
                description={`Email aktif ${maskEmail(
                  draft.email,
                )} dipakai untuk login, konfirmasi akun, dan reset password.`}
              />
              {pendingEmailChangeMessage ? (
                <AppNotice
                  icon={Mail}
                  title="Menunggu konfirmasi email baru"
                  description={pendingEmailChangeMessage}
                />
              ) : null}
            </div>

            <AppFormField
              label="Kategori instansi"
              controlId={asalInstansiId}
              density="compact"
              labelTone="quiet"
            >
              <AppSelect
                id={asalInstansiId}
                value={draft.asalInstansi}
                onChange={(event) => updateField("asalInstansi", event.target.value)}
              >
                <option value="">Pilih kategori instansi</option>
                {USER_ASAL_INSTANSI_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </AppSelect>
            </AppFormField>

            <AppFormField
              label="Nama instansi"
              controlId={namaInstansiId}
              density="compact"
              labelTone="quiet"
            >
              <AppInput
                id={namaInstansiId}
                value={draft.namaInstansi}
                onChange={(event) => updateField("namaInstansi", event.target.value)}
                placeholder="Tulis nama instansi secara manual"
              />
            </AppFormField>

            <AppFormField label="NIK" controlId={nikId} density="compact" labelTone="quiet">
              <AppInput
                id={nikId}
                inputMode="numeric"
                value={draft.nik}
                onChange={(event) =>
                  updateField("nik", event.target.value.replace(/\D/g, "").slice(0, 16))
                }
                placeholder="16 digit NIK"
              />
            </AppFormField>

            <AppFormField label="Provinsi" controlId={provinsiId} density="compact" labelTone="quiet">
              <AppSearchSelect
                id={provinsiId}
                value={draft.provinsi}
                onValueChange={(nextValue) => {
                  updateField("provinsi", nextValue);
                  updateField("kabupatenKota", "");
                }}
                options={provinceOptions}
                placeholder="Pilih provinsi"
                searchPlaceholder="Cari provinsi"
                emptyMessage="Provinsi tidak ditemukan."
              />
            </AppFormField>

            <AppFormField
              label="Kabupaten/Kota"
              controlId={kabupatenKotaId}
              density="compact"
              labelTone="quiet"
            >
              <AppSearchSelect
                id={kabupatenKotaId}
                value={draft.kabupatenKota}
                onValueChange={(nextValue) => updateField("kabupatenKota", nextValue)}
                disabled={!draft.provinsi}
                options={citySearchOptions}
                placeholder={draft.provinsi ? "Pilih kabupaten/kota" : "Pilih provinsi lebih dulu"}
                searchPlaceholder="Cari kabupaten atau kota"
                emptyMessage="Kabupaten/kota tidak ditemukan."
              />
            </AppFormField>
          </div>

          <AppActionBar>
            <div className="space-y-1">
              <p className="font-semibold">
                {completionStatus.isComplete
                  ? "Profil siap dipakai untuk booking"
                  : "Lengkapi data booking"}
              </p>
              <p className="text-sm text-muted-foreground">
                {completionStatus.isComplete
                  ? "Semua data wajib sudah tersedia."
                  : "Isi nama lengkap, nomor WhatsApp, kategori instansi, nama instansi, NIK, provinsi, dan kabupaten/kota."}
              </p>
            </div>
            <AppButton size="lg" type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Simpan Profil
            </AppButton>
          </AppActionBar>
        </form>
      </AppCard>

      <div className="space-y-6">
        <AppNotice
          icon={UserRound}
          title={
            completionStatus.isComplete
              ? "Profil siap dipakai"
              : "Lengkapi data booking"
          }
          description={
            completionStatus.isComplete
              ? "Data utama sudah tersedia untuk booking dan check-in."
              : "Data utama perlu dilengkapi sebelum mengambil antrian."
          }
        />

        <AppCard padding="lg" className="space-y-4">
          <AppCardTitle>Ringkasan identitas</AppCardTitle>
          <div className="space-y-3">
            {profileRows.map(([label, value]) => (
              <div
                key={label}
                className="rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-4"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
              </div>
            ))}
          </div>
        </AppCard>
      </div>

      <AppDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        title="Ubah email akun"
        description="Masukkan email baru dan password saat ini. Sistem akan mengirim tautan verifikasi ke email baru sebelum perubahan diterapkan."
        className="max-w-xl"
      >
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            void handleRequestEmailChange();
          }}
        >
          <AppNotice
            icon={Mail}
            title="Email lama tetap aktif sampai Anda mengonfirmasi email baru"
            description={`Email saat ini ${maskEmail(draft.email)} masih dipakai untuk login sampai tautan verifikasi pada email baru dibuka.`}
          />

          <div className="space-y-4">
            <AppFormField label="Email baru" controlId="user-email-change-email">
              <AppInput
                id="user-email-change-email"
                type="email"
                autoComplete="email"
                placeholder="nama@instansi.go.id"
                value={emailDraft}
                onChange={(event) => setEmailDraft(event.target.value)}
              />
            </AppFormField>

            <AppFormField label="Password saat ini" controlId="user-email-change-password">
              <AppPasswordInput
                id="user-email-change-password"
                autoComplete="current-password"
                placeholder="Masukkan password saat ini"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </AppFormField>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <AppButton
              type="button"
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
              disabled={requestingEmailChange}
            >
              Batal
            </AppButton>
            <AppButton type="submit" disabled={requestingEmailChange}>
              {requestingEmailChange ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mail className="size-4" />
              )}
              Kirim Verifikasi
            </AppButton>
          </div>
        </form>
      </AppDialog>
    </div>
  );
}
