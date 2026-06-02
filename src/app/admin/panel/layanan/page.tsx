import type { Metadata } from "next";

import { AdminPanelPage } from "@/features/internal/components/admin-panel-page";
import { getInternalPageConfig } from "@/features/internal/internal-workspace-config";

export const metadata: Metadata = {
  title: getInternalPageConfig("humas-admin", "layanan")?.title ?? "Katalog Layanan",
};

export default function AdminPanelServicesRoute() {
  return <AdminPanelPage page="layanan" />;
}
