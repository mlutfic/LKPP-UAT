import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InternalWorkspacePage } from "@/features/internal/components/internal-dashboard-page";
import { UnitAnalyticsPage } from "@/features/internal/components/unit-analytics-page";
import { UnitProfilePage } from "@/features/internal/components/unit-profile-page";
import { UnitSettingsPage } from "@/features/internal/components/unit-settings-page";
import { UnitOperationsPage } from "@/features/internal/components/unit-operations-page";
import { getInternalFeatureKeys, getInternalPageConfig, isInternalFeatureKey } from "@/features/internal/internal-workspace-config";

type RouteParams = { feature: string };
type RouteProps = { params: Promise<RouteParams> };

export function generateStaticParams() {
  return getInternalFeatureKeys("unit-organisasi").map((feature) => ({ feature }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { feature } = await params;

  if (!isInternalFeatureKey("unit-organisasi", feature)) {
    return { title: "Halaman Tidak Ditemukan" };
  }

  const config = getInternalPageConfig("unit-organisasi", feature);
  return { title: config?.title ?? "Halaman Tidak Ditemukan" };
}

export default async function UnitFeatureRoute({ params }: RouteProps) {
  const { feature } = await params;

  if (!isInternalFeatureKey("unit-organisasi", feature)) {
    notFound();
  }

  if (feature === "data-antrean") {
    return <UnitOperationsPage page="data-antrean" />;
  }

  if (feature === "analitik-unit") {
    return <UnitAnalyticsPage />;
  }

  if (feature === "profil") {
    return <UnitProfilePage />;
  }

  if (feature === "pengaturan") {
    return <UnitSettingsPage />;
  }

  return <InternalWorkspacePage role="unit-organisasi" page={feature} />;
}
