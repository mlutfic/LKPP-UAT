import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InternalWorkspacePage } from "@/features/internal/components/internal-dashboard-page";
import { MonitoringSettingsPage } from "@/features/internal/components/monitoring-settings-page";
import { MonitoringWorkspacePage } from "@/features/internal/components/monitoring-workspace-page";
import { getInternalFeatureKeys, getInternalPageConfig, isInternalFeatureKey } from "@/features/internal/internal-workspace-config";

type RouteParams = { feature: string };
type RouteProps = { params: Promise<RouteParams> };

export function generateStaticParams() {
  return getInternalFeatureKeys("supervisor-monitoring").map((feature) => ({ feature }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { feature } = await params;

  if (!isInternalFeatureKey("supervisor-monitoring", feature)) {
    return { title: "Halaman Tidak Ditemukan" };
  }

  const config = getInternalPageConfig("supervisor-monitoring", feature);
  return { title: config?.title ?? "Halaman Tidak Ditemukan" };
}

export default async function SupervisorFeatureRoute({ params }: RouteProps) {
  const { feature } = await params;

  if (!isInternalFeatureKey("supervisor-monitoring", feature)) {
    notFound();
  }

  if (
    feature === "monitoring" ||
    feature === "data-ekspor" ||
    feature === "profil"
  ) {
    return (
      <MonitoringWorkspacePage
        role="supervisor-monitoring"
        page={feature}
      />
    );
  }

  if (feature === "pengaturan") {
    return <MonitoringSettingsPage role="supervisor-monitoring" />;
  }

  return <InternalWorkspacePage role="supervisor-monitoring" page={feature} />;
}
