import type { Metadata } from "next";

import { AdminPanelPage } from "@/features/internal/components/admin-panel-page";
import { getInternalPageConfig } from "@/features/internal/internal-workspace-config";

export const metadata: Metadata = {
  title: getInternalPageConfig("humas-admin", "faq-bantuan")?.title ?? "FAQ & Bantuan",
};

export default function AdminPanelFaqRoute() {
  return <AdminPanelPage page="faq-bantuan" />;
}
