"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { AppButton } from "@/components/ui/app-button";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";
import { AppFormField } from "@/components/ui/app-form-field";
import { AppInput } from "@/components/ui/app-input";
import {
  AppSearchSelect,
  type AppSearchSelectOption,
} from "@/components/ui/app-search-select";
import { AppSelect } from "@/components/ui/app-select";
import {
  USER_ASAL_INSTANSI_OPTIONS,
  USER_REGION_OPTIONS,
  type MockUserProfile,
} from "@/lib/mock-user-profile";
import { maskEmail } from "@/lib/privacy";

export function UserProfileCompletionModal({
  profile,
  onSave,
}: {
  profile: MockUserProfile;
  onSave: (nextProfile: MockUserProfile) => Promise<void> | void;
}) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const nameId = React.useId();
  const phoneId = React.useId();
  const asalInstansiId = React.useId();
  const namaInstansiId = React.useId();
  const nikId = React.useId();
  const provinsiId = React.useId();
  const kabupatenKotaId = React.useId();
  const [name, setName] = React.useState(profile.name);
  const [phone, setPhone] = React.useState(profile.phone);
  const [asalInstansi, setAsalInstansi] = React.useState(profile.asalInstansi);
  const [namaInstansi, setNamaInstansi] = React.useState(profile.namaInstansi);
  const [nik, setNik] = React.useState(profile.nik);
  const [provinsi, setProvinsi] = React.useState(profile.provinsi);
  const [kabupatenKota, setKabupatenKota] = React.useState(profile.kabupatenKota);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setName(profile.name);
    setPhone(profile.phone);
    setAsalInstansi(profile.asalInstansi);
    setNamaInstansi(profile.namaInstansi);
    setNik(profile.nik);
    setProvinsi(profile.provinsi);
    setKabupatenKota(profile.kabupatenKota);
  }, [profile]);

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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
      (provinsi ? USER_REGION_OPTIONS[provinsi] ?? [] : []).map((option) => ({
        value: option,
        label: option,
        keywords: [provinsi],
      })),
    [provinsi],
  );

  async function handleSave() {
    try {
      const normalizedNik = nik.replace(/\D/g, "").slice(0, 16);
      if (!name.trim()) {
        toast.error("Isi nama lengkap terlebih dahulu.");
        return;
      }
      if (!phone.trim()) {
        toast.error("Isi nomor WhatsApp terlebih dahulu.");
        return;
      }
      if (!asalInstansi.trim()) {
        toast.error("Pilih kategori instansi terlebih dahulu.");
        return;
      }
      if (!namaInstansi.trim()) {
        toast.error("Isi nama instansi terlebih dahulu.");
        return;
      }
      if (normalizedNik.length !== 16) {
        toast.error("NIK wajib 16 digit.");
        return;
      }
      if (!provinsi.trim()) {
        toast.error("Pilih provinsi terlebih dahulu.");
        return;
      }
      if (!kabupatenKota.trim()) {
        toast.error("Pilih kabupaten/kota terlebih dahulu.");
        return;
      }

      setSaving(true);
      await onSave({
        ...profile,
        name: name.trim(),
        phone: phone.trim(),
        asalInstansi,
        namaInstansi,
        nik: normalizedNik,
        provinsi,
        kabupatenKota,
      });
      toast.success("Data wajib berhasil dilengkapi.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Data wajib belum berhasil disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 isolate flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.24)] backdrop-blur-[8px]" />
      <AppCard
        tone="elevated"
        padding="md"
        className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-3xl)]"
      >
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
          noValidate
        >
          <div className="shrink-0 space-y-1.5">
            <AppCardTitle id={titleId}>Lengkapi data wajib</AppCardTitle>
            <AppCardDescription id={descriptionId}>
              Akun baru atau akun yang datanya belum lengkap perlu mengisi data ini dulu sebelum lanjut antrian.
            </AppCardDescription>
          </div>

          <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <div className="space-y-4 pb-1">
              <AppFormField
                label="Nama lengkap"
                controlId={nameId}
                density="compact"
                labelTone="quiet"
              >
                <AppInput
                  id={nameId}
                  placeholder="Nama lengkap"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
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
                  placeholder="Nomor WhatsApp aktif"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </AppFormField>

              <AppFormField
                label="Kategori instansi"
                controlId={asalInstansiId}
                density="compact"
                labelTone="quiet"
              >
                <AppSelect
                  id={asalInstansiId}
                  value={asalInstansi}
                  onChange={(event) => setAsalInstansi(event.target.value)}
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
                  placeholder="Tulis nama instansi secara manual"
                  value={namaInstansi}
                  onChange={(event) => setNamaInstansi(event.target.value)}
                />
              </AppFormField>

              <AppFormField label="NIK" controlId={nikId} density="compact" labelTone="quiet">
                <AppInput
                  id={nikId}
                  inputMode="numeric"
                  placeholder="16 digit NIK"
                  value={nik}
                  onChange={(event) =>
                    setNik(event.target.value.replace(/\D/g, "").slice(0, 16))
                  }
                />
              </AppFormField>

              <AppFormField
                label="Provinsi"
                controlId={provinsiId}
                density="compact"
                labelTone="quiet"
              >
                <AppSearchSelect
                  id={provinsiId}
                  value={provinsi}
                  onValueChange={(nextValue) => {
                    setProvinsi(nextValue);
                    setKabupatenKota("");
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
                  value={kabupatenKota}
                  onValueChange={setKabupatenKota}
                  disabled={!provinsi}
                  options={citySearchOptions}
                  placeholder={provinsi ? "Pilih kabupaten/kota" : "Pilih provinsi lebih dulu"}
                  searchPlaceholder="Cari kabupaten atau kota"
                  emptyMessage="Kabupaten/kota tidak ditemukan."
                />
              </AppFormField>
            </div>
          </div>

          <div className="mt-4 shrink-0 space-y-4 border-t border-border/60 pt-4">
            <p className="text-sm text-muted-foreground">
              Masuk sebagai {maskEmail(profile.email)}
            </p>

            <AppButton fullWidth size="lg" type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Simpan & Lanjutkan
            </AppButton>
          </div>
        </form>
      </AppCard>
    </div>
  );
}
