import type { Metadata } from "next";

import { UserDashboardPage } from "@/features/user/components/dashboard-page";

export const metadata: Metadata = {
  title: "Dashboard Pengguna",
};

export default function DashboardRoute() {
  return <UserDashboardPage />;
}
