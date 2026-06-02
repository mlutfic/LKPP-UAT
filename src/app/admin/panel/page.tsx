import type { Metadata } from "next";

import { AdminPanelPage } from "@/features/internal/components/admin-panel-page";

export const metadata: Metadata = {
  title: "Panel Humas Admin",
};

export default function AdminPanelRoute() {
  return <AdminPanelPage page="dashboard" />;
}
