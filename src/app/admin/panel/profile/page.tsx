import type { Metadata } from "next";

import { AdminPanelPage } from "@/features/internal/components/admin-panel-page";
import { getInternalPageConfig } from "@/features/internal/internal-workspace-config";

export const metadata: Metadata = {
  title: getInternalPageConfig("humas-admin", "profil")?.title ?? "Profil Humas Admin",
};

export default function AdminPanelProfileRoute() {
  return <AdminPanelPage page="profil" />;
}
