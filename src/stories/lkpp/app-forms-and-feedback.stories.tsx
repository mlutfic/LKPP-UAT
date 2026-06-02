import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bell } from "lucide-react";

import { AppButton } from "@/components/ui/app-button";
import { AppCheckbox } from "@/components/ui/app-checkbox";
import { AppFilterBar } from "@/components/ui/app-filter-bar";
import { AppFormField } from "@/components/ui/app-form-field";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";
import { AppSelect } from "@/components/ui/app-select";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { AppTextarea } from "@/components/ui/app-textarea";

const meta = {
  title: "LKPP/Forms & Feedback",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const FormSystem: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-6">
      <AppFormField
        label="Nama Lengkap"
        description="Gunakan nama yang sesuai identitas tamu atau instansi."
      >
        <AppInput placeholder="Contoh: Ahmad Fauzi" />
      </AppFormField>

      <div className="grid gap-6 md:grid-cols-2">
        <AppFormField label="Jenis Layanan">
          <AppSelect defaultValue="konsultasi">
            <option value="konsultasi">Konsultasi Pengadaan</option>
            <option value="bimtek">Bimbingan Teknis</option>
            <option value="advokasi">Advokasi</option>
          </AppSelect>
        </AppFormField>

        <AppFormField label="Email" error="Format email belum valid untuk contoh error state.">
          <AppInput aria-invalid="true" placeholder="nama@instansi.go.id" />
        </AppFormField>
      </div>

      <AppFormField label="Kebutuhan" description="Tuliskan kebutuhan singkat agar unit bisa menyiapkan layanan.">
        <AppTextarea placeholder="Jelaskan konteks konsultasi atau layanan yang diperlukan..." rows={5} />
      </AppFormField>

      <label className="flex items-start gap-3 rounded-3xl border border-border bg-surface-container-lowest p-4">
        <AppCheckbox defaultChecked />
        <span className="text-sm leading-6 text-muted-foreground">
          Saya memahami bahwa data ini akan dipakai untuk pengelolaan jadwal dan antrean layanan LKPP.
        </span>
      </label>

      <div className="flex flex-wrap gap-3">
        <AppButton>Simpan Draft</AppButton>
        <AppButton variant="outline">Reset</AppButton>
      </div>
    </div>
  ),
};

export const FeedbackAndFilters: Story = {
  render: () => (
    <div className="grid gap-6">
      <AppFilterBar
        actions={
          <>
            <AppButton variant="outline">Hari Ini</AppButton>
            <AppButton variant="outline">Semua Unit</AppButton>
          </>
        }
      >
        <AppInput placeholder="Cari nomor antrean, nama, atau unit..." />
      </AppFilterBar>

      <AppNotice
        icon={Bell}
        title="Jadwal layanan berubah"
        description="Gunakan notice ini untuk pengumuman, peringatan, atau feedback hasil proses form."
      />

      <div className="flex flex-wrap gap-3">
        <AppStatusBadge status="aktif" label="Aktif" />
        <AppStatusBadge status="dipanggil" label="Dipanggil Unit" />
        <AppStatusBadge status="warning" label="Perlu Tinjau" />
        <AppStatusBadge status="selesai" label="Selesai" />
      </div>
    </div>
  ),
};
