import type { Metadata } from "next";

import { UnitDashboardPage } from "@/features/internal/components/unit-dashboard-page";

export const metadata: Metadata = {
  title: "Dashboard Unit Organisasi",
};

export default function UnitDashboardRoute() {
  return <UnitDashboardPage />;
}
