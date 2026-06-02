import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FrontdeskHistoryPage } from "@/features/internal/components/frontdesk-history-page";
import { FrontdeskProfilePage } from "@/features/internal/components/frontdesk-profile-page";
import { FrontdeskSettingsPage } from "@/features/internal/components/frontdesk-settings-page";
import { InternalWorkspacePage } from "@/features/internal/components/internal-dashboard-page";
import { getInternalFeatureKeys, getInternalPageConfig, isInternalFeatureKey } from "@/features/internal/internal-workspace-config";

type RouteParams = { feature: string };
type RouteProps = { params: Promise<RouteParams> };

export function generateStaticParams() {
  return getInternalFeatureKeys("resepsionis").map((feature) => ({ feature }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { feature } = await params;

  if (!isInternalFeatureKey("resepsionis", feature)) {
    return { title: "Halaman Tidak Ditemukan" };
  }

  const config = getInternalPageConfig("resepsionis", feature);
  return { title: config?.title ?? "Halaman Tidak Ditemukan" };
}

export default async function ResepsionisFeatureRoute({ params }: RouteProps) {
  const { feature } = await params;

  if (!isInternalFeatureKey("resepsionis", feature)) {
    notFound();
  }

  if (feature === "riwayat") {
    return <FrontdeskHistoryPage />;
  }

  if (feature === "pengaturan") {
    return <FrontdeskSettingsPage />;
  }

  if (feature === "profil") {
    return <FrontdeskProfilePage />;
  }

  return <InternalWorkspacePage role="resepsionis" page={feature} />;
}
