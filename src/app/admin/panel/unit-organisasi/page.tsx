import type { Metadata } from "next";

import { AdminPanelPage } from "@/features/internal/components/admin-panel-page";
import { getInternalPageConfig } from "@/features/internal/internal-workspace-config";

export const metadata: Metadata = {
  title:
    getInternalPageConfig("humas-admin", "unit-organisasi")?.title ??
    "Unit Organisasi",
};

export default function AdminPanelUnitsRoute() {
  return <AdminPanelPage page="unit-organisasi" />;
}
