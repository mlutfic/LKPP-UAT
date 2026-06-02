import type { Metadata } from "next";

import { AdminPanelPage } from "@/features/internal/components/admin-panel-page";
import { getInternalPageConfig } from "@/features/internal/internal-workspace-config";

export const metadata: Metadata = {
  title:
    getInternalPageConfig("humas-admin", "hak-akses-role")?.title ??
    "Akses & Peran",
};

export default function AdminPanelRoleAccessRoute() {
  return <AdminPanelPage page="hak-akses-role" />;
}
