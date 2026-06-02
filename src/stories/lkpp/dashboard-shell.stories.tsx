import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { AppStatCard } from "@/components/ui/app-stat-card";

const meta = {
  title: "LKPP/Dashboard Shell",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ResepsionisShell: Story = {
  render: () => (
    <DashboardShell
      role="resepsionis"
      currentPath="/resepsionis/dashboard"
      title="Dashboard Resepsionis"
      subtitle="Frontdesk workspace"
    >
      <div className="space-y-8">
        <AppSectionHeader
          eyebrow="Frontdesk Workspace"
          title="Dashboard Resepsionis LKPP"
          description="Story ini dipakai untuk review shell global tanpa membuka halaman penuh."
          actions={<AppButton variant="outline">Filter</AppButton>}
        />
        <div className="grid gap-4 md:grid-cols-4">
          <AppStatCard label="Menunggu Hadir" value="1" />
          <AppStatCard tone="info" label="Sudah Hadir" value="4" />
          <AppStatCard tone="warning" label="Dipanggil Unit" value="2" />
          <AppStatCard tone="success" label="Selesai" value="8" />
        </div>
      </div>
    </DashboardShell>
  ),
};
