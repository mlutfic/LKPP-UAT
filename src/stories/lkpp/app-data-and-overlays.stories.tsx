import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Inbox } from "lucide-react";

import { AppActionBar } from "@/components/ui/app-action-bar";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { AppSheet } from "@/components/ui/app-sheet";
import { AppSkeleton } from "@/components/ui/app-skeleton";
import { AppTable, AppTableCell, AppTableHead, AppTableHeaderCell, AppTableRow } from "@/components/ui/app-table";
import { AppTabs } from "@/components/ui/app-tabs";

const meta = {
  title: "LKPP/Data & Overlays",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const DataDisplay: Story = {
  render: () => (
    <div className="space-y-6">
      <AppActionBar>
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Ringkasan operasional
          </p>
          <p className="font-semibold">Contoh action bar global untuk dashboard dan halaman daftar.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AppButton variant="outline">Filter</AppButton>
          <AppButton>Tambah Data</AppButton>
        </div>
      </AppActionBar>

      <AppTable>
        <AppTableHead>
          <tr>
            <AppTableHeaderCell>Referensi</AppTableHeaderCell>
            <AppTableHeaderCell>Layanan</AppTableHeaderCell>
            <AppTableHeaderCell>Status</AppTableHeaderCell>
          </tr>
        </AppTableHead>
        <tbody>
          <AppTableRow>
            <AppTableCell className="font-semibold">A-001</AppTableCell>
            <AppTableCell>Konsultasi Pengadaan Strategis</AppTableCell>
            <AppTableCell>Dipanggil Unit</AppTableCell>
          </AppTableRow>
          <AppTableRow>
            <AppTableCell className="font-semibold">A-002</AppTableCell>
            <AppTableCell>Bimbingan Teknis</AppTableCell>
            <AppTableCell>Selesai</AppTableCell>
          </AppTableRow>
        </tbody>
      </AppTable>

      <div className="grid gap-6 md:grid-cols-2">
        <AppCard className="space-y-4 p-8">
          <AppSectionHeader
            eyebrow="Loading"
            title="Global skeleton"
            description="Dipakai lintas auth, publik, dan dashboard."
          />
          <div className="space-y-3">
            <AppSkeleton className="h-6 w-1/3" />
            <AppSkeleton className="h-12 w-full" />
            <AppSkeleton className="h-24 w-full" />
          </div>
        </AppCard>

        <AppEmptyState
          icon={Inbox}
          title="Belum ada data"
          description="Empty state ini bisa dipakai lintas dashboard, tabel, dan modul layanan."
          actionLabel="Buat Antrean Baru"
        />
      </div>
    </div>
  ),
};

export const OverlaysAndTabs: Story = {
  render: () => (
    <div className="space-y-6">
      <AppTabs
        tabs={[
          {
            value: "ringkasan",
            label: "Ringkasan",
            content: (
              <AppCard className="p-8">
                Konten tab ringkasan dengan struktur global yang sama untuk semua role.
              </AppCard>
            ),
          },
          {
            value: "riwayat",
            label: "Riwayat",
            content: (
              <AppCard className="p-8">
                Konten tab riwayat dapat diganti tanpa mengubah primitive tab-nya.
              </AppCard>
            ),
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="relative min-h-[28rem] overflow-hidden rounded-[2rem] border border-dashed border-border bg-surface-container-low p-6">
          <p className="text-sm text-muted-foreground">Preview dialog dalam keadaan terbuka.</p>
          <AppDialog
            open
            onOpenChange={() => undefined}
            title="Konfirmasi Jadwal"
            description="Dialog global ini dipakai untuk aksi penting seperti konfirmasi, hapus, atau simpan."
          >
            <div className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                Pastikan jadwal yang dipilih sesuai unit dan kapasitas layanan.
              </p>
              <div className="flex gap-3">
                <AppButton>Konfirmasi</AppButton>
                <AppButton variant="outline">Batal</AppButton>
              </div>
            </div>
          </AppDialog>
        </div>

        <div className="relative min-h-[28rem] overflow-hidden rounded-[2rem] border border-dashed border-border bg-surface-container-low p-6">
          <p className="text-sm text-muted-foreground">Preview sheet dalam keadaan terbuka.</p>
          <AppSheet open onOpenChange={() => undefined} title="Filter Antrean">
            <div className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                Panel samping ini cocok untuk filter, detail, atau pengaturan cepat.
              </p>
              <AppButton fullWidth>Terapkan Filter</AppButton>
            </div>
          </AppSheet>
        </div>
      </div>
    </div>
  ),
};
