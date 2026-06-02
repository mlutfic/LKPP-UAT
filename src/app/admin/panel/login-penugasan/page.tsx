import type { Metadata } from "next";

import { AdminPanelPage } from "@/features/internal/components/admin-panel-page";
import { getInternalPageConfig } from "@/features/internal/internal-workspace-config";

export const metadata: Metadata = {
  title:
    getInternalPageConfig("humas-admin", "login-penugasan")?.title ??
    "Akun & Penugasan",
};

export default function AdminPanelStaffAccessRoute() {
  return <AdminPanelPage page="login-penugasan" />;
}
