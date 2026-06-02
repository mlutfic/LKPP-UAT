import type { Metadata } from "next";

import { AdminPanelPage } from "@/features/internal/components/admin-panel-page";
import { getInternalPageConfig } from "@/features/internal/internal-workspace-config";

export const metadata: Metadata = {
  title: getInternalPageConfig("humas-admin", "ekspor-data")?.title ?? "Ekspor Data",
};

export default function AdminPanelExportRoute() {
  return <AdminPanelPage page="ekspor-data" />;
}
