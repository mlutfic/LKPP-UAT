import type { Metadata } from "next";

import { MonitoringWorkspacePage } from "@/features/internal/components/monitoring-workspace-page";

export const metadata: Metadata = {
  title: "Dashboard Humas Monitoring",
};

export default function HumasMonitoringDashboardRoute() {
  return <MonitoringWorkspacePage role="humas-monitoring" page="dashboard" />;
}
