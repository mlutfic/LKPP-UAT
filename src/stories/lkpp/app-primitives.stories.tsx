import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bell, CheckCircle2, Ticket, TriangleAlert } from "lucide-react";

import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppNotice } from "@/components/ui/app-notice";
import { AppStatCard } from "@/components/ui/app-stat-card";

const meta = {
  title: "LKPP/Primitives",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ButtonSystem: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <AppButton>Primary</AppButton>
      <AppButton variant="secondary">Secondary</AppButton>
      <AppButton variant="outline">Outline</AppButton>
      <AppButton variant="ghost">Ghost</AppButton>
    </div>
  ),
};

export const StatCards: Story = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-3">
      <AppStatCard label="Menunggu" value="12" description="Antrean aktif yang belum check-in." icon={Ticket} />
      <AppStatCard tone="warning" label="Dipanggil" value="4" description="Sedang diproses oleh unit." icon={TriangleAlert} />
      <AppStatCard tone="success" label="Selesai" value="34" description="Sudah ditutup dan tercatat rapi." icon={CheckCircle2} />
    </div>
  ),
};

export const ContentCard: Story = {
  render: () => (
    <AppCard className="max-w-lg p-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        Workspace Hari Ini
      </p>
      <h3 className="mt-4 font-heading text-2xl font-extrabold tracking-tight">
        Fokus kerja unit
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Card ini memakai primitive global yang sama dengan halaman publik, user, maupun internal.
      </p>
    </AppCard>
  ),
};

export const InlineNotice: Story = {
  render: () => (
    <div className="max-w-xl">
      <AppNotice
        icon={Bell}
        title="Pembaruan sistem"
        description="Slot feedback global ini bisa dipakai ulang untuk auth, dashboard, maupun modul admin."
      />
    </div>
  ),
};
