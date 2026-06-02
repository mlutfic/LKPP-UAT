import type { Metadata } from "next";

import { Level2DashboardPage } from "@/features/internal/components/level-2-dashboard-page";

export const metadata: Metadata = {
  title: "Dashboard Petugas Level 2",
};

export default function Level2DashboardRoute() {
  return <Level2DashboardPage />;
}
