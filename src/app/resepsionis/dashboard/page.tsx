import type { Metadata } from "next";

import { FrontdeskDashboardPage } from "@/features/internal/components/frontdesk-dashboard-page";

export const metadata: Metadata = {
  title: "Dashboard Resepsionis",
};

export default function StaffDashboardRoute() {
  return <FrontdeskDashboardPage />;
}
