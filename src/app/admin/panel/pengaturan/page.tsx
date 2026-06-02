import type { Metadata } from "next";

import { AdminPanelPage } from "@/features/internal/components/admin-panel-page";
import { getInternalPageConfig } from "@/features/internal/internal-workspace-config";

export const metadata: Metadata = {
  title: getInternalPageConfig("humas-admin", "pengaturan")?.title ?? "Pengaturan",
};

export default function AdminPanelSettingsRoute() {
  return <AdminPanelPage page="pengaturan" />;
}
