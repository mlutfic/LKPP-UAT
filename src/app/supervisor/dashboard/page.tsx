import type { Metadata } from "next";

import { MonitoringWorkspacePage } from "@/features/internal/components/monitoring-workspace-page";

export const metadata: Metadata = {
  title: "Dashboard Supervisor Monitoring",
};

export default function SupervisorDashboardRoute() {
  return <MonitoringWorkspacePage role="supervisor-monitoring" page="dashboard" />;
}
