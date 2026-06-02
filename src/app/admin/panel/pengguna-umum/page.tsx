import type { Metadata } from "next";

import { AdminPanelPage } from "@/features/internal/components/admin-panel-page";
import { getInternalPageConfig } from "@/features/internal/internal-workspace-config";

export const metadata: Metadata = {
  title:
    getInternalPageConfig("humas-admin", "pengguna-umum")?.title ??
    "Pengguna Umum",
};

export default function AdminPanelPublicUsersRoute() {
  return <AdminPanelPage page="pengguna-umum" />;
}
